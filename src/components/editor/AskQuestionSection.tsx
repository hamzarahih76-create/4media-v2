import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle, Send, Loader2, CheckCircle, MessageCircle, User, Shield, AlertTriangle, Volume2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ConversationMessage {
  id: string;
  video_id: string | null;
  task_id: string | null;
  sender_id: string;
  sender_type: 'editor' | 'admin';
  sender_name: string | null;
  message: string;
  created_at: string;
  isRevision?: boolean;
  audioPath?: string | null;
  imagePaths?: string[] | null;
}

interface AskQuestionSectionProps {
  videoId?: string;
  taskId: string;
  projectName?: string;
  videoTitle?: string;
  clientName?: string;
  editorName?: string;
}

export function AskQuestionSection({
  videoId,
  taskId,
  projectName,
  videoTitle,
  clientName,
  editorName
}: AskQuestionSectionProps) {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Fetch conversation history AND admin revision requests
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const allMessages: ConversationMessage[] = [];

        // 1. Fetch Q&A messages from video_conversations
        let query = supabase
          .from('video_conversations')
          .select('*')
          .order('created_at', { ascending: true });

        if (videoId) {
          query = query.eq('video_id', videoId);
        } else if (taskId) {
          query = query.eq('task_id', taskId);
        }

        const { data: conversationData, error: convError } = await query;

        if (!convError && conversationData) {
          conversationData.forEach((msg: any) => {
            allMessages.push({
              ...msg,
              isRevision: false,
              audioPath: null,
              imagePaths: null
            });
          });
        }

        // 2. Fetch ADMIN revision requests from video_feedback (where reviewed_by contains '@')
        if (videoId) {
          const { data: adminFeedbacks, error: afError } = await supabase
            .from('video_feedback')
            .select('id, revision_notes, revision_audio_path, revision_images, reviewed_by, created_at')
            .eq('video_id', videoId)
            .eq('decision', 'revision_requested')
            .order('created_at', { ascending: true });

          if (!afError && adminFeedbacks) {
            adminFeedbacks.forEach((fb) => {
              // Only include ADMIN feedback (email = admin)
              const isAdminFeedback = fb.reviewed_by && fb.reviewed_by.includes('@');
              if (!isAdminFeedback) return; // Skip client feedback
              
              if (fb.revision_notes || fb.revision_audio_path || (fb.revision_images && fb.revision_images.length > 0)) {
                allMessages.push({
                  id: `admin-revision-${fb.id}`,
                  video_id: videoId,
                  task_id: null,
                  sender_id: 'admin',
                  sender_type: 'admin',
                  sender_name: fb.reviewed_by || 'Admin',
                  message: fb.revision_notes || '🎤 Message audio / 📷 Images',
                  created_at: fb.created_at,
                  isRevision: true,
                  audioPath: fb.revision_audio_path,
                  imagePaths: fb.revision_images as string[] | null
                });
              }
            });
          }
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
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://slnafhvkluqmgwrxwndy.supabase.co';
        
        if (audioPaths.length > 0) {
          const urlMap: Record<string, string> = {};
          
          for (const path of audioPaths) {
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
          setAudioUrls(urlMap);
        }

        // Fetch signed URLs for images
        const allImagePaths = allMessages
          .flatMap(m => m.imagePaths || []);
        
        if (allImagePaths.length > 0) {
          const imgUrlMap: Record<string, string> = {};
          
          for (const path of allImagePaths) {
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
          setImageUrls(imgUrlMap);
        }

      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`video-conversations-${videoId || taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_conversations',
          filter: videoId ? `video_id=eq.${videoId}` : `task_id=eq.${taskId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ConversationMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, taskId]);

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast.error('Veuillez écrire votre question');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('send_editor_question_to_admins', {
        p_question: question.trim(),
        p_video_id: videoId || null,
        p_task_id: taskId,
        p_project_name: projectName || null,
        p_video_title: videoTitle || null,
        p_client_name: clientName || null,
        p_editor_name: editorName || null
      });

      if (error) {
        console.error('Error sending question:', error);
        throw error;
      }

      toast.success('Question envoyée aux administrateurs !');
      setQuestion('');
      setSubmitted(true);
      
      setTimeout(() => setSubmitted(false), 3000);

    } catch (error: any) {
      console.error('Error sending question:', error);
      toast.error('Erreur lors de l\'envoi de la question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="space-y-4">
      {/* Conversation History */}
      {hasConversation && (
        <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold">
              Conversation avec l'admin
              {videoTitle && (
                <span className="text-muted-foreground font-normal"> - {videoTitle}</span>
              )}
            </h4>
          </div>
          
          <ScrollArea className="h-[250px]">
            <div className="space-y-3 pr-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.sender_type === 'editor' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.sender_type === 'admin' && (
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                      msg.isRevision ? "bg-amber-500/20" : "bg-primary/20"
                    )}>
                      {msg.isRevision ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2",
                      msg.sender_type === 'editor' 
                        ? "bg-primary text-primary-foreground" 
                        : msg.isRevision 
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "bg-muted border border-border"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn(
                        "text-xs font-medium",
                        msg.sender_type === 'editor' 
                          ? "text-primary-foreground/80" 
                          : msg.isRevision
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      )}>
                        {msg.sender_name || (msg.sender_type === 'admin' ? 'Admin' : 'Moi')}
                      </span>
                      {msg.isRevision && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                          Révision
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    
                    {/* Audio player */}
                    {msg.audioPath && audioUrls[msg.audioPath] && (
                      <div className="mt-2 flex items-center gap-2">
                        <Volume2 className="h-3.5 w-3.5 text-amber-500" />
                        <audio 
                          controls 
                          className="h-8 w-full max-w-[200px]"
                          src={audioUrls[msg.audioPath]}
                        />
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
                    
                    <p className={cn(
                      "text-xs mt-1",
                      msg.sender_type === 'editor' 
                        ? "text-primary-foreground/60" 
                        : "text-muted-foreground/60"
                    )}>
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  
                  {msg.sender_type === 'editor' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Ask Question Section */}
      <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-semibold">
            {hasConversation ? 'Poser une autre question' : 'Une question sur cette vidéo ?'}
          </h4>
        </div>
        
        {!hasConversation && (
          <p className="text-xs text-muted-foreground">
            Posez votre question ici, l'admin sera notifié par email et dans l'application.
          </p>
        )}
        
        <Textarea
          placeholder="Ex: Quel format utiliser ? Combien de temps pour la vidéo ?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-[80px] resize-none"
          disabled={isSubmitting}
        />
        
        <Button 
          onClick={handleSubmit}
          disabled={!question.trim() || isSubmitting}
          className="w-full gap-2"
          variant={submitted ? "outline" : "default"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : submitted ? (
            <>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Question envoyée !
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer à l'admin
            </>
          )}
        </Button>
      </div>
    </div>
  );
}