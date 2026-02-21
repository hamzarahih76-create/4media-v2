import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { playNotificationSound } from '@/lib/notificationSound';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  email_sent: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Global state for toast notifications (outside of React to persist across re-renders)
let toastNotifications: Notification[] = [];
let toastListeners: ((notifications: Notification[]) => void)[] = [];

function notifyToastListeners() {
  toastListeners.forEach(listener => listener([...toastNotifications]));
}

export function addToastNotification(notification: Notification) {
  // Avoid duplicates
  if (!toastNotifications.some(n => n.id === notification.id)) {
    toastNotifications = [notification, ...toastNotifications];
    notifyToastListeners();
  }
}

export function removeToastNotification(id: string) {
  toastNotifications = toastNotifications.filter(n => n.id !== id);
  notifyToastListeners();
}

export function useToastNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(toastNotifications);

  useEffect(() => {
    const listener = (newNotifications: Notification[]) => {
      setNotifications(newNotifications);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  return { 
    notifications, 
    dismiss: removeToastNotification 
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    console.log('[useNotifications] Setting up realtime for user:', user.id);

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[useNotifications] 🔔 New notification received:', payload);
          
          const newNotification = payload.new as Notification;
          
          // Play notification sound
          playNotificationSound();
          
          // Add to toast notifications (will be displayed by PersistentNotificationToast)
          addToastNotification(newNotification);
          
          // Update query cache
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          
          // Only send email if not already sent (avoid duplicates from direct email sends)
          if (!newNotification.email_sent) {
            try {
              await supabase.functions.invoke('send-notification-email', {
                body: { notification_id: newNotification.id },
              });
            } catch (error) {
              console.error('Failed to send notification email:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe((status) => {
        console.log('[useNotifications] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Computed values
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const recentNotifications = notifications.slice(0, 10);

  return {
    notifications,
    unreadNotifications,
    recentNotifications,
    unreadCount,
    isLoading,
    isConnected,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
