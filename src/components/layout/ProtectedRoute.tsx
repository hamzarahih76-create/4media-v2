import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PermissionType } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiredPermission?: PermissionType;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  requiredPermission,
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const { user, role, permissions, isLoading, isRoleLoading } = useAuth();

  // Show loading state while checking auth OR while role is still loading
  if (isLoading || (user && isRoleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // If role is still null after loading (trigger may not have run yet),
  // check user metadata as fallback
  const effectiveRole = role || (user.user_metadata?.role as AppRole) || null;

  // NO admin bypass — all users must have explicit permissions granted in user_permissions table

  // Role-based access control (for role-gated routes like /designer, /client, /copywriter)
  if (allowedRoles && allowedRoles.length > 0 && effectiveRole) {
    if (!allowedRoles.includes(effectiveRole)) {
      // Redirect based on actual role
      if (effectiveRole === 'editor') {
        return <Navigate to="/editor" replace />;
      }
      if (effectiveRole === 'designer') {
        return <Navigate to="/designer" replace />;
      }
      if (effectiveRole === 'copywriter') {
        return <Navigate to="/copywriter" replace />;
      }
      // Fallback: find first allowed route from permissions
      if (permissions.includes('access_dashboard')) {
        return <Navigate to="/dashboard" replace />;
      }
      if (permissions.includes('validate_videos')) {
        return <Navigate to="/pm" replace />;
      }
      return <Navigate to="/pending-validation" replace />;
    }
  }

  // Permission-based access control — strictly enforced for ALL users including admins
  if (requiredPermission) {
    // Special case: editors automatically have access_editor permission
    const hasEditorAccess = effectiveRole === 'editor' && requiredPermission === 'access_editor';
    
    if (!permissions.includes(requiredPermission) && !hasEditorAccess) {
      // Find the first allowed route based on permissions or role
      if (effectiveRole === 'editor') {
        return <Navigate to="/editor" replace />;
      }
      if (effectiveRole === 'designer') {
        return <Navigate to="/designer" replace />;
      }
      if (effectiveRole === 'copywriter') {
        return <Navigate to="/copywriter" replace />;
      }
      if (permissions.includes('access_editor')) {
        return <Navigate to="/editor" replace />;
      }
      if (permissions.includes('validate_videos')) {
        return <Navigate to="/pm" replace />;
      }
      if (permissions.includes('access_dashboard')) {
        return <Navigate to="/dashboard" replace />;
      }
      // No valid permission found — never redirect authenticated users to /auth (causes loop)
      return <Navigate to="/pending-validation" replace />;
    }
  }

  return <>{children}</>;
}

// Component to redirect authenticated users based on their role and permissions
export function RoleBasedRedirect() {
  const { user, role, permissions, isLoading, isRoleLoading } = useAuth();

  // Check if user is a pending team member (for PM and editor roles)
  const { data: teamMember, isLoading: isLoadingTeamMember } = useQuery({
    queryKey: ['team-member-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('team_members')
        .select('status, validation_status')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Check if user is a pending client
  const { data: clientProfile, isLoading: isLoadingClientProfile } = useQuery({
    queryKey: ['client-account-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('client_profiles')
        .select('account_status')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && (role === 'client' || user?.user_metadata?.role === 'client'),
    retry: false,
  });

  if (isLoading || isLoadingTeamMember || isLoadingClientProfile || (user && isRoleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirection...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Use metadata as fallback if role not yet in DB
  const effectiveRole = role || (user.user_metadata?.role as AppRole) || null;

  // If no role found at all, redirect to pending validation to avoid loops
  if (!effectiveRole) {
    return <Navigate to="/pending-validation" replace />;
  }

  // Editors should always go to /editor (where profile completion modal appears)
  if (effectiveRole === 'editor') {
    return <Navigate to="/editor" replace />;
  }

  // Designers should always go to /designer
  if (effectiveRole === 'designer') {
    return <Navigate to="/designer" replace />;
  }

  // Copywriters should always go to /copywriter
  if (effectiveRole === 'copywriter') {
    return <Navigate to="/copywriter" replace />;
  }

  // Clients: check account_status
  if (effectiveRole === 'client') {
    if (clientProfile?.account_status === 'pending') {
      return <Navigate to="/client-pending" replace />;
    }
    return <Navigate to="/client" replace />;
  }

  // Check if project_manager is pending validation
  if (effectiveRole === 'project_manager' && teamMember) {
    if (teamMember.status === 'pending' || teamMember.validation_status === 'pending') {
      return <Navigate to="/pending-validation" replace />;
    }
  }

  // Admins: redirect based on their actual permissions, not hardcoded to /pm
  if (effectiveRole === 'admin') {
    if (permissions.includes('validate_videos')) {
      return <Navigate to="/pm" replace />;
    }
    if (permissions.includes('access_dashboard')) {
      return <Navigate to="/dashboard" replace />;
    }
    if (permissions.includes('manage_clients')) {
      return <Navigate to="/client-management" replace />;
    }
    if (permissions.includes('view_clients')) {
      return <Navigate to="/clients" replace />;
    }
    if (permissions.includes('manage_team')) {
      return <Navigate to="/team" replace />;
    }
    if (permissions.includes('manage_payments')) {
      return <Navigate to="/payments" replace />;
    }
    if (permissions.includes('access_editor')) {
      return <Navigate to="/editor" replace />;
    }
    // Admin with no usable permissions
    return <Navigate to="/pending-validation" replace />;
  }

  // Redirect based on permissions
  if (permissions.includes('validate_videos')) {
    return <Navigate to="/pm" replace />;
  }
  if (permissions.includes('access_dashboard')) {
    return <Navigate to="/dashboard" replace />;
  }
  if (permissions.includes('access_editor')) {
    return <Navigate to="/editor" replace />;
  }

  // Fallback based on role
  switch (effectiveRole) {
    case 'project_manager':
      return <Navigate to="/pm" replace />;
    default:
      return <Navigate to="/pending-validation" replace />;
  }
}
