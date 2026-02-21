import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Loader2, User, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAudioPlaybackUrl } from '@/lib/api/cloudflareAudio';

interface ClientMessage {
  id: string;
  message: string;
  type: 'feedback' | 'revision';
  reviewed_by: string | null;
  created_at: string;
  audioPath?: string | null;
  cloudflareAudioId?: string | null;
  imagePaths?: string[] | null;
}

interface ClientFeedbackDialogProps {
  videoId: string;
  taskId: string;
  videoTitle: string;
  clientName?: string;
  trigger?: React.ReactNode;
}

export function ClientFeedbackDialog({
  videoId,
  taskId,
  videoTitle,
  clientName,
  trigger,
}: ClientFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [cloudflareAudioUrls, setCloudflareAudioUrls] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch message count on mount (for badge)
  useEffect(() => {
    const fetchCount = async () => {
      let count = 0;

      // Count from video_feedback
      const { count: vfCount } = await supabase
        .from('video_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId)
        .or('feedback_text.neq.null,revision_notes.neq.null');
      
      count += vfCount || 0;

      // Count from client_feedback
      const { count: cfCount } = await supabase
        .from('client_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId)
        .or('feedback_text.neq.null,revision_notes.neq.null');
      
      count += cfCount || 0;

      setMessageCount(count);
    };

    fetchCount();
  }, [videoId, taskId]);

  // Fetch messages when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const allMessages: ClientMessage[] = [];

        // Admin emails to filter out - these are internal team members, not clients
        const adminEmails = ['hamzarahih76@gmail.com', 'rihabbouizer@gmail.com', 'im.nacib@gmail.com'];
        
        // Helper function to check if a reviewed_by value is from an admin
        const isAdminFeedback = (reviewedBy: string | null): boolean => {
          if (!reviewedBy) return false;
          const lowerReviewedBy = reviewedBy.toLowerCase().trim();
          return adminEmails.some(email => lowerReviewedBy === email.toLowerCase());
        };

        // Fetch from video_feedback
        const { data: videoFeedbacks, error: vfError } = await supabase
          .from('video_feedback')
          .select('id, feedback_text, revision_notes, reviewed_by, created_at, revision_audio_path, cloudflare_audio_id, revision_images')
          .eq('video_id', videoId)
          .order('created_at', { ascending: true });

        if (!vfError && videoFeedbacks) {
          videoFeedbacks.forEach((fb) => {
            // Filter out admin feedback - only show client feedback in this dialog
            // Admin feedback should appear in the admin chat dialog instead
            if (isAdminFeedback(fb.reviewed_by)) {
              return; // Skip admin feedback entries
            }
            
            if (fb.feedback_text) {
              allMessages.push({
                id: `vf-feedback-${fb.id}`,
                message: fb.feedback_text,
                type: 'feedback',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                audioPath: null,
                imagePaths: null
              });
            }
            if (fb.revision_notes || fb.revision_audio_path || fb.cloudflare_audio_id || (fb.revision_images && fb.revision_images.length > 0)) {
              allMessages.push({
                id: `vf-revision-${fb.id}`,
                message: fb.revision_notes || (fb.revision_audio_path || fb.cloudflare_audio_id ? '🎤 Message audio' : '📷 Images jointes'),
                type: 'revision',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                audioPath: fb.revision_audio_path,
                cloudflareAudioId: fb.cloudflare_audio_id,
                imagePaths: fb.revision_images
              });
            }
          });
        }

        // Fetch from client_feedback
        const { data: clientFeedbacks, error: cfError } = await supabase
          .from('client_feedback')
          .select('id, feedback_text, revision_notes, reviewed_by, created_at, revision_audio_path, cloudflare_audio_id, revision_images')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (!cfError && clientFeedbacks) {
          clientFeedbacks.forEach((fb) => {
            // Filter out admin feedback - only show client feedback in this dialog
            if (isAdminFeedback(fb.reviewed_by)) {
              return; // Skip admin feedback entries
            }
            
            if (fb.feedback_text) {
              allMessages.push({
                id: `cf-feedback-${fb.id}`,
                message: fb.feedback_text,
                type: 'feedback',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                audioPath: null,
                imagePaths: null
              });
            }
            if (fb.revision_notes || fb.revision_audio_path || fb.cloudflare_audio_id || (fb.revision_images && fb.revision_images.length > 0)) {
              allMessages.push({
                id: `cf-revision-${fb.id}`,
                message: fb.revision_notes || (fb.revision_audio_path || fb.cloudflare_audio_id ? '🎤 Message audio' : '📷 Images jointes'),
                type: 'revision',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                audioPath: fb.revision_audio_path,
                cloudflareAudioId: fb.cloudflare_audio_id,
                imagePaths: fb.revision_images
              });
            }
          });
        }

        // Sort all messages by date
        allMessages.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        setMessages(allMessages);
        setMessageCount(allMessages.length);

        // Fetch signed URLs for audio files (Supabase Storage fallback)
        const audioPaths = allMessages
          .filter(m => m.audioPath && !m.cloudflareAudioId)
          .map(m => m.audioPath as string);
        
        if (audioPaths.length > 0) {
          const urlMap: Record<string, string> = {};
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://slnafhvkluqmgwrxwndy.supabase.co';
          
          for (const path of audioPaths) {
            // If path is already a full URL, use it directly
            if (path.startsWith('http')) {
              urlMap[path] = path;
            } else {
              // Otherwise, generate a signed URL
              const { data } = await supabase.storage
                .from('deliveries')
                .createSignedUrl(path, 3600);
              if (data?.signedUrl) {
                const fullUrl = data.signedUrl.startsWith('http') 
                  ? data.signedUrl 
                  : `${supabaseUrl}/storage/v1${data.signedUrl}`;
                urlMap[path] = fullUrl;
              }
            }
          }
          setAudioUrls(urlMap);
        }

        // Fetch Cloudflare audio URLs
        const cloudflareAudioIds = allMessages
          .filter(m => m.cloudflareAudioId)
          .map(m => m.cloudflareAudioId as string);
        
        if (cloudflareAudioIds.length > 0) {
          const cfUrlMap: Record<string, string> = {};
          for (const cfId of cloudflareAudioIds) {
            try {
              const result = await getAudioPlaybackUrl(cfId);
              if (result.success) {
                // Use iframe URL, mark as "processing" if not ready
                if (result.readyToStream === false) {
                  cfUrlMap[cfId] = 'processing';
                } else if (result.iframeUrl) {
                  cfUrlMap[cfId] = result.iframeUrl;
                }
              }
            } catch (err) {
              console.error('Error getting Cloudflare audio URL:', err);
            }
          }
          setCloudflareAudioUrls(cfUrlMap);
        }

        // Fetch signed URLs for images
        const allImagePaths = allMessages
          .flatMap(m => m.imagePaths || []);
        
        if (allImagePaths.length > 0) {
          const imgUrlMap: Record<string, string> = {};
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://slnafhvkluqmgwrxwndy.supabase.co';
          
          for (const path of allImagePaths) {
            // If path is already a full URL, use it directly
            if (path.startsWith('http')) {
              imgUrlMap[path] = path;
            } else {
              // Otherwise, generate a signed URL
              const { data } = await supabase.storage
                .from('deliveries')
                .createSignedUrl(path, 3600);
              if (data?.signedUrl) {
                const fullUrl = data.signedUrl.startsWith('http') 
                  ? data.signedUrl 
                  : `${supabaseUrl}/storage/v1${data.signedUrl}`;
                imgUrlMap[path] = fullUrl;
              }
            }
          }
          setImageUrls(imgUrlMap);
        }
      } catch (error) {
        console.error('Error fetching client messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const vfChannel = supabase
      .channel(`client-vf-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_feedback',
          filter: `video_id=eq.${videoId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();
    channels.push(vfChannel);

    const cfChannel = supabase
      .channel(`client-cf-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_feedback',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();
    channels.push(cfChannel);

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [open, videoId, taskId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const displayName = clientName || 'Client';

  // In ClientFeedbackDialog, ALL messages are from clients
  // They come from video_feedback/client_feedback tables which are populated via review links
  // The reviewed_by field contains whatever name/email the client entered in the form
  const getSenderInfo = (reviewedBy: string | null) => {
    // Use the client's provided name/email, or fall back to displayName or 'Client'
    const name = reviewedBy && reviewedBy.toLowerCase() !== 'client' 
      ? reviewedBy 
      : displayName;
    return { name, isClient: true };
  };

  // Function to refetch Cloudflare audio URL
  const refetchCloudflareAudio = async (cfId: string) => {
    try {
      const result = await getAudioPlaybackUrl(cfId);
      if (result.success) {
        if (result.readyToStream === false) {
          setCloudflareAudioUrls(prev => ({ ...prev, [cfId]: 'processing' }));
        } else if (result.iframeUrl) {
          setCloudflareAudioUrls(prev => ({ ...prev, [cfId]: result.iframeUrl }));
        }
      }
    } catch (err) {
      console.error('Error refetching Cloudflare audio URL:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 relative',
              messageCount > 0 && 'text-emerald-600'
            )}
          >
            <Users className="h-4 w-4" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-[10px] text-white flex items-center justify-center font-medium">
                {messageCount > 9 ? '9+' : messageCount}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Feedback Client
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {videoTitle}
            {clientName && (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">
                {clientName}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 h-[300px] pr-4" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucun feedback client pour cette vidéo
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {messages.map((msg) => {
                  const senderInfo = getSenderInfo(msg.reviewed_by);
                  return (
                    <div
                      key={msg.id}
                      className="flex gap-2 justify-start"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback
                          className={cn(
                            'text-xs',
                            senderInfo.isClient
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {senderInfo.isClient ? (
                            <User className="h-3.5 w-3.5" />
                          ) : (
                            'AD'
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-3 py-2',
                          senderInfo.isClient
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-primary/10 border border-primary/20'
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn(
                            'text-xs font-medium',
                            senderInfo.isClient ? 'text-emerald-600' : 'text-primary'
                          )}>
                            {senderInfo.name}
                          </span>
                          {msg.type === 'revision' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-medium">
                              Révision
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-medium">
                              Feedback
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        {/* Audio - prioritize Supabase Storage, fallback to Cloudflare for legacy */}
                        {msg.audioPath && audioUrls[msg.audioPath] && (
                          <div className="mt-2 flex items-center gap-2">
                            <Volume2 className="h-3.5 w-3.5 text-amber-500" />
                            <audio 
                              controls 
                              className="h-8 w-full max-w-[220px]"
                              src={audioUrls[msg.audioPath]}
                            />
                          </div>
                        )}
                        {/* Cloudflare Audio fallback for legacy messages */}
                        {!msg.audioPath && msg.cloudflareAudioId && (
                          <div className="mt-2 flex items-center gap-2">
                            <Volume2 className="h-3.5 w-3.5 text-amber-500" />
                            {cloudflareAudioUrls[msg.cloudflareAudioId] === 'processing' ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                                <span className="text-xs text-muted-foreground">
                                  Audio en traitement (quelques secondes)...
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-xs px-2"
                                  onClick={() => refetchCloudflareAudio(msg.cloudflareAudioId!)}
                                >
                                  Réessayer
                                </Button>
                              </div>
                            ) : cloudflareAudioUrls[msg.cloudflareAudioId] ? (
                              <iframe
                                src={cloudflareAudioUrls[msg.cloudflareAudioId]}
                                className="h-12 w-full max-w-[250px] rounded border-0"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                allowFullScreen
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Chargement audio...
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Images */}
                        {msg.imagePaths && msg.imagePaths.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.imagePaths.map((path, idx) => (
                              imageUrls[path] && (
                                <a
                                  key={idx}
                                  href={imageUrls[path]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-16 h-16 rounded overflow-hidden border border-amber-500/30 hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={imageUrls[path]}
                                    alt={`Capture ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              )
                            ))}
                          </div>
                        )}
                        <p className="text-xs mt-1 text-muted-foreground/60">
                          {formatDistanceToNow(new Date(msg.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
