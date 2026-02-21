import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useClientRushes(clientUserId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-rushes', clientUserId],
    queryFn: async () => {
      if (!clientUserId) return [];
      const { data, error } = await supabase
        .from('client_rushes')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientUserId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!clientUserId) return;
    const channel = supabase
      .channel(`client-rushes-${clientUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_rushes', filter: `client_user_id=eq.${clientUserId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-rushes', clientUserId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientUserId, queryClient]);

  return query;
}
