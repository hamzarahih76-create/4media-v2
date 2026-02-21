import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CommunityMessage {
  id: string;
  user_id: string;
  author_name: string;
  author_rank: string;
  channel: string;
  content: string;
  created_at: string;
}

interface UserPresence {
  user_id: string;
  name: string;
  online_at: string;
}

export function useCommunityChat(channel: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch messages for the channel
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['community-messages', channel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel', channel)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as CommunityMessage[];
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, authorName, authorRank }: { content: string; authorName: string; authorRank: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_messages')
        .insert({
          user_id: user.id,
          author_name: authorName,
          author_rank: authorRank,
          channel,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-messages', channel] });
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channelSubscription = supabase
      .channel(`community-messages-${channel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `channel=eq.${channel}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.setQueryData(['community-messages', channel], (old: CommunityMessage[] = []) => {
            const newMessage = payload.new as CommunityMessage;
            // Check if message already exists
            if (old.some(m => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [channel, queryClient]);

  // Presence tracking
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('community-presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: UserPresence[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (!users.some(u => u.user_id === presence.user_id)) {
              users.push({
                user_id: presence.user_id,
                name: presence.name,
                online_at: presence.online_at,
              });
            }
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Get user's profile info for presence
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();

          const { data: editorStats } = await supabase
            .from('editor_stats')
            .select('rank')
            .eq('user_id', user.id)
            .single();

          await presenceChannel.track({
            user_id: user.id,
            name: profile?.full_name || user.email?.split('@')[0] || 'Anonyme',
            rank: editorStats?.rank || 'bronze',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const sendMessage = useCallback(
    (content: string, authorName: string, authorRank: string) => {
      return sendMessageMutation.mutateAsync({ content, authorName, authorRank });
    },
    [sendMessageMutation]
  );

  return {
    messages,
    isLoading,
    isConnected,
    onlineUsers,
    sendMessage,
    isSending: sendMessageMutation.isPending,
  };
}
