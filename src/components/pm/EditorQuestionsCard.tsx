import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircleQuestion, Send, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface EditorQuestion {
  id: string;
  video_id: string | null;
  task_id: string | null;
  sender_id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  created_at: string;
}

interface EditorQuestionsCardProps {
  questions: EditorQuestion[];
  getEditorName: (userId: string | null) => string;
  tasks: Array<{ id: string; title: string; client_name: string | null }>;
  videos: Array<{ id: string; title: string; task_id: string }>;
}

export function EditorQuestionsCard({
  questions,
  getEditorName,
  tasks,
  videos,
}: EditorQuestionsCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<EditorQuestion | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const queryClient = useQueryClient();

  const getVideoTitle = (videoId: string | null) => {
    if (!videoId) return null;
    return videos.find(v => v.id === videoId)?.title || null;
  };

  const getTaskInfo = (taskId: string | null, videoId: string | null) => {
    // Try to get task from direct task_id or via video's task_id
    let actualTaskId = taskId;
    if (!actualTaskId && videoId) {
      const video = videos.find(v => v.id === videoId);
      actualTaskId = video?.task_id || null;
    }
    if (!actualTaskId) return { title: null, client: null };
    const task = tasks.find(t => t.id === actualTaskId);
    return { title: task?.title || null, client: task?.client_name || null };
  };

  const handleReply = async () => {
    if (!selectedQuestion || !replyText.trim()) return;

    setIsReplying(true);
    try {
      const taskInfo = getTaskInfo(selectedQuestion.task_id, selectedQuestion.video_id);
      const videoTitle = getVideoTitle(selectedQuestion.video_id);

      const { error } = await supabase.rpc('send_admin_reply_to_editor', {
        p_editor_user_id: selectedQuestion.sender_id,
        p_reply_message: replyText.trim(),
        p_original_question: selectedQuestion.message,
        p_project_name: taskInfo.title || undefined,
        p_video_title: videoTitle || undefined,
        p_client_name: taskInfo.client || undefined,
        p_video_id: selectedQuestion.video_id || undefined,
        p_task_id: selectedQuestion.task_id || undefined,
      });

      if (error) throw error;

      // Delete the question from the database after successful reply
      const { error: deleteError } = await supabase
        .from('video_conversations')
        .delete()
        .eq('id', selectedQuestion.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
      }

      toast.success('Réponse envoyée avec succès');
      setReplyText('');
      setSelectedQuestion(null);
      queryClient.invalidateQueries({ queryKey: ['pm-editor-questions'] });
    } catch (error) {
      console.error('Reply error:', error);
      toast.error("Erreur lors de l'envoi de la réponse");
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30 bg-card"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Questions</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {questions.length}
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
              <MessageCircleQuestion className="h-6 w-6 text-info" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-info" />
              Questions des éditeurs
              <Badge variant="outline" className="ml-2">
                {questions.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {questions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucune question des éditeurs
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => {
                  const taskInfo = getTaskInfo(question.task_id, question.video_id);
                  const videoTitle = getVideoTitle(question.video_id);
                  
                  return (
                    <Card
                      key={question.id}
                      className={`p-4 transition-all ${
                        selectedQuestion?.id === question.id
                          ? 'ring-2 ring-primary'
                          : 'hover:bg-muted/30 cursor-pointer'
                      }`}
                      onClick={() => setSelectedQuestion(
                        selectedQuestion?.id === question.id ? null : question
                      )}
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10 bg-warning/20">
                          <AvatarFallback className="bg-warning/20 text-warning text-lg">
                            ?
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">
                                {question.sender_name || getEditorName(question.sender_id)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {taskInfo.title && (
                                  <span className="text-primary">{taskInfo.title}</span>
                                )}
                                {videoTitle && (
                                  <span> • {videoTitle}</span>
                                )}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(question.created_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                          </div>
                          
                          <p className="mt-2 text-sm text-foreground">
                            {question.message}
                          </p>

                          {selectedQuestion?.id === question.id && (
                            <div className="mt-4 space-y-3 border-t pt-4">
                              <p className="text-sm font-medium">Répondre à l'éditeur</p>
                              <Textarea
                                placeholder="Écrivez votre réponse ici..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="min-h-[80px]"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedQuestion(null);
                                    setReplyText('');
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Annuler
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!replyText.trim() || isReplying}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReply();
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  {isReplying ? 'Envoi...' : 'Envoyer'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
