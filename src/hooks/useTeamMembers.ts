import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: string | null;
  position: string | null;
  department: string | null;
  status: 'pending' | 'active' | 'inactive';
  payment_method: string | null;
  iban: string | null;
  rate_per_video: number | null;
  notes: string | null;
  invited_by: string | null;
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  id_card_url: string | null;
  validation_status: string | null;
  profile_completed_at: string | null;
}

export function useTeamMembers(statusFilter?: 'pending' | 'active' | 'inactive' | 'all') {
  return useQuery<TeamMember[]>({
    queryKey: ['team-members', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });
}

// Editors = team members with roles that can be assigned to videos
const EDITOR_ROLES = ['editor', 'motion_designer', 'colorist'];

// Active copywriters
export function useActiveCopywriters() {
  return useQuery<TeamMember[]>({
    queryKey: ['active-copywriters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('status', 'active')
        .eq('role', 'copywriter')
        .order('full_name');
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });
}

export function useActiveEditors() {
  return useQuery<TeamMember[]>({
    queryKey: ['active-editors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('status', 'active')
        .in('role', EDITOR_ROLES)
        .order('full_name');

      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });
}

// All active team members regardless of role
export function useActiveTeamMembers() {
  return useQuery<TeamMember[]>({
    queryKey: ['active-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      return (data || []) as TeamMember[];
    },
  });
}
