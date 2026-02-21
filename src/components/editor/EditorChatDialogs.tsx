import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { MessageCircle, Send, Users, AlertTriangle, Volume2, ImageIcon, X, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { getAudioPlaybackUrl } from '@/lib/api/cloudflareAudio';

interface Message {
  id: string;
  content: string;
  senderType: 'editor' | 'admin' | 'client';
  senderName?: string;
  createdAt: string;
  isRevision?: boolean;
  audioPath?: string;
  cloudflareAudioId?: string;
  images?: string[];
}

// Component to display images with signed URL support
function MessageImages({ images, imageUrls }: { images: string[]; imageUrls: Record<string, string> }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {images.map((path, index) => {
          const url = imageUrls[path] || path;
          const hasUrl = !!imageUrls[path] || path.startsWith('http');
          
          return (
            <div
              key={index}
              className="relative cursor-pointer rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
              onClick={() => hasUrl && setSelectedImage(url)}
            >
              {hasUrl ? (
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-16 object-cover"
                  onError={(e) => {
                    console.error('Image load error:', path);
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-16 bg-muted flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-16 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              window.open(selectedImage, '_blank');
            }}
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// Audio player component with signed URL support (Cloudflare + Supabase fallback)
function MessageAudio({ audioPath, audioUrl, cloudflareAudioId }: { audioPath?: string; audioUrl?: string; cloudflareAudioId?: string }) {
  const [cfAudioUrl, setCfAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!cloudflareAudioId);

  useEffect(() => {
    if (cloudflareAudioId) {
      setLoading(true);
      getAudioPlaybackUrl(cloudflareAudioId)
        .then(result => {
          if (result.success && result.iframeUrl) {
            setCfAudioUrl(result.iframeUrl);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [cloudflareAudioId]);

  // Priority: Cloudflare > audioUrl > audioPath (if http)
  const url = cfAudioUrl || audioUrl || (audioPath?.startsWith('http') ? audioPath : null);
  
  return (
    <div className="mt-2 flex items-center gap-2">
      <Volume2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
      {loading ? (
        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Chargement audio...
        </span>
      ) : cfAudioUrl ? (
        <iframe
          src={cfAudioUrl}
          className="h-12 w-full max-w-[250px] rounded border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      ) : url ? (
        <audio 
          controls 
          className="h-8 w-full max-w-[200px]"
          src={url}
        />
      ) : (
        <span className="text-xs text-muted-foreground italic">Audio non disponible</span>
      )}
    </div>
  );
}

interface AdminChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
  projectName?: string;
  clientName?: string;
}

interface ClientChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
  clientName?: string;
}

export function AdminChatDialog({ 
  open, 
  onOpenChange, 
  videoId, 
  videoTitle,
  projectName,
  clientName 
}: AdminChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (open && videoId) {
      fetchMessages();
    }
  }, [open, videoId]);

  // Generate signed URLs for audio and images
  const generateSignedUrls = async (msgs: Message[]) => {
    const audioPaths = msgs.filter(m => m.audioPath).map(m => m.audioPath as string);
    const allImagePaths = msgs.flatMap(m => m.images || []);
    
    // Generate audio URLs
    if (audioPaths.length > 0) {
      const urlMap: Record<string, string> = {};
      for (const path of audioPaths) {
        if (path.startsWith('http')) {
          urlMap[path] = path;
        } else {
          const { data } = await supabase.storage.from('deliveries').createSignedUrl(path, 3600);
          if (data?.signedUrl) urlMap[path] = data.signedUrl;
        }
      }
      setAudioUrls(urlMap);
    }
    
    // Generate image URLs
    if (allImagePaths.length > 0) {
      const urlMap: Record<string, string> = {};
      for (const path of allImagePaths) {
        if (path.startsWith('http')) {
          urlMap[path] = path;
        } else {
          const { data } = await supabase.storage.from('deliveries').createSignedUrl(path, 3600);
          if (data?.signedUrl) urlMap[path] = data.signedUrl;
        }
      }
      setImageUrls(urlMap);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: conversations } = await supabase
        .from('video_conversations')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      const { data: feedback } = await supabase
        .from('video_feedback')
        .select('*')
        .eq('video_id', videoId)
        .eq('decision', 'revision_requested');

      const conversationMessages: Message[] = (conversations || []).map(c => ({
        id: c.id,
        content: c.message,
        senderType: c.sender_type as 'editor' | 'admin',
        senderName: c.sender_name,
        createdAt: c.created_at,
      }));

      const adminFeedbackMessages: Message[] = (feedback || [])
        .filter(fb => fb.reviewed_by && fb.reviewed_by.includes('@'))
        .map(fb => ({
          id: fb.id,
          content: fb.revision_notes || fb.feedback_text || 'Révision demandée',
          senderType: 'admin' as const,
          senderName: fb.reviewed_by,
          createdAt: fb.created_at,
          isRevision: true,
          audioPath: fb.revision_audio_path,
          cloudflareAudioId: (fb as any).cloudflare_audio_id,
          images: fb.revision_images as string[],
        }));

      const allMessages = [...conversationMessages, ...adminFeedbackMessages]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setMessages(allMessages);
      
      // Generate signed URLs after messages are loaded
      await generateSignedUrls(allMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    // Triple protection: state, ref, and empty message check
    if (!newMessage.trim() || sending || isSendingRef.current) return;
    
    // Lock immediately with ref (synchronous, no delay)
    isSendingRef.current = true;
    
    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear immediately
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Use RPC which handles BOTH the insert and admin notification
      // DO NOT insert separately - the RPC already inserts into video_conversations
      await supabase.rpc('send_editor_question_to_admins', {
        p_video_id: videoId,
        p_question: messageToSend,
        p_editor_name: profile?.full_name || 'Éditeur',
        p_project_name: projectName,
        p_video_title: videoTitle,
        p_client_name: clientName,
      });

      toast.success('Message envoyé à l\'admin');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend); // Restore message on error
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
      isSendingRef.current = false; // Unlock ref
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="sm:max-w-lg max-h-[80vh] flex flex-col"
        style={{ zIndex: 200 }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chat Admin - {videoTitle}
          </DialogTitle>
          <DialogDescription>
            Posez vos questions à l'administrateur concernant cette vidéo
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 h-[400px] overflow-y-auto pr-2 scrollbar-thin">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun message pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg',
                    msg.senderType === 'editor' 
                      ? 'bg-primary/10 ml-8' 
                      : 'bg-muted mr-8',
                    msg.isRevision && 'bg-amber-500/10 border border-amber-500/30'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {msg.senderType === 'editor' ? 'Vous' : 'Admin'}
                    </span>
                    {msg.isRevision && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Révision
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {(msg.audioPath || msg.cloudflareAudioId) && (
                    <MessageAudio 
                      audioPath={msg.audioPath} 
                      audioUrl={msg.audioPath ? audioUrls[msg.audioPath] : undefined}
                      cloudflareAudioId={msg.cloudflareAudioId}
                    />
                  )}
                  
                  {msg.images && msg.images.length > 0 && (
                    <MessageImages images={msg.images} imageUrls={imageUrls} />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="Posez votre question à l'admin..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={2}
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sending}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            Envoyer à l'admin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClientChatDialog({ 
  open, 
  onOpenChange, 
  videoId, 
  videoTitle,
  clientName 
}: ClientChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && videoId) {
      fetchMessages();
    }
  }, [open, videoId]);

  // Generate signed URLs for audio and images
  const generateSignedUrls = async (msgs: Message[]) => {
    const audioPaths = msgs.filter(m => m.audioPath).map(m => m.audioPath as string);
    const allImagePaths = msgs.flatMap(m => m.images || []);
    
    if (audioPaths.length > 0) {
      const urlMap: Record<string, string> = {};
      for (const path of audioPaths) {
        if (path.startsWith('http')) {
          urlMap[path] = path;
        } else {
          const { data } = await supabase.storage.from('deliveries').createSignedUrl(path, 3600);
          if (data?.signedUrl) urlMap[path] = data.signedUrl;
        }
      }
      setAudioUrls(urlMap);
    }
    
    if (allImagePaths.length > 0) {
      const urlMap: Record<string, string> = {};
      for (const path of allImagePaths) {
        if (path.startsWith('http')) {
          urlMap[path] = path;
        } else {
          const { data } = await supabase.storage.from('deliveries').createSignedUrl(path, 3600);
          if (data?.signedUrl) urlMap[path] = data.signedUrl;
        }
      }
      setImageUrls(urlMap);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: feedback } = await supabase
        .from('video_feedback')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      const clientMessages: Message[] = (feedback || [])
        .filter(fb => !fb.reviewed_by || !fb.reviewed_by.includes('@'))
        .map(fb => ({
          id: fb.id,
          content: fb.revision_notes || fb.feedback_text || (fb.decision === 'approved' ? '✓ Vidéo approuvée' : 'Feedback client'),
          senderType: 'client' as const,
          senderName: fb.reviewed_by || clientName || 'Client',
          createdAt: fb.created_at,
          isRevision: fb.decision === 'revision_requested',
          audioPath: fb.revision_audio_path,
          cloudflareAudioId: (fb as any).cloudflare_audio_id,
          images: fb.revision_images as string[],
        }));

      setMessages(clientMessages);
      await generateSignedUrls(clientMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="sm:max-w-lg max-h-[80vh] flex flex-col"
        style={{ zIndex: 200 }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Chat Client - {videoTitle}
          </DialogTitle>
          <DialogDescription>
            Feedbacks et demandes de modifications du client
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 h-[400px] overflow-y-auto pr-2 scrollbar-thin">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun message du client pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20',
                    msg.isRevision && 'bg-orange-500/10 border-orange-500/30'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-emerald-600">
                      {msg.senderName || 'Client'}
                    </span>
                    {msg.isRevision && (
                      <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Modification
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {(msg.audioPath || msg.cloudflareAudioId) && (
                    <MessageAudio 
                      audioPath={msg.audioPath} 
                      audioUrl={msg.audioPath ? audioUrls[msg.audioPath] : undefined}
                      cloudflareAudioId={msg.cloudflareAudioId}
                    />
                  )}
                  
                  {msg.images && msg.images.length > 0 && (
                    <MessageImages images={msg.images} imageUrls={imageUrls} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Les messages du client apparaissent ici après leur feedback
        </p>
      </DialogContent>
    </Dialog>
  );
}
