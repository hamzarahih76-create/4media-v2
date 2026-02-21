import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DesignerStats {
  id: string;
  user_id: string;
  total_designs_delivered: number;
  total_on_time: number;
  total_late: number;
  total_revisions: number;
  average_rating: number | null;
  streak_days: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useDesignerStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['designer-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('designer_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching designer stats:', error);
        throw error;
      }

      return data as DesignerStats | null;
    },
    enabled: !!user?.id,
  });
}

export function useDesignerProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const { data: teamMember, isLoading: teamMemberLoading } = useQuery({
    queryKey: ['team-member', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'designer')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching team member:', error);
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const isLoading = authLoading || profileLoading || teamMemberLoading;

  // Designer needs to complete profile if:
  // 1. They have no team_member entry OR
  // 2. Their status is 'incomplete'
  const needsProfileCompletion = !teamMember || teamMember.status === 'incomplete';

  // Designer is awaiting validation if status is 'submitted' or 'pending' (but not incomplete)
  const isAwaitingValidation = teamMember && 
    (teamMember.status === 'submitted' || 
     (teamMember.status === 'pending' && teamMember.validation_status === 'pending'));

  const isActivated = teamMember?.status === 'active';

  return {
    profile,
    teamMember,
    needsProfileCompletion,
    isAwaitingValidation,
    isActivated,
    isLoading,
  };
}
