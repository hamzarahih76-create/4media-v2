import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PermissionType = 
  | 'access_dashboard'
  | 'manage_projects'
  | 'manage_team' 
  | 'manage_clients'
  | 'view_clients'
  | 'validate_videos'
  | 'manage_payments'
  | 'access_editor'
  | 'access_copywriter';

export interface PermissionConfig {
  key: PermissionType;
  label: string;
  description: string;
  icon: string;
}

export const PERMISSIONS_CONFIG: PermissionConfig[] = [
  {
    key: 'access_dashboard',
    label: 'Dashboard',
    description: 'Accéder au tableau de bord principal',
    icon: 'LayoutDashboard',
  },
  {
    key: 'validate_videos',
    label: 'Gestion Équipe',
    description: 'Gérer les monteurs et valider les livrables',
    icon: 'CheckCircle',
  },
  {
    key: 'manage_clients',
    label: 'Gestion Client',
    description: 'Gérer les clients et leurs informations',
    icon: 'Building',
  },
  {
    key: 'view_clients',
    label: 'Clients',
    description: 'Voir la liste des clients',
    icon: 'Users',
  },
  {
    key: 'manage_team',
    label: 'Staff',
    description: 'Inviter et gérer les membres de l\'équipe',
    icon: 'Users',
  },
  {
    key: 'manage_payments',
    label: 'Paiements',
    description: 'Accéder aux paiements et rapports financiers',
    icon: 'CreditCard',
  },
  {
    key: 'access_editor',
    label: 'Accès éditeur',
    description: 'Accéder à l\'espace éditeur pour gérer ses vidéos',
    icon: 'Video',
  },
];

// Role-based default permissions
export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionType[]> = {
  admin: ['access_dashboard', 'manage_projects', 'manage_team', 'manage_clients', 'view_clients', 'validate_videos', 'manage_payments', 'access_editor'],
  ceo: ['access_dashboard', 'manage_projects', 'manage_team', 'manage_clients', 'view_clients', 'validate_videos', 'manage_payments', 'access_editor'],
  project_manager: ['access_dashboard', 'manage_projects', 'validate_videos', 'manage_team', 'view_clients'],
  editor: ['access_editor'],
  motion_designer: ['access_editor'],
  copywriter: ['access_copywriter'],
  colorist: ['access_editor'],
};

export function useCurrentUserPermissions() {
  const { permissions, isLoading } = useAuth();

  return {
    data: permissions,
    isLoading,
  };
}

export function useUserPermissions(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }

      return (data || []).map(p => p.permission as PermissionType);
    },
    enabled: !!userId,
  });
}

export function useHasPermission(permission: PermissionType) {
  const { permissions, isLoading } = useAuth();

  return {
    hasPermission: permissions.includes(permission),
    isLoading,
  };
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions: PermissionType[] 
    }) => {
      // First, delete all existing permissions for the user
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Then insert new permissions
      if (permissions.length > 0) {
        const permissionRows = permissions.map(permission => ({
          user_id: userId,
          permission,
          granted_by: currentUser?.id,
        }));

        const { error: insertError } = await supabase
          .from('user_permissions')
          .insert(permissionRows);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
    },
  });
}
