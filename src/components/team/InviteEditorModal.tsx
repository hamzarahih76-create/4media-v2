import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, Copy, Check, Key, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionsCheckbox } from './PermissionsCheckbox';
import { PermissionType, ROLE_DEFAULT_PERMISSIONS } from '@/hooks/usePermissions';

interface InviteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreatedAccountInfo {
  email: string;
  password: string;
  fullName: string;
}

const ROLES = [
  { value: 'editor', label: 'Video Editor' },
  { value: 'motion_designer', label: 'Motion Designer' },
  { value: 'colorist', label: 'Colorist' },
  { value: 'copywriter', label: 'Copywriter' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'ceo', label: 'CEO / Founder' },
];

const DEPARTMENTS = [
  { value: 'Production', label: 'Production' },
  { value: 'Creative', label: 'Creative' },
  { value: 'Post-Production', label: 'Post-Production' },
  { value: 'Management', label: 'Management' },
  { value: 'Client Success', label: 'Client Success' },
];

export function InviteEditorModal({ open, onOpenChange }: InviteEditorModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('editor');
  const [position, setPosition] = useState('Video Editor');
  const [department, setDepartment] = useState('Production');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>(
    () => ROLE_DEFAULT_PERMISSIONS['editor'] || ['access_editor']
  );
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  // Track the previous role to avoid unnecessary updates
  const previousRoleRef = useRef(role);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-team-member-account', {
        body: { 
          email, 
          full_name: fullName || '', 
          role,
          department,
          invited_by: user?.id,
          permissions: selectedPermissions,
        },
      });
      
      // Handle edge function errors (including 4xx responses)
      if (error) {
        // Try to get detailed error from the response context
        const errorContext = error.context;
        if (errorContext && typeof errorContext === 'object') {
          const body = await errorContext.json?.() || errorContext;
          if (body?.error) {
            throw { message: body.error, code: body.code };
          }
        }
        throw { message: error.message };
      }
      
      // Check if data contains an error (shouldn't happen with proper status codes)
      if (data?.error) {
        throw { message: data.error, code: data.code };
      }
      
      return data;
    },
    onSuccess: (data) => {
      setCreatedAccount({
        email: data.email,
        password: data.temporary_password,
        fullName: fullName || email,
      });
      toast.success('Compte créé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      queryClient.invalidateQueries({ queryKey: ['app-members'] });
      queryClient.invalidateQueries({ queryKey: ['active-app-members'] });
    },
    onError: (error: any) => {
      console.error('Invite error:', error);
      const errorMessage = error?.message || error?.error || '';
      const errorCode = error?.code || '';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorCode === 'email_exists') {
        toast.error('Cet email est déjà utilisé. L\'utilisateur doit utiliser "Mot de passe oublié" pour réinitialiser son mot de passe.');
      } else {
        toast.error(errorMessage || 'Erreur lors de la création du compte');
      }
    },
  });

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setRole('editor');
    setPosition('Video Editor');
    setDepartment('Production');
    setSelectedPermissions(ROLE_DEFAULT_PERMISSIONS['editor'] || ['access_editor']);
    setCreatedAccount(null);
    setCopiedPassword(false);
    previousRoleRef.current = 'editor';
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after modal animation
    setTimeout(resetForm, 300);
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    
    // Auto-update position based on role
    const roleLabel = ROLES.find(r => r.value === newRole)?.label || 'Video Editor';
    setPosition(roleLabel);
    
    // Auto-update department based on role
    if (['admin', 'ceo', 'project_manager'].includes(newRole)) {
      setDepartment('Management');
    } else if (['editor', 'motion_designer', 'colorist'].includes(newRole)) {
      setDepartment('Production');
    } else if (newRole === 'copywriter') {
      setDepartment('Creative');
    }
    
    // Update permissions based on new role (only if role actually changed)
    if (newRole !== previousRoleRef.current) {
      const defaultPerms = ROLE_DEFAULT_PERMISSIONS[newRole] || ['access_editor'];
      setSelectedPermissions(defaultPerms);
      previousRoleRef.current = newRole;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('L\'email est requis');
      return;
    }
    inviteMutation.mutate();
  };

  const copyPassword = async () => {
    if (createdAccount?.password) {
      await navigator.clipboard.writeText(createdAccount.password);
      setCopiedPassword(true);
      toast.success('Mot de passe copié !');
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const copyAllCredentials = async () => {
    if (createdAccount) {
      const text = `Email: ${createdAccount.email}\nMot de passe: ${createdAccount.password}`;
      await navigator.clipboard.writeText(text);
      toast.success('Identifiants copiés !');
    }
  };

  // Show success screen with credentials
  if (createdAccount) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Compte créé avec succès !
            </DialogTitle>
            <DialogDescription>
              Voici les identifiants de connexion pour {createdAccount.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={createdAccount.email} 
                  readOnly 
                  className="bg-muted font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Key className="h-4 w-4" />
                Mot de passe temporaire
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={createdAccount.password} 
                  readOnly 
                  className="bg-warning/10 border-warning font-mono text-lg font-bold tracking-wider"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={copyPassword}
                >
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
              <p className="text-sm text-warning-foreground">
                ⚠️ <strong>Important :</strong> Ces identifiants ont aussi été envoyés par email au membre. 
                Recommandez-lui de changer son mot de passe dès sa première connexion.
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={copyAllCredentials}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier tout
            </Button>
            <Button 
              type="button" 
              onClick={handleClose}
              className="flex-1"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter un membre
          </DialogTitle>
          <DialogDescription>
            Créez un compte pour le nouveau membre. Un mot de passe sera généré automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="membre@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Prénom Nom"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rôle *</Label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Département</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="border-t pt-4">
            <PermissionsCheckbox
              selectedPermissions={selectedPermissions}
              onPermissionsChange={setSelectedPermissions}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le compte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
