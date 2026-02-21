import { useState } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const notificationTypeConfig: Record<string, { icon: string; color: string }> = {
  // Video workflow notifications
  video_submitted: { icon: '📤', color: 'bg-blue-100 text-blue-600' },
  video_sent_to_client: { icon: '✅', color: 'bg-green-100 text-green-600' },
  revision_requested: { icon: '🔄', color: 'bg-orange-100 text-orange-600' },
  video_completed: { icon: '🎉', color: 'bg-emerald-100 text-emerald-600' },
  video_late: { icon: '⚠️', color: 'bg-red-100 text-red-600' },
  new_delivery: { icon: '📦', color: 'bg-purple-100 text-purple-600' },
  video_assigned: { icon: '🎬', color: 'bg-indigo-100 text-indigo-600' },
  community_message: { icon: '💬', color: 'bg-cyan-100 text-cyan-600' },
  editor_question: { icon: '❓', color: 'bg-amber-100 text-amber-600' },
  admin_reply: { icon: '💬', color: 'bg-primary/10 text-primary' },
  // Editor profile notifications
  editor_profile_submitted: { icon: '👤', color: 'bg-amber-100 text-amber-600' },
  editor_profile_validated: { icon: '✨', color: 'bg-green-100 text-green-600' },
  profile_validated: { icon: '🎊', color: 'bg-emerald-100 text-emerald-600' },
  editor_suspended: { icon: '🚫', color: 'bg-red-100 text-red-600' },
  editor_reactivated: { icon: '🔓', color: 'bg-teal-100 text-teal-600' },
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onOpenDetail,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onOpenDetail: (notification: Notification) => void;
}) {
  const config = notificationTypeConfig[notification.type] || {
    icon: '🔔',
    color: 'bg-muted text-muted-foreground',
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onOpenDetail(notification);
  };

  // Extract project and client info from metadata
  const projectName = notification.metadata?.project_name as string | undefined;
  const clientName = notification.metadata?.client_name as string | undefined;
  const videoTitle = notification.metadata?.video_title as string | undefined;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0',
            config.color
          )}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'font-medium text-sm truncate',
                !notification.is_read && 'text-foreground',
                notification.is_read && 'text-muted-foreground'
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          {/* Project & Client info */}
          {(projectName || clientName) && (
            <p className="text-xs font-medium text-primary/80 mt-0.5 truncate">
              {projectName}{projectName && clientName && ' • '}{clientName}
              {videoTitle && ` - ${videoTitle}`}
            </p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
        {notification.link && (
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

// Notification Detail Dialog with Reply functionality
function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
  onNavigate,
}: {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (link: string) => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replySent, setReplySent] = useState(false);

  if (!notification) return null;

  const config = notificationTypeConfig[notification.type] || {
    icon: '🔔',
    color: 'bg-muted text-muted-foreground',
  };

  const projectName = notification.metadata?.project_name as string | undefined;
  const clientName = notification.metadata?.client_name as string | undefined;
  const videoTitle = notification.metadata?.video_title as string | undefined;
  const editorName = notification.metadata?.editor_name as string | undefined;
  const originalQuestion = notification.metadata?.original_question as string | undefined;
  const adminName = notification.metadata?.admin_name as string | undefined;

  // Check if this is an editor question that admin can reply to
  const isEditorQuestion = notification.type === 'editor_question';
  const isAdminReply = notification.type === 'admin_reply';

  // Get video/task IDs from notification metadata
  const videoId = notification.metadata?.video_id as string | undefined;
  const taskId = notification.metadata?.task_id as string | undefined;

  // Get editor's user_id from the task assignment
  const getEditorUserId = async () => {
    if (videoId) {
      const { data } = await supabase
        .from('videos')
        .select('assigned_to')
        .eq('id', videoId)
        .single();
      return data?.assigned_to;
    }
    
    if (taskId) {
      const { data } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single();
      return data?.assigned_to;
    }
    
    return null;
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Veuillez écrire une réponse');
      return;
    }

    setIsSending(true);

    try {
      const editorUserId = await getEditorUserId();
      
      if (!editorUserId) {
        throw new Error('Impossible de trouver l\'éditeur');
      }

      const { error } = await supabase.rpc('send_admin_reply_to_editor', {
        p_editor_user_id: editorUserId,
        p_reply_message: replyText.trim(),
        p_original_question: notification.message,
        p_project_name: projectName || null,
        p_video_title: videoTitle || null,
        p_client_name: clientName || null,
        p_video_id: videoId || null,
        p_task_id: taskId || null
      });

      if (error) throw error;

      toast.success('Réponse envoyée à l\'éditeur !');
      setReplyText('');
      setReplySent(true);
      
      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setReplySent(false);
      }, 1500);

    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setReplyText('');
    setReplySent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0',
                config.color
              )}
            >
              {config.icon}
            </div>
            <div>
              <DialogTitle className="text-lg">{notification.title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(notification.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Project & Client context */}
          {(projectName || clientName) && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-semibold text-primary">
                {projectName}{projectName && clientName && ' • '}{clientName}
              </p>
              {videoTitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  Vidéo: {videoTitle}
                </p>
              )}
            </div>
          )}

          {/* Editor name for questions */}
          {isEditorQuestion && editorName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">De:</span>
              <span>{editorName}</span>
            </div>
          )}

          {/* Admin name for replies */}
          {isAdminReply && adminName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">De:</span>
              <span>{adminName}</span>
            </div>
          )}

          {/* Original question for admin replies */}
          {isAdminReply && originalQuestion && (
            <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-muted-foreground/30">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Votre question :</p>
              <p className="text-sm italic text-muted-foreground">{originalQuestion}</p>
            </div>
          )}

          {/* Message */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm leading-relaxed">{notification.message}</p>
          </div>

          {/* Reply section for editor questions (admin only) */}
          {isEditorQuestion && !replySent && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Répondre à l'éditeur</p>
              <Textarea
                placeholder="Écrivez votre réponse ici..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px] resize-none"
                disabled={isSending}
              />
            </div>
          )}

          {/* Reply sent confirmation */}
          {replySent && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Réponse envoyée !</span>
            </div>
          )}
        </div>

        {/* Footer with send button for editor questions */}
        {isEditorQuestion && !replySent && (
          <DialogFooter className="mt-4">
            <Button
              onClick={handleSendReply}
              disabled={!replyText.trim() || isSending}
              className="w-full gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer la réponse
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const navigate = useNavigate();
  const {
    recentNotifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const handleOpenDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailOpen(true);
  };

  const handleNavigate = (link: string) => {
    navigate(link);
    setOpen(false);
    setDetailOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
                className="text-xs gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer comme lu
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Chargement...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onOpenDetail={handleOpenDetail}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {recentNotifications.length > 0 && (
            <div className="p-3 border-t">
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Voir toutes les notifications
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Notification Detail Dialog */}
      <NotificationDetailDialog
        notification={selectedNotification}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onNavigate={handleNavigate}
      />
    </>
  );
}