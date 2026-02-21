import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EditorProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamMemberRecord {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: string | null;
  status: string;
  department: string | null;
  position: string | null;
  activated_at: string | null;
  iban: string | null;
  avatar_url: string | null;
  id_card_url: string | null;
  profile_completed_at: string | null;
  admin_validated_at: string | null;
  validation_status: string | null;
}

export function useEditorProfile() {
  const { user } = useAuth();

  // Fetch the profile from profiles table
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['editor-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EditorProfile | null;
    },
    enabled: !!user?.id,
  });

  // Fetch the team member record (for activation status)
  const { data: teamMember, isLoading: teamMemberLoading } = useQuery({
    queryKey: ['editor-team-member', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as TeamMemberRecord | null;
    },
    enabled: !!user?.email,
  });

  // Profile is complete if all required fields are filled AND submitted for validation
  const isProfileComplete = !!(
    teamMember?.full_name &&
    teamMember?.iban &&
    teamMember?.avatar_url &&
    teamMember?.id_card_url &&
    teamMember?.profile_completed_at
  );

  // Check if profile is submitted and waiting for admin validation
  const isAwaitingValidation = teamMember?.validation_status === 'submitted';

  // Check if editor is validated by admin
  const isValidated = teamMember?.validation_status === 'validated';

  // Check if editor is activated (status = 'active' AND validated)
  const isActivated = teamMember?.status === 'active' && isValidated;

  // Check if there's a pending invitation
  const hasPendingInvitation = teamMember?.status === 'pending';

  // Needs to complete profile:
  // - If no teamMember exists yet (new signup, trigger may not have run yet)
  // - Or if profile is not complete and not awaiting validation or validated
  const needsProfileCompletion = !teamMember || (!isProfileComplete && !isAwaitingValidation && !isValidated);

  return {
    profile,
    teamMember,
    isProfileComplete,
    isAwaitingValidation,
    isValidated,
    isActivated,
    hasPendingInvitation,
    needsProfileCompletion,
    isLoading: profileLoading || teamMemberLoading,
  };
}

export function useCompleteEditorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      fullName: string; 
      department?: string; 
      position?: string;
    }) => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated');

      // 1. Update the profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // 2. Link user to team_member and activate them
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .update({
          user_id: user.id,
          full_name: data.fullName,
          department: data.department || 'Production',
          position: data.position || 'Video Editor',
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('email', user.email)
        .select()
        .single();

      if (teamError && teamError.code !== 'PGRST116') {
        console.warn('No pending invitation found, creating new team member record');
        // If no existing invitation, create a new team member record
        const { error: insertError } = await supabase
          .from('team_members')
          .insert({
            email: user.email,
            user_id: user.id,
            full_name: data.fullName,
            department: data.department || 'Production',
            position: data.position || 'Video Editor',
            role: 'editor',
            status: 'active',
            activated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      return teamMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editor-profile'] });
      queryClient.invalidateQueries({ queryKey: ['editor-team-member'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
    },
  });
}

export function useEditorStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['editor-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('editor_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
