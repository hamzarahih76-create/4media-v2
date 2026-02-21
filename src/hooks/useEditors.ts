import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Editor {
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

// Editors = team members with production roles (can be assigned to videos)
export const EDITOR_ROLES = ['editor', 'motion_designer', 'colorist'];

// Editor role labels for display
export const EDITOR_ROLE_LABELS: Record<string, string> = {
  editor: 'Video Editor',
  motion_designer: 'Motion Designer',
  colorist: 'Colorist',
};

// Editor status configuration
export const EDITOR_STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-600' },
  active: { label: 'Actif', color: 'bg-green-500/20 text-green-600' },
  inactive: { label: 'Suspendu', color: 'bg-muted text-muted-foreground' },
};

// Get all editors with optional status filter
export function useEditors(statusFilter?: 'pending' | 'active' | 'inactive' | 'all') {
  return useQuery<Editor[]>({
    queryKey: ['editors', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('team_members')
        .select('*')
        .in('role', EDITOR_ROLES)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as Editor[];
    },
  });
}

// Get only active editors (for assignment dropdowns)
export function useActiveEditors() {
  return useQuery<Editor[]>({
    queryKey: ['active-editors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('status', 'active')
        .in('role', EDITOR_ROLES)
        .order('full_name');

      if (error) throw error;
      return (data || []) as Editor[];
    },
  });
}

// Get editors pending validation
export function usePendingEditors() {
  return useQuery<Editor[]>({
    queryKey: ['pending-editors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .in('role', EDITOR_ROLES)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Editor[];
    },
  });
}
