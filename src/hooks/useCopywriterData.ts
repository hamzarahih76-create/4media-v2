import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCopywriterTasks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['copywriter-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('copywriter_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useCopywriterClients() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['copywriter-clients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get clients assigned to this copywriter via client_profiles.copywriter_id
      const { data: profiles, error: profilesError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('copywriter_id', user.id);
      
      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get tasks for these clients
      const clientUserIds = profiles.map(p => p.user_id);
      const { data: tasks } = await supabase
        .from('tasks')
        .select('client_user_id, client_name, project_name, title, status, id')
        .in('client_user_id', clientUserIds);
      
      return profiles.map(profile => ({
        ...profile,
        tasks: (tasks || []).filter(t => t.client_user_id === profile.user_id),
        projectCount: new Set((tasks || []).filter(t => t.client_user_id === profile.user_id).map(t => t.id)).size,
      }));
    },
    enabled: !!user?.id,
  });
}

export function useCopywriterClientContent(clientUserId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['copywriter-client-content', clientUserId],
    queryFn: async () => {
      if (!clientUserId) return [];
      const { data, error } = await supabase
        .from('client_content_items')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientUserId && !!user?.id,
  });
}

export function useCopywriterProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['copywriter-team-member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
