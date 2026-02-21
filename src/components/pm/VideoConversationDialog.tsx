import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { MessageCircle, Send, Loader2, AlertTriangle, Volume2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

interface Message {
  id: string;
  message: string;
  sender_id: string;
  sender_name: string | null;
  sender_type: string;
  created_at: string;
  isRevision?: boolean;
  audioPath?: string;
  cloudflareAudioId?: string;
  images?: string[];
}

interface VideoConversationDialogProps {
  videoId: string;
  videoTitle: string;
  editorName?: string;
  trigger?: React.ReactNode;
  initialMessageCount?: number;
}

export function VideoConversationDialog({
  videoId,
  videoTitle,
  editorName,
  trigger,
  initialMessageCount = 0,
}: VideoConversationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages when dialog opens
  useEffect(() => {
    if (!open || !videoId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        // Fetch conversation messages
        const { data: conversations, error } = await supabase
          .from('video_conversations')
          .select('*')
          .eq('video_id', videoId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch admin revision feedback (to show in conversation)
        const { data: feedback } = await supabase
          .from('video_feedback')
          .select('*')
          .eq('video_id', videoId)
          .eq('decision', 'revision_requested');

        // Map conversation messages
        const conversationMessages: Message[] = (conversations || []).map(c => ({
          id: c.id,
          message: c.message,
          sender_id: c.sender_id,
          sender_name: c.sender_name,
          sender_type: c.sender_type,
          created_at: c.created_at,
        }));

        // Map admin revision feedback (only those with email = admin)
        const adminFeedbackMessages: Message[] = (feedback || [])
          .filter(fb => fb.reviewed_by && fb.reviewed_by.includes('@'))
          .map(fb => ({
            id: `revision-${fb.id}`,
            message: fb.revision_notes || fb.feedback_text || 'Révision demandée',
            sender_id: '',
            sender_name: fb.reviewed_by,
            sender_type: 'admin',
            created_at: fb.created_at,
            isRevision: true,
            audioPath: fb.revision_audio_path,
            cloudflareAudioId: (fb as any).cloudflare_audio_id,
            images: fb.revision_images as string[],
          }));

        // Combine and sort all messages by date
        const allMessages = [...conversationMessages, ...adminFeedbackMessages]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        setMessages(allMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Erreur lors du chargement des messages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`video-conv-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_conversations',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, videoId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      // 1. Insert message
      const { error } = await supabase.from('video_conversations').insert({
        video_id: videoId,
        sender_id: user.id,
        sender_name: 'Admin',
        sender_type: 'admin',
        message: newMessage.trim(),
      });

      if (error) throw error;

      // 2. Mark all editor questions for this video as answered (keeps conversation visible)
      // This removes the video from the "Questions" count in the PM dashboard
      const { error: updateError } = await supabase
        .from('video_conversations')
        .update({ is_answered: true })
        .eq('video_id', videoId)
        .eq('sender_type', 'editor')
        .eq('is_answered', false);

      if (updateError) {
        console.error('Error marking editor questions as answered:', updateError);
      } else {
        queryClient.invalidateQueries({ queryKey: ['pm-editor-questions'] });
        queryClient.invalidateQueries({ queryKey: ['pm-dashboard'] });
      }

      // 3. Get the video's assigned editor to send notification + email
      const { data: video } = await supabase
        .from('videos')
        .select('assigned_to, title, task_id')
        .eq('id', videoId)
        .single();

      if (video?.assigned_to) {
        let projectName = '';
        let clientName = '';
        if (video.task_id) {
          const { data: task } = await supabase
            .from('tasks')
            .select('project_name, client_name')
            .eq('id', video.task_id)
            .single();
          projectName = task?.project_name || '';
          clientName = task?.client_name || '';
        }

        // Create in-app notification for editor
        const { data: notificationId } = await supabase.rpc('create_notification', {
          p_user_id: video.assigned_to,
          p_type: 'admin_reply',
          p_title: 'Réponse de l\'admin',
          p_message: `L'admin a répondu à votre conversation sur "${video.title}": "${newMessage.trim().substring(0, 100)}${newMessage.trim().length > 100 ? '...' : ''}"`,
          p_link: '/editor',
          p_metadata: {
            video_id: videoId,
            video_title: video.title,
            project_name: projectName,
            client_name: clientName,
          },
        });

        console.log('[VideoConversation] Notification created for editor:', video.assigned_to, 'notificationId:', notificationId);

        // Send email directly to editor
        try {
          const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
            body: { 
              notification_id: null, 
              send_to_editor: video.assigned_to, 
              video_title: video.title, 
              admin_message: newMessage.trim() 
            },
          });
          
          if (emailError) {
            console.error('[VideoConversation] Email error:', emailError);
          } else {
            console.log('[VideoConversation] Email sent to editor successfully');
            // Mark notification as email_sent to prevent duplicate from realtime hook
            if (notificationId) {
              await supabase
                .from('notifications')
                .update({ email_sent: true })
                .eq('id', notificationId);
            }
          }
        } catch (emailError) {
          console.error('[VideoConversation] Failed to send email:', emailError);
        }
      }

      setNewMessage('');
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messageCount = open ? messages.length : initialMessageCount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 relative',
              messageCount > 0 && 'text-primary'
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                {messageCount > 9 ? '9+' : messageCount}
              </span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Conversation
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {videoTitle}
            {editorName && (
              <Badge variant="outline" className="text-xs">
                {editorName}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Messages */}
          <div className="flex-1 h-[400px] overflow-y-auto pr-2 scrollbar-thin" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucun message dans cette conversation
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {messages.map((msg) => {
                  const isAdmin = msg.sender_type === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2',
                        isAdmin ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback
                          className={cn(
                            'text-xs',
                            isAdmin
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {isAdmin ? 'AD' : msg.sender_name?.substring(0, 2).toUpperCase() || 'ED'}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2',
                          msg.isRevision
                            ? 'bg-warning/10 border border-warning/30'
                            : isAdmin
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={cn(
                            'text-xs font-medium',
                            msg.isRevision ? 'text-warning' : ''
                          )}>
                            {isAdmin ? (msg.sender_name || 'Admin') : msg.sender_name || 'Éditeur'}
                          </span>
                          {msg.isRevision && (
                            <Badge className="bg-warning/20 text-warning text-[10px] h-4 px-1.5">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              Révision
                            </Badge>
                          )}
                          <span
                            className={cn(
                              'text-[10px]',
                              msg.isRevision
                                ? 'text-muted-foreground'
                                : isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}
                          >
                            {format(parseISO(msg.created_at), 'd MMM HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <p className={cn(
                          'text-sm whitespace-pre-wrap break-words',
                          msg.isRevision ? 'text-foreground' : ''
                        )}>
                          {msg.message}
                        </p>

                        {/* Audio indicator */}
                        {(msg.audioPath || msg.cloudflareAudioId) && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                            <Volume2 className="h-3 w-3" />
                            <span>Audio attaché {msg.cloudflareAudioId ? '(Cloudflare)' : ''}</span>
                          </div>
                        )}

                        {/* Images indicator */}
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                            <ImageIcon className="h-3 w-3" />
                            <span>{msg.images.length} image(s) attachée(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t pt-3 mt-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Écrire un message à l'éditeur..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] resize-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                size="icon"
                className="shrink-0 h-[60px] w-10"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
