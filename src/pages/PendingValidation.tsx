import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePendingValidation } from '@/components/editor/ProfilePendingValidation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function PendingValidation() {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();

  const { data: teamMember } = useQuery({
    queryKey: ['team-member-pending', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('team_members')
        .select('full_name, avatar_url, email, status, validation_status')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Poll every 5 seconds to detect activation
  });

  // Redirect when status becomes active
  useEffect(() => {
    if (teamMember?.status === 'active') {
      // Redirect based on role
      if (role === 'admin' || role === 'project_manager') {
        navigate('/pm', { replace: true });
      } else {
        navigate('/editor', { replace: true });
      }
    }
  }, [teamMember?.status, role, navigate]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <ProfilePendingValidation
        fullName={teamMember?.full_name || user?.user_metadata?.full_name || 'Membre'}
        avatarUrl={teamMember?.avatar_url}
        email={teamMember?.email || user?.email}
      />
      
      <Button 
        variant="ghost" 
        className="mt-6" 
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Se déconnecter
      </Button>
    </div>
  );
}
