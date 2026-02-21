import { useEffect, useRef } from 'react';
import { Bell, X, ExternalLink, MessageCircle, CheckCircle, AlertCircle, RefreshCw, Video } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { playNotificationSound } from '@/lib/notificationSound';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// Notification type icons and colors
const notificationConfig: Record<string, { 
  icon: typeof Bell; 
  bgColor: string; 
  iconColor: string;
  borderColor: string;
}> = {
  video_submitted: { 
    icon: Video, 
    bgColor: 'bg-blue-50 dark:bg-blue-950', 
    iconColor: 'text-blue-600',
    borderColor: 'border-l-blue-500'
  },
  video_sent_to_client: { 
    icon: CheckCircle, 
    bgColor: 'bg-green-50 dark:bg-green-950', 
    iconColor: 'text-green-600',
    borderColor: 'border-l-green-500'
  },
  revision_requested: { 
    icon: RefreshCw, 
    bgColor: 'bg-orange-50 dark:bg-orange-950', 
    iconColor: 'text-orange-600',
    borderColor: 'border-l-orange-500'
  },
  video_completed: { 
    icon: CheckCircle, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950', 
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500'
  },
  video_late: { 
    icon: AlertCircle, 
    bgColor: 'bg-red-50 dark:bg-red-950', 
    iconColor: 'text-red-600',
    borderColor: 'border-l-red-500'
  },
  new_delivery: { 
    icon: Video, 
    bgColor: 'bg-purple-50 dark:bg-purple-950', 
    iconColor: 'text-purple-600',
    borderColor: 'border-l-purple-500'
  },
  video_assigned: { 
    icon: Video, 
    bgColor: 'bg-indigo-50 dark:bg-indigo-950', 
    iconColor: 'text-indigo-600',
    borderColor: 'border-l-indigo-500'
  },
  editor_question: { 
    icon: MessageCircle, 
    bgColor: 'bg-amber-50 dark:bg-amber-950', 
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500'
  },
  admin_reply: { 
    icon: MessageCircle, 
    bgColor: 'bg-primary/5', 
    iconColor: 'text-primary',
    borderColor: 'border-l-primary'
  },
  editor_profile_submitted: { 
    icon: Bell, 
    bgColor: 'bg-amber-50 dark:bg-amber-950', 
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500'
  },
  video_downloaded: { 
    icon: CheckCircle, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950', 
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500'
  },
  profile_validated: {
    icon: CheckCircle, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950', 
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500'
  },
};

interface NotificationPayload {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Custom toast component for rich notifications
function NotificationToastContent({ 
  notification, 
  onDismiss 
}: { 
  notification: NotificationPayload;
  onDismiss: () => void;
}) {
  const config = notificationConfig[notification.type] || {
    icon: Bell,
    bgColor: 'bg-muted',
    iconColor: 'text-muted-foreground',
    borderColor: 'border-l-muted-foreground'
  };
  
  const Icon = config.icon;
  
  const projectName = notification.metadata?.project_name as string | undefined;
  const clientName = notification.metadata?.client_name as string | undefined;
  const videoTitle = notification.metadata?.video_title as string | undefined;
  
  const handleClick = () => {
    if (notification.link) {
      window.location.href = notification.link;
    }
    onDismiss();
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg cursor-pointer",
        "transition-all duration-300 hover:scale-[1.02]",
        "min-w-[320px] max-w-[400px]",
        config.bgColor,
        config.borderColor
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        config.bgColor
      )}>
        <Icon className={cn("h-5 w-5", config.iconColor)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-foreground">
            {notification.title}
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        
        {/* Project/Client context */}
        {(projectName || clientName || videoTitle) && (
          <p className="text-xs font-medium text-primary mt-0.5">
            {projectName}
            {projectName && clientName && ' • '}
            {clientName}
            {videoTitle && ` - ${videoTitle}`}
          </p>
        )}
        
        {/* Message */}
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
        
        {/* Action hint */}
        {notification.link && (
          <div className="flex items-center gap-1 mt-2 text-xs text-primary">
            <ExternalLink className="h-3 w-3" />
            <span>Cliquez pour voir</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component that listens to realtime notifications
export function RealtimeNotificationListener() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) return;

    console.log('[RealtimeNotification] Setting up listener for user:', user.id);
    
    const channel = supabase
      .channel(`realtime-toast-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[RealtimeNotification] 🔔 New notification received:', payload);
          
          const notification = payload.new as NotificationPayload;
          
          // Play sound
          playNotificationSound();
          
          console.log('[RealtimeNotification] 🎯 Showing toast for:', notification.title);
          
          // Show toast with custom content - use toast.custom for rich notifications
          toast.custom(
            (t) => (
              <NotificationToastContent 
                notification={notification}
                onDismiss={() => toast.dismiss(t)}
              />
            ),
            {
              duration: Infinity, // Stays visible until user dismisses
              position: 'top-right',
              id: notification.id, // Unique ID prevents duplicates
            }
          );
          
          // Invalidate notifications query to update bell badge
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeNotification] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          console.log('[RealtimeNotification] ✅ Successfully subscribed for user:', user.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeNotification] ❌ Channel error for user:', user.id);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[RealtimeNotification] Cleaning up listener');
      isSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  // This component doesn't render anything - it just listens
  return null;
}
