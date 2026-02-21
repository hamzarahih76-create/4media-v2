import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useClients() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription to auto-refresh when client_profiles change
  useEffect(() => {
    const channel = supabase
      .channel('clients-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}