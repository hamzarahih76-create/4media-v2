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
import { Users, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DesignClientMessage {
  id: string;
  message: string;
  type: 'feedback' | 'revision';
  reviewed_by: string | null;
  created_at: string;
  rating: number | null;
  imagePaths?: string[] | null;
}

interface DesignClientFeedbackDialogProps {
  designTaskId: string;
  designTitle: string;
  clientName?: string;
  trigger?: React.ReactNode;
}

export function DesignClientFeedbackDialog({
  designTaskId,
  designTitle,
  clientName,
  trigger,
}: DesignClientFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DesignClientMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch message count on mount
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('design_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('design_task_id', designTaskId)
        .or('feedback_text.neq.null,revision_notes.neq.null');
      
      setMessageCount(count || 0);
    };
    fetchCount();
  }, [designTaskId]);

  // Fetch messages when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const allMessages: DesignClientMessage[] = [];

        const { data: feedbacks, error } = await supabase
          .from('design_feedback')
          .select('id, feedback_text, revision_notes, reviewed_by, created_at, rating, revision_images, decision')
          .eq('design_task_id', designTaskId)
          .order('created_at', { ascending: true });

        if (!error && feedbacks) {
          feedbacks.forEach((fb) => {
            if (fb.feedback_text) {
              allMessages.push({
                id: `df-feedback-${fb.id}`,
                message: fb.feedback_text,
                type: fb.decision === 'revision_requested' ? 'revision' : 'feedback',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                rating: fb.rating,
                imagePaths: null,
              });
            }
            if (fb.revision_notes || (fb.revision_images && fb.revision_images.length > 0)) {
              allMessages.push({
                id: `df-revision-${fb.id}`,
                message: fb.revision_notes || '📷 Images jointes',
                type: 'revision',
                reviewed_by: fb.reviewed_by,
                created_at: fb.created_at,
                rating: null,
                imagePaths: fb.revision_images,
              });
            }
          });
        }

        allMessages.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        setMessages(allMessages);
        setMessageCount(allMessages.length);

        // Fetch signed URLs for images
        const allImagePaths = allMessages.flatMap(m => m.imagePaths || []);
        if (allImagePaths.length > 0) {
          const imgUrlMap: Record<string, string> = {};
          for (const path of allImagePaths) {
            if (path.startsWith('http')) {
              imgUrlMap[path] = path;
            } else {
              const { data } = await supabase.storage
                .from('design-files')
                .createSignedUrl(path, 3600);
              if (data?.signedUrl) {
                imgUrlMap[path] = data.signedUrl;
              }
            }
          }
          setImageUrls(imgUrlMap);
        }
      } catch (error) {
        console.error('Error fetching design feedback:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`design-feedback-${designTaskId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'design_feedback',
        filter: `design_task_id=eq.${designTaskId}`,
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, designTaskId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const displayName = clientName || 'Client';

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
            Feedback Client - Design
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {designTitle}
            {clientName && (
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">
                {clientName}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1 h-[300px] pr-4" ref={scrollRef}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucun feedback client pour ce design
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2 justify-start">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs bg-emerald-500/20 text-emerald-600">
                        <User className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[85%] rounded-lg px-3 py-2 bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-medium text-emerald-600">
                          {msg.reviewed_by || displayName}
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
                        {msg.rating && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 font-medium">
                            ⭐ {msg.rating}/5
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                      {/* Images */}
                      {msg.imagePaths && msg.imagePaths.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.imagePaths.map((path, i) => {
                            const url = imageUrls[path];
                            return url ? (
                              <img
                                key={i}
                                src={url}
                                alt="Référence"
                                className="rounded-lg max-w-[150px] max-h-[100px] object-cover border border-border/50 cursor-pointer hover:opacity-80"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ) : null;
                          })}
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
