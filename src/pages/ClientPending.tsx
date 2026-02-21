import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientPendingValidation } from '@/components/client/ClientPendingValidation';

export default function ClientPending() {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();

  const { data: clientProfile } = useQuery({
    queryKey: ['client-pending-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('client_profiles')
        .select('account_status, company_name, contact_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (clientProfile?.account_status === 'active') {
      navigate('/client', { replace: true });
    }
  }, [clientProfile?.account_status, navigate]);

  return (
    <ClientPendingValidation
      fullName={clientProfile?.contact_name || user?.user_metadata?.full_name || 'Client'}
      avatarUrl={clientProfile?.avatar_url}
      email={user?.email}
      onSignOut={signOut}
    />
  );
}
