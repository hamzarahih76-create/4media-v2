import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  UserCircle, 
  Mail,
  MoreHorizontal,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Euro,
  Briefcase,
  Eye,
  FileImage,
  CreditCard,
  Building,
  Calendar,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAppMembers, AppMember, APP_MEMBER_ROLE_LABELS } from '@/hooks/useAppMembers';
import { InviteEditorModal } from '@/components/team/InviteEditorModal';
import { EditEditorModal } from '@/components/team/EditEditorModal';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-600', icon: Clock },
  active: { label: 'Actif', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
  inactive: { label: 'Inactif', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

// Role labels for app members (non-editors)
const roleLabels: Record<string, string> = {
  ...APP_MEMBER_ROLE_LABELS,
  copywriter: 'Copywriter',
  project_manager: 'Project Manager',
  admin: 'Admin',
  ceo: 'CEO / Founder',
  accountant: 'Comptable',
};

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AppMember | null>(null);
  const [viewDetailMember, setViewDetailMember] = useState<AppMember | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  // Use app members hook (includes designers, excludes editors)
  const { data: members = [], isLoading } = useAppMembers(statusFilter);

  // Load signed URLs for avatars
  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('editor-documents')
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  };

  const loadAvatarUrl = async (memberId: string, avatarPath: string) => {
    if (avatarUrls[memberId]) return;
    const url = await getSignedUrl(avatarPath);
    if (url) {
      setAvatarUrls(prev => ({ ...prev, [memberId]: url }));
    }
  };

  // Load avatars for all members
  useEffect(() => {
    members.forEach(member => {
      if (member.avatar_url && !avatarUrls[member.id]) {
        loadAvatarUrl(member.id, member.avatar_url);
      }
    });
  }, [members]);

  // Validate member mutation
  const validateMember = useMutation({
    mutationFn: async (member: AppMember) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          validation_status: 'validated',
          admin_validated_at: new Date().toISOString(),
          admin_validated_by: user?.id,
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', member.id);
      if (error) throw error;

      // Send activation email
      const { error: emailError } = await supabase.functions.invoke('send-account-activated-email', {
        body: { email: member.email, full_name: member.full_name },
      });
      if (emailError) {
        console.error('Error sending activation email:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-members'] });
      setViewDetailMember(null);
      toast.success('Membre validé et activé avec succès !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la validation');
    },
  });

  // Reject editor mutation
  const rejectEditor = useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          validation_status: 'rejected',
          notes: reason,
        })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setViewDetailMember(null);
      setShowRejectDialog(false);
      setRejectReason('');
      toast.success('Profil rejeté');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du rejet');
    },
  });

  // Deactivate member state
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateMember, setDeactivateMember] = useState<AppMember | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  // Delete member state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMember, setDeleteMember] = useState<AppMember | null>(null);

  // Deactivate member mutation
  const deactivateMemberMutation = useMutation({
    mutationFn: async ({ memberId, email, fullName, reason }: { memberId: string; email: string; fullName: string; reason: string }) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          status: 'inactive',
          notes: reason,
        })
        .eq('id', memberId);
      if (error) throw error;

      const { error: emailError } = await supabase.functions.invoke('send-account-blocked-email', {
        body: { email, full_name: fullName, reason },
      });
      if (emailError) {
        console.error('Error sending email:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-members'] });
      setShowDeactivateDialog(false);
      setDeactivateMember(null);
      setDeactivateReason('');
      toast.success('Membre désactivé et notifié par email');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la désactivation');
    },
  });

  const handleDeactivateClick = (member: AppMember, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeactivateMember(member);
    setShowDeactivateDialog(true);
  };

  // Delete member mutation - calls Edge Function to delete from Auth + all tables
  const deleteMemberMutation = useMutation({
    mutationFn: async (member: AppMember) => {
      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
        body: { 
          user_id: member.user_id, 
          email: member.email 
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-members'] });
      setShowDeleteDialog(false);
      setDeleteMember(null);
      toast.success('Membre et compte supprimés définitivement');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleDeleteClick = (member: AppMember, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteMember(member);
    setShowDeleteDialog(true);
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = members.filter(m => m.status === 'pending').length;
  const activeCount = members.filter(m => m.status === 'active').length;

  const handleEditMember = (member: AppMember) => {
    setSelectedMember(member);
    setEditModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Équipe</h1>
            <p className="text-muted-foreground">Gérez les membres de votre équipe</p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Inviter un membre
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-sm text-muted-foreground">Total membres</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Membres actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un membre..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="active">Actifs</TabsTrigger>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="inactive">Inactifs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Team Grid - Grouped by role */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="py-12">
            <div className="text-center text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucun membre trouvé</p>
              <p className="text-sm">Invitez votre premier membre d'équipe</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {(() => {
              const adminRoles = ['admin', 'ceo', 'project_manager', 'accountant'];
              const designerRoles = ['designer'];
              const copywriterRoles = ['copywriter'];
              
              const groups = [
                { label: '👑 Administrateurs', members: filteredMembers.filter(m => adminRoles.includes(m.role || '')) },
                { label: '✍️ Copywriters', members: filteredMembers.filter(m => copywriterRoles.includes(m.role || '')) },
                { label: '🎨 Designers', members: filteredMembers.filter(m => designerRoles.includes(m.role || '')) },
                { label: '👥 Autres', members: filteredMembers.filter(m => !adminRoles.includes(m.role || '') && !copywriterRoles.includes(m.role || '') && !designerRoles.includes(m.role || '')) },
              ].filter(g => g.members.length > 0);

              return groups.map(group => (
                <div key={group.label} className="space-y-3">
                  <h2 className="text-lg font-semibold">{group.label}</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {group.members.map((member) => {
                      const statusInfo = statusConfig[member.status as keyof typeof statusConfig];
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <Card 
                          key={member.id} 
                          className="hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => setViewDetailMember(member)}
                        >
                          <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={avatarUrls[member.id]} alt={member.full_name || 'Avatar'} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {member.full_name?.slice(0, 2).toUpperCase() || 'ED'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-base">
                                  {member.full_name || 'Non renseigné'}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">{member.position}</p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditMember(member); }}>
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewDetailMember(member); }}>
                                  Voir profil
                                </DropdownMenuItem>
                                {member.status === 'pending' && (
                                  <DropdownMenuItem 
                                    className="text-success"
                                    onClick={(e) => { e.stopPropagation(); validateMember.mutate(member); }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activer
                                  </DropdownMenuItem>
                                )}
                                {member.validation_status === 'submitted' && member.status !== 'pending' && (
                                  <DropdownMenuItem 
                                    className="text-success"
                                    onClick={(e) => { e.stopPropagation(); validateMember.mutate(member); }}
                                  >
                                    Valider
                                  </DropdownMenuItem>
                                )}
                                {member.status === 'active' && (
                                  <DropdownMenuItem 
                                    className="text-destructive" 
                                    onClick={(e) => handleDeactivateClick(member, e)}
                                  >
                                    Désactiver
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive" 
                                  onClick={(e) => handleDeleteClick(member, e)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              {member.email}
                            </div>
                            
                            {member.rate_per_video && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Euro className="h-4 w-4" />
                                {member.rate_per_video} DH / vidéo
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-4 w-4" />
                              {roleLabels[member.role || 'editor'] || member.role}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-sm text-muted-foreground">{member.department}</span>
                              <Badge className={statusInfo.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Member Detail Dialog */}
      <Dialog open={!!viewDetailMember} onOpenChange={() => setViewDetailMember(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewDetailMember && (
            <>
              <DialogHeader>
                <DialogTitle>Profil du membre</DialogTitle>
                <DialogDescription>
                  Détails et validation du profil
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={avatarUrls[viewDetailMember.id]} 
                      alt={viewDetailMember.full_name || 'Avatar'} 
                    />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {viewDetailMember.full_name?.slice(0, 2).toUpperCase() || 'ED'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{viewDetailMember.full_name}</h3>
                    <p className="text-muted-foreground">{viewDetailMember.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={statusConfig[viewDetailMember.status]?.color}>
                        {statusConfig[viewDetailMember.status]?.label}
                      </Badge>
                      {viewDetailMember.validation_status === 'submitted' && (
                        <Badge variant="secondary">Profil à valider</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Poste
                    </p>
                    <p className="font-medium">{viewDetailMember.position || 'Non spécifié'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" /> Département
                    </p>
                    <p className="font-medium">{viewDetailMember.department || 'Non spécifié'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> IBAN
                    </p>
                    <p className="font-mono text-sm">{viewDetailMember.iban || 'Non renseigné'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Euro className="h-3 w-3" /> Tarif
                    </p>
                    <p className="font-medium">{viewDetailMember.rate_per_video ? `${viewDetailMember.rate_per_video} DH / vidéo` : 'Non défini'}</p>
                  </div>
                  {viewDetailMember.profile_completed_at && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date de soumission du profil
                      </p>
                      <p className="font-medium">
                        {format(new Date(viewDetailMember.profile_completed_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>

                {/* ID Card */}
                {viewDetailMember.id_card_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Carte d'identité
                    </p>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const url = await getSignedUrl(viewDetailMember.id_card_url!);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir la carte d'identité
                    </Button>
                  </div>
                )}

                {/* Reject reason if exists */}
                {viewDetailMember.validation_status === 'rejected' && viewDetailMember.notes && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Raison du rejet
                    </p>
                    <p className="text-sm text-red-700 mt-1">{viewDetailMember.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {viewDetailMember.validation_status === 'submitted' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => validateMember.mutate(viewDetailMember)}
                      disabled={validateMember.isPending}
                    >
                      {validateMember.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Valider et activer
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le profil</DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet. Le membre pourra soumettre à nouveau son profil.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du rejet..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => viewDetailMember && rejectEditor.mutate({ memberId: viewDetailMember.id, reason: rejectReason })}
              disabled={!rejectReason.trim() || rejectEditor.isPending}
            >
              {rejectEditor.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Désactiver le compte
            </DialogTitle>
            <DialogDescription>
              Le membre {deactivateMember?.full_name || deactivateMember?.email} ne pourra plus accéder à la plateforme. Un email de notification lui sera envoyé.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison de la désactivation (facultatif mais recommandé)..."
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivateMember && deactivateMemberMutation.mutate({
                memberId: deactivateMember.id,
                email: deactivateMember.email,
                fullName: deactivateMember.full_name || '',
                reason: deactivateReason,
              })}
              disabled={deactivateMemberMutation.isPending}
            >
              {deactivateMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Désactiver et notifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Supprimer le profil
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le profil de <strong>{deleteMember?.full_name || deleteMember?.email}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMember && deleteMemberMutation.mutate(deleteMember)}
              disabled={deleteMemberMutation.isPending}
            >
              {deleteMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteEditorModal 
        open={inviteModalOpen} 
        onOpenChange={setInviteModalOpen} 
      />
      
      <EditEditorModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        member={selectedMember}
      />
    </DashboardLayout>
  );
}
