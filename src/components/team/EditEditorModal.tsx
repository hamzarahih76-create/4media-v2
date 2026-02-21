import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionsCheckbox } from './PermissionsCheckbox';
import { PermissionType, useUserPermissions, useUpdateUserPermissions, ROLE_DEFAULT_PERMISSIONS } from '@/hooks/usePermissions';

interface TeamMember {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: string | null;
  position: string | null;
  department: string | null;
  status: string;
  payment_method: string | null;
  iban: string | null;
  rate_per_video: number | null;
  notes: string | null;
}

interface EditEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}

const ROLES = [
  { value: 'editor', label: 'Video Editor' },
  { value: 'motion_designer', label: 'Motion Designer' },
  { value: 'colorist', label: 'Colorist' },
  { value: 'designer', label: 'Designer' },
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

export function EditEditorModal({ open, onOpenChange, member }: EditEditorModalProps) {
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [department, setDepartment] = useState('Production');
  const [status, setStatus] = useState<'pending' | 'active' | 'inactive'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [iban, setIban] = useState('');
  const [ratePerVideo, setRatePerVideo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);
  
  const hasInitialized = useRef(false);

  // Fetch existing permissions for this user
  const { data: existingPermissions = [], isLoading: permissionsLoading } = useUserPermissions(member?.user_id);
  const updatePermissions = useUpdateUserPermissions();

  // Initialize form when member changes
  useEffect(() => {
    if (member && open) {
      setFullName(member.full_name || '');
      setEmail(member.email);
      setRole(member.role || 'editor');
      setDepartment(member.department || 'Production');
      setStatus(member.status as 'pending' | 'active' | 'inactive');
      setPaymentMethod(member.payment_method || '');
      setIban(member.iban || '');
      setRatePerVideo(member.rate_per_video?.toString() || '');
      setNotes(member.notes || '');
      hasInitialized.current = false;
    }
  }, [member, open]);

  // Update selected permissions when existing permissions are loaded
  useEffect(() => {
    if (!hasInitialized.current && open && !permissionsLoading) {
      if (existingPermissions.length > 0) {
        setSelectedPermissions([...existingPermissions]);
      } else if (member?.role && !member?.user_id) {
        // Only use defaults if user has no account yet (no user_id = no permissions in DB)
        const defaultPerms = ROLE_DEFAULT_PERMISSIONS[member.role] || ['access_editor'];
        setSelectedPermissions(defaultPerms);
      } else {
        setSelectedPermissions([]);
      }
      hasInitialized.current = true;
    }
  }, [existingPermissions, permissionsLoading, member?.role, member?.user_id, open]);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!member) return;
      
      const roleLabel = ROLES.find(r => r.value === role)?.label || 'Video Editor';
      
      const updateData: Record<string, unknown> = {
        full_name: fullName || null,
        email,
        role,
        position: roleLabel,
        department,
        status,
        payment_method: paymentMethod || null,
        iban: iban || null,
        rate_per_video: ratePerVideo ? parseFloat(ratePerVideo) : null,
        notes: notes || null,
      };

      // Set activated_at when status changes to active
      if (status === 'active' && member.status !== 'active') {
        updateData.activated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('team_members')
        .update(updateData)
        .eq('id', member.id);
      
      if (error) throw error;

      // Update permissions if user has a user_id
      if (member.user_id) {
        await updatePermissions.mutateAsync({
          userId: member.user_id,
          permissions: selectedPermissions,
        });
      }
    },
    onSuccess: () => {
      toast.success('Membre mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      if (member?.user_id) {
        queryClient.invalidateQueries({ queryKey: ['user-permissions', member.user_id] });
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('L\'email est requis');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Modifier le membre
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations et les permissions du membre.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Prénom Nom"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(newRole) => {
                setRole(newRole);
                // Auto-apply default permissions for the new role
                const defaultPerms = ROLE_DEFAULT_PERMISSIONS[newRole] || ['access_editor'];
                setSelectedPermissions(defaultPerms.filter(p => p !== 'access_dashboard'));
              }}>
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

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permissions Section */}
          <div className="border-t pt-4">
            <PermissionsCheckbox
              selectedPermissions={selectedPermissions}
              onPermissionsChange={setSelectedPermissions}
              disabled={!member?.user_id}
            />
            {!member?.user_id && (
              <p className="text-xs text-muted-foreground mt-2">
                Les permissions seront activées une fois que le membre aura créé son compte.
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Informations de paiement</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Méthode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iban">IBAN</SelectItem>
                    <SelectItem value="rib">RIB</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate">Tarif par vidéo (€)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={ratePerVideo}
                  onChange={(e) => setRatePerVideo(e.target.value)}
                  placeholder="50.00"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="iban">IBAN / RIB</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="FR76 XXXX XXXX XXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
