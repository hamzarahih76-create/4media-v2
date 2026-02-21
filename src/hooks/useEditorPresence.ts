import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EditorPresence {
  user_id: string;
  name: string;
  online_at: string;
}

export function useEditorPresence() {
  const { user } = useAuth();
  const [onlineEditors, setOnlineEditors] = useState<Map<string, EditorPresence>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('editors-presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const editors = new Map<string, EditorPresence>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id && !editors.has(presence.user_id)) {
              editors.set(presence.user_id, {
                user_id: presence.user_id,
                name: presence.name || 'Unknown',
                online_at: presence.online_at,
              });
            }
          });
        });
        
        setOnlineEditors(editors);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Editor joined:', newPresences);
        setOnlineEditors(prev => {
          const updated = new Map(prev);
          newPresences.forEach((presence: any) => {
            if (presence.user_id) {
              updated.set(presence.user_id, {
                user_id: presence.user_id,
                name: presence.name || 'Unknown',
                online_at: presence.online_at,
              });
            }
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Editor left:', leftPresences);
        setOnlineEditors(prev => {
          const updated = new Map(prev);
          leftPresences.forEach((presence: any) => {
            if (presence.user_id) {
              updated.delete(presence.user_id);
            }
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();

          await presenceChannel.track({
            user_id: user.id,
            name: profile?.full_name || user.email?.split('@')[0] || 'Unknown',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const isOnline = (userId: string): boolean => {
    return onlineEditors.has(userId);
  };

  const getOnlineCount = (): number => {
    return onlineEditors.size;
  };

  return {
    onlineEditors,
    isOnline,
    getOnlineCount,
    isConnected,
  };
}
