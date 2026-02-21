import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EDITOR_ROLES } from './useEditors';

export interface AppMember {
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

// App members = team members who have access to the app (Admin, PM, Accountant, etc.)
// These are NOT editors (production roles)
export const APP_MEMBER_ROLES = ['admin', 'ceo', 'project_manager', 'copywriter', 'accountant', 'designer'];

// App member role labels for display
export const APP_MEMBER_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  ceo: 'CEO / Founder',
  project_manager: 'Project Manager',
  copywriter: 'Copywriter',
  accountant: 'Comptable',
  designer: 'Designer',
};

// Get all app members (non-editors) with optional status filter
export function useAppMembers(statusFilter?: 'pending' | 'active' | 'inactive' | 'all') {
  return useQuery<AppMember[]>({
    queryKey: ['app-members', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      // Exclude editor roles - only get app members
      EDITOR_ROLES.forEach(role => {
        query = query.neq('role', role);
      });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as AppMember[];
    },
  });
}

// Get only active app members
export function useActiveAppMembers() {
  return useQuery<AppMember[]>({
    queryKey: ['active-app-members'],
    queryFn: async () => {
      let query = supabase
        .from('team_members')
        .select('*')
        .eq('status', 'active')
        .order('full_name');

      // Exclude editor roles
      EDITOR_ROLES.forEach(role => {
        query = query.neq('role', role);
      });

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as AppMember[];
    },
  });
}
