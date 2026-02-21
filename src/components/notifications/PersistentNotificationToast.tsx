import { Bell, X, ExternalLink, MessageCircle, CheckCircle, AlertCircle, RefreshCw, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastNotifications, Notification } from '@/hooks/useNotifications';

// Notification type icons and colors
const notificationConfig: Record<string, { 
  icon: typeof Bell; 
  bgColor: string; 
  iconColor: string;
  borderColor: string;
}> = {
  video_submitted: { 
    icon: Video, 
    bgColor: 'bg-blue-50 dark:bg-blue-900/50', 
    iconColor: 'text-blue-600',
    borderColor: 'border-l-blue-500'
  },
  video_sent_to_client: { 
    icon: CheckCircle, 
    bgColor: 'bg-green-50 dark:bg-green-900/50', 
    iconColor: 'text-green-600',
    borderColor: 'border-l-green-500'
  },
  revision_requested: { 
    icon: RefreshCw, 
    bgColor: 'bg-orange-50 dark:bg-orange-900/50', 
    iconColor: 'text-orange-600',
    borderColor: 'border-l-orange-500'
  },
  video_completed: { 
    icon: CheckCircle, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/50', 
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500'
  },
  video_late: { 
    icon: AlertCircle, 
    bgColor: 'bg-red-50 dark:bg-red-900/50', 
    iconColor: 'text-red-600',
    borderColor: 'border-l-red-500'
  },
  new_delivery: { 
    icon: Video, 
    bgColor: 'bg-purple-50 dark:bg-purple-900/50', 
    iconColor: 'text-purple-600',
    borderColor: 'border-l-purple-500'
  },
  video_assigned: { 
    icon: Video, 
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/50', 
    iconColor: 'text-indigo-600',
    borderColor: 'border-l-indigo-500'
  },
  editor_question: { 
    icon: MessageCircle, 
    bgColor: 'bg-amber-50 dark:bg-amber-900/50', 
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500'
  },
  admin_reply: { 
    icon: MessageCircle, 
    bgColor: 'bg-primary/10', 
    iconColor: 'text-primary',
    borderColor: 'border-l-primary'
  },
  editor_profile_submitted: { 
    icon: Bell, 
    bgColor: 'bg-amber-50 dark:bg-amber-900/50', 
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500'
  },
  video_downloaded: { 
    icon: CheckCircle, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/50', 
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500'
  },
  profile_validated: {
    icon: CheckCircle, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/50', 
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500'
  },
};

// Single notification card component
function NotificationCard({ 
  notification, 
  onDismiss 
}: { 
  notification: Notification;
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
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-2xl cursor-pointer",
        "backdrop-blur-sm bg-card border border-border",
        "min-w-[340px] max-w-[400px]",
        "hover:scale-[1.02] transition-transform",
        config.borderColor
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
        config.bgColor
      )}>
        <Icon className={cn("h-6 w-6", config.iconColor)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm text-foreground">
            {notification.title}
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted/80 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Project/Client context */}
        {(projectName || clientName || videoTitle) && (
          <p className="text-xs font-semibold text-primary mt-0.5">
            {projectName}
            {projectName && clientName && ' • '}
            {clientName}
            {videoTitle && ` - ${videoTitle}`}
          </p>
        )}
        
        {/* Message */}
        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
          {notification.message}
        </p>
        
        {/* Action hint */}
        {notification.link && (
          <div className="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-primary">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Cliquez pour voir</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Main component that shows persistent notifications
export function PersistentNotificationToast() {
  const { notifications, dismiss } = useToastNotifications();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onDismiss={() => dismiss(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
