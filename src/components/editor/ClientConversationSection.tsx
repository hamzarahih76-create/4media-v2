import { useState, useEffect } from 'react';
import { Users, User, Volume2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientMessage {
  id: string;
  message: string;
  type: 'feedback' | 'revision';
  reviewed_by: string | null;
  created_at: string;
  audioPath?: string | null;
  imagePaths?: string[] | null;
}

interface ClientConversationSectionProps {
  videoId?: string;
  taskId: string;
  clientName?: string;
  videoTitle?: string;
}

export function ClientConversationSection({
  videoId,
  taskId,
  clientName,
  videoTitle
}: ClientConversationSectionProps) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchClientMessages = async () => {
      setIsLoading(true);
      try {
        const allMessages: ClientMessage[] = [];

        // Fetch from video_feedback if we have a videoId
        // Only show CLIENT feedback (reviewed_by does NOT contain '@')
        if (videoId) {
          const { data: videoFeedbacks, error: vfError } = await supabase
            .from('video_feedback')
            .select('id, feedback_text, revision_notes, reviewed_by, created_at, revision_audio_path, revision_images')
            .eq('video_id', videoId)
            .order('created_at', { ascending: true });

          if (!vfError && videoFeedbacks) {
            videoFeedbacks.forEach((fb) => {
              // Only include client feedback (no email = client)
              const isClientFeedback = !fb.reviewed_by || !fb.reviewed_by.includes('@');
              if (!isClientFeedback) return; // Skip admin feedback
              
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
              if (fb.revision_notes || fb.revision_audio_path || (fb.revision_images && fb.revision_images.length > 0)) {
                allMessages.push({
                  id: `vf-revision-${fb.id}`,
                  message: fb.revision_notes || (fb.revision_audio_path ? '🎤 Message audio' : '📷 Images jointes'),
                  type: 'revision',
                  reviewed_by: fb.reviewed_by,
                  created_at: fb.created_at,
                  audioPath: fb.revision_audio_path,
                  imagePaths: fb.revision_images
                });
              }
            });
          }
        }

        // Fetch from client_feedback for task-level feedback
        const { data: clientFeedbacks, error: cfError } = await supabase
          .from('client_feedback')
          .select('id, feedback_text, revision_notes, reviewed_by, created_at, revision_audio_path, revision_images')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (!cfError && clientFeedbacks) {
          clientFeedbacks.forEach((fb) => {
            // Only include client feedback (no email = client)
            const isClientFeedback = !fb.reviewed_by || !fb.reviewed_by.includes('@');
            if (!isClientFeedback) return; // Skip admin feedback
            
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
            if (fb.revision_notes || fb.revision_audio_path || (fb.revision_images && fb.revision_images.length > 0)) {
              allMessages.push({
                id: `cf-revision-${fb.id}`,
                message: fb.revision_notes || (fb.revision_audio_path ? '🎤 Message audio' : '📷 Images jointes'),
                type: 'revision',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                audioPath: fb.revision_audio_path,
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

        // Fetch signed URLs for audio files
        const audioPaths = allMessages
          .filter(m => m.audioPath)
          .map(m => m.audioPath as string);
        
        if (audioPaths.length > 0) {
          const urlMap: Record<string, string> = {};
          
          for (const path of audioPaths) {
            try {
              // If path is already a full URL, use it directly
              if (path.startsWith('http')) {
                urlMap[path] = path;
              } else {
                // Generate a signed URL using the storage API
                const { data, error } = await supabase.storage
                  .from('deliveries')
                  .createSignedUrl(path, 3600);
                
                if (error) {
                  console.error('Error creating signed URL for audio:', path, error);
                  continue;
                }
                
                if (data?.signedUrl) {
                  urlMap[path] = data.signedUrl;
                }
              }
            } catch (err) {
              console.error('Failed to get audio URL:', path, err);
            }
          }
          setAudioUrls(urlMap);
        }

        // Fetch signed URLs for images
        const allImagePaths = allMessages
          .flatMap(m => m.imagePaths || []);
        
        if (allImagePaths.length > 0) {
          const imgUrlMap: Record<string, string> = {};
          
          for (const path of allImagePaths) {
            try {
              // If path is already a full URL, use it directly
              if (path.startsWith('http')) {
                imgUrlMap[path] = path;
              } else {
                // Generate a signed URL using the storage API
                const { data, error } = await supabase.storage
                  .from('deliveries')
                  .createSignedUrl(path, 3600);
                
                if (error) {
                  console.error('Error creating signed URL for image:', path, error);
                  continue;
                }
                
                if (data?.signedUrl) {
                  imgUrlMap[path] = data.signedUrl;
                }
              }
            } catch (err) {
              console.error('Failed to get image URL:', path, err);
            }
          }
          setImageUrls(imgUrlMap);
        }

        setMessages(allMessages);
      } catch (error) {
        console.error('Error fetching client messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientMessages();

    // Subscribe to realtime updates for video_feedback
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (videoId) {
      const vfChannel = supabase
        .channel(`video-feedback-${videoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_feedback',
            filter: `video_id=eq.${videoId}`,
          },
          () => {
            fetchClientMessages();
          }
        )
        .subscribe();
      channels.push(vfChannel);
    }

    // Subscribe to client_feedback
    const cfChannel = supabase
      .channel(`client-feedback-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_feedback',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchClientMessages();
        }
      )
      .subscribe();
    channels.push(cfChannel);

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [videoId, taskId]);

  if (isLoading) {
    return null;
  }

  const displayName = clientName || 'Client';
  const hasMessages = messages.length > 0;

  return (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-emerald-500" />
        <h4 className="text-sm font-semibold">
          Conversation avec client
          {videoTitle && (
            <span className="text-muted-foreground font-normal"> - {videoTitle}</span>
          )}
        </h4>
      </div>
      
      {hasMessages ? (
        <ScrollArea className="h-[250px] overflow-y-auto">
          <div className="space-y-3 pr-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className="flex gap-2 justify-start"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                
                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {displayName}
                    </span>
                    {msg.type === 'revision' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                        Révision
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  
                  {/* Audio player */}
                  {msg.audioPath && (
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      {audioUrls[msg.audioPath] ? (
                        <audio 
                          controls 
                          className="h-8 w-full max-w-[200px]"
                          src={audioUrls[msg.audioPath]}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Chargement audio...</span>
                      )}
                    </div>
                  )}
                  
                  {/* Images */}
                  {msg.imagePaths && msg.imagePaths.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.imagePaths.map((path, idx) => (
                        <div key={idx}>
                          {imageUrls[path] ? (
                            <a
                              href={imageUrls[path]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-16 h-16 rounded overflow-hidden border border-amber-500/30 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={imageUrls[path]}
                                alt={`Capture ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Image failed to load:', path);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </a>
                          ) : (
                            <div className="w-16 h-16 rounded bg-muted flex items-center justify-center border border-border">
                              <ImageIcon className="h-4 w-4 text-muted-foreground animate-pulse" />
                            </div>
                          )}
                        </div>
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
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Aucun message du client pour le moment
          </p>
        </div>
      )}
    </div>
  );
}
