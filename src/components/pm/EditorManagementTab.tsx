import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  UserCircle, 
  Mail,
  MoreHorizontal,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Euro,
  Eye,
  FileImage,
  Calendar,
  AlertTriangle,
  UserCheck,
  UserX,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditors, Editor, EDITOR_ROLE_LABELS, EDITOR_STATUS_CONFIG, EDITOR_ROLES } from '@/hooks/useEditors';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EditorManagementTabProps {
  className?: string;
}

export function EditorManagementTab({ className }: EditorManagementTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null);
  const [viewDetailEditor, setViewDetailEditor] = useState<Editor | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [editorToSuspend, setEditorToSuspend] = useState<Editor | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editorToDelete, setEditorToDelete] = useState<Editor | null>(null);
  
  // Add editor modal state
  const [showAddEditorDialog, setShowAddEditorDialog] = useState(false);
  const [newEditorEmail, setNewEditorEmail] = useState('');
  const [newEditorName, setNewEditorName] = useState('');
  const [newEditorRole, setNewEditorRole] = useState('editor');

  const { data: editors = [], isLoading } = useEditors(statusFilter);

  // Load signed URLs for avatars
  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('editor-documents')
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  };

  const loadAvatarUrl = async (editorId: string, avatarPath: string) => {
    if (avatarUrls[editorId]) return;
    const url = await getSignedUrl(avatarPath);
    if (url) {
      setAvatarUrls(prev => ({ ...prev, [editorId]: url }));
    }
  };

  useEffect(() => {
    editors.forEach(editor => {
      if (editor.avatar_url && !avatarUrls[editor.id]) {
        loadAvatarUrl(editor.id, editor.avatar_url);
      }
    });
  }, [editors]);

  // Accept/Validate editor mutation
  const acceptEditor = useMutation({
    mutationFn: async (editor: Editor) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          validation_status: 'validated',
          admin_validated_at: new Date().toISOString(),
          admin_validated_by: user?.id,
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', editor.id);
      if (error) throw error;

      // Send activation email
      const { error: emailError } = await supabase.functions.invoke('send-account-activated-email', {
        body: { email: editor.email, full_name: editor.full_name },
      });
      if (emailError) {
        console.error('Error sending activation email:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      setViewDetailEditor(null);
      toast.success('Éditeur accepté et activé !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'acceptation');
    },
  });

  // Reject editor mutation
  const rejectEditor = useMutation({
    mutationFn: async ({ editorId, reason }: { editorId: string; reason: string }) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          validation_status: 'rejected',
          notes: reason,
        })
        .eq('id', editorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      setViewDetailEditor(null);
      setShowRejectDialog(false);
      setRejectReason('');
      toast.success('Profil rejeté');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du rejet');
    },
  });

  // Suspend editor mutation
  const suspendEditor = useMutation({
    mutationFn: async ({ editorId, email, fullName, reason }: { editorId: string; email: string; fullName: string; reason: string }) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          status: 'inactive',
          notes: reason,
        })
        .eq('id', editorId);
      if (error) throw error;

      // Send blocking email
      const { error: emailError } = await supabase.functions.invoke('send-account-blocked-email', {
        body: { email, full_name: fullName, reason },
      });
      if (emailError) {
        console.error('Error sending email:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      setShowSuspendDialog(false);
      setEditorToSuspend(null);
      setSuspendReason('');
      toast.success('Éditeur suspendu et notifié par email');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suspension');
    },
  });

  // Reactivate editor mutation
  const reactivateEditor = useMutation({
    mutationFn: async (editor: Editor) => {
      const { error } = await supabase
        .from('team_members')
        .update({
          status: 'active',
          notes: null,
        })
        .eq('id', editor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      toast.success('Éditeur réactivé !');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la réactivation');
    },
  });

  // Delete editor mutation (permanent) - uses Edge Function to also delete from auth.users
  const deleteEditor = useMutation({
    mutationFn: async (editor: Editor) => {
      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
        body: { 
          user_id: editor.user_id,
          email: editor.email 
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      setShowDeleteDialog(false);
      setEditorToDelete(null);
      toast.success('Éditeur supprimé définitivement du système (y compris du système d\'authentification)');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  // Add editor mutation
  const addEditorMutation = useMutation({
    mutationFn: async () => {
      const roleLabel = EDITOR_ROLE_LABELS[newEditorRole] || 'Video Editor';
      
      const { error } = await supabase
        .from('team_members')
        .insert({
          email: newEditorEmail,
          full_name: newEditorName || null,
          role: newEditorRole,
          position: roleLabel,
          department: 'Production',
          status: 'pending',
          invited_by: user?.id,
        });
      
      if (error) throw error;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation-email', {
        body: { 
          email: newEditorEmail, 
          full_name: newEditorName || '', 
          role: newEditorRole 
        },
      });
      
      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't throw - editor is already created, just log the email error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      queryClient.invalidateQueries({ queryKey: ['active-editors'] });
      setShowAddEditorDialog(false);
      setNewEditorEmail('');
      setNewEditorName('');
      setNewEditorRole('editor');
      toast.success('Éditeur invité avec succès ! Un email d\'invitation a été envoyé.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'invitation');
    },
  });

  // Show all editors except those with 'incomplete' validation_status who haven't registered yet
  // Editors with 'pending' status but no user_id are newly registered and should be visible
  const visibleEditors = editors.filter(editor => 
    editor.validation_status !== 'incomplete' || editor.user_id !== null
  );

  const filteredEditors = visibleEditors.filter(editor => {
    const matchesSearch = 
      editor.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      editor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      editor.position?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For "pending" filter, only show editors who have submitted their profile
    if (statusFilter === 'pending') {
      return matchesSearch && editor.status === 'pending' && editor.validation_status === 'submitted';
    }
    
    // For other filters, apply the status filter
    if (statusFilter === 'active') {
      return matchesSearch && editor.status === 'active';
    }
    if (statusFilter === 'inactive') {
      return matchesSearch && editor.status === 'inactive';
    }
    
    return matchesSearch;
  });

  // Only count visible editors (those with completed profiles)
  const pendingCount = visibleEditors.filter(e => e.status === 'pending' && e.validation_status === 'submitted').length;
  const activeCount = visibleEditors.filter(e => e.status === 'active').length;
  const inactiveCount = visibleEditors.filter(e => e.status === 'inactive').length;

  const handleSuspendClick = (editor: Editor, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditorToSuspend(editor);
    setShowSuspendDialog(true);
  };

  const handleAddEditorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditorEmail) {
      toast.error('L\'email est requis');
      return;
    }
    addEditorMutation.mutate();
  };

  return (
    <div className={className}>
      {/* Stats */}
      <div className="grid gap-4 grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{visibleEditors.length}</p>
                <p className="text-sm text-muted-foreground">Total éditeurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Suspendus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Add Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un éditeur..." 
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
              <TabsTrigger value="inactive">Suspendus</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={() => setShowAddEditorDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un éditeur
        </Button>
      </div>

      {/* Editor Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEditors.length === 0 ? (
        <Card className="py-12">
          <div className="text-center text-muted-foreground">
            <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Aucun éditeur trouvé</p>
            <p className="text-sm">Les éditeurs s'inscrivent via le formulaire d'onboarding</p>
          </div>
        </Card>
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEditors.map((editor) => {
            const statusInfo = EDITOR_STATUS_CONFIG[editor.status as keyof typeof EDITOR_STATUS_CONFIG];
            const StatusIcon = editor.status === 'active' ? CheckCircle : editor.status === 'pending' ? Clock : XCircle;
            
            return (
              <Card 
                key={editor.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setViewDetailEditor(editor)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatarUrls[editor.id]} alt={editor.full_name || 'Avatar'} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {editor.full_name?.slice(0, 2).toUpperCase() || 'ED'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {editor.full_name || 'Non renseigné'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {EDITOR_ROLE_LABELS[editor.role || 'editor'] || editor.role}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewDetailEditor(editor); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir profil
                      </DropdownMenuItem>
                      
                      {editor.status === 'pending' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-green-600"
                            onClick={(e) => { e.stopPropagation(); acceptEditor.mutate(editor); }}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activer le profil
                          </DropdownMenuItem>
                          {editor.validation_status === 'submitted' && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedEditor(editor);
                                setShowRejectDialog(true); 
                              }}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Refuser
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                      
                      {editor.status === 'active' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={(e) => handleSuspendClick(editor, e)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Suspendre
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {editor.status === 'inactive' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-green-600"
                            onClick={(e) => { e.stopPropagation(); reactivateEditor.mutate(editor); }}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Réactiver
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {/* Delete option available for all statuses */}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditorToDelete(editor);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer du système
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {editor.email}
                  </div>
                  
                  {editor.rate_per_video && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Euro className="h-4 w-4" />
                      {editor.rate_per_video} DH / vidéo
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      {editor.created_at && format(new Date(editor.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
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
      )}

      {/* Editor Detail Dialog */}
      <Dialog open={!!viewDetailEditor} onOpenChange={() => setViewDetailEditor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewDetailEditor && (
            <>
              <DialogHeader>
                <DialogTitle>Profil de l'éditeur</DialogTitle>
                <DialogDescription>
                  Informations complètes et actions disponibles
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrls[viewDetailEditor.id]} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {viewDetailEditor.full_name?.slice(0, 2).toUpperCase() || 'ED'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{viewDetailEditor.full_name || 'Non renseigné'}</h3>
                    <p className="text-muted-foreground">{viewDetailEditor.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={EDITOR_STATUS_CONFIG[viewDetailEditor.status]?.color}>
                        {EDITOR_STATUS_CONFIG[viewDetailEditor.status]?.label}
                      </Badge>
                      <Badge variant="outline">
                        {EDITOR_ROLE_LABELS[viewDetailEditor.role || 'editor'] || viewDetailEditor.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tarif par vidéo</p>
                    <p className="font-medium">{viewDetailEditor.rate_per_video ? `${viewDetailEditor.rate_per_video} DH` : 'Non défini'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Mode de paiement</p>
                    <p className="font-medium">{viewDetailEditor.payment_method || 'Non défini'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">IBAN</p>
                    <p className="font-medium font-mono text-xs">{viewDetailEditor.iban || 'Non renseigné'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date d'inscription</p>
                    <p className="font-medium">
                      {viewDetailEditor.created_at && format(new Date(viewDetailEditor.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                {viewDetailEditor.notes && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{viewDetailEditor.notes}</p>
                  </div>
                )}

                {/* ID Card Preview */}
                {viewDetailEditor.id_card_url && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Pièce d'identité
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="#" 
                        onClick={async (e) => {
                          e.preventDefault();
                          const url = await getSignedUrl(viewDetailEditor.id_card_url!);
                          if (url) window.open(url, '_blank');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir le document
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setViewDetailEditor(null)}>
                  Fermer
                </Button>
                
                {viewDetailEditor.status === 'pending' && viewDetailEditor.validation_status === 'submitted' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedEditor(viewDetailEditor);
                        setShowRejectDialog(true);
                      }}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => acceptEditor.mutate(viewDetailEditor)}
                      disabled={acceptEditor.isPending}
                    >
                      {acceptEditor.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4 mr-2" />
                      )}
                      Accepter
                    </Button>
                  </>
                )}
                
                {viewDetailEditor.status === 'active' && (
                  <Button
                    variant="destructive"
                    onClick={() => handleSuspendClick(viewDetailEditor)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Suspendre
                  </Button>
                )}
                
                {viewDetailEditor.status === 'inactive' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => reactivateEditor.mutate(viewDetailEditor)}
                    disabled={reactivateEditor.isPending}
                  >
                    {reactivateEditor.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Réactiver
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Refuser ce profil
            </DialogTitle>
            <DialogDescription>
              Cette action ne peut pas être annulée. L'éditeur sera notifié du refus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Raison du refus</label>
              <Textarea
                placeholder="Expliquez pourquoi ce profil est refusé..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedEditor) {
                  rejectEditor.mutate({ editorId: selectedEditor.id, reason: rejectReason });
                }
              }}
              disabled={!rejectReason || rejectEditor.isPending}
            >
              {rejectEditor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Suspendre cet éditeur
            </DialogTitle>
            <DialogDescription>
              L'éditeur ne pourra plus accéder à son espace et sera notifié par email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Raison de la suspension</label>
              <Textarea
                placeholder="Expliquez pourquoi cet éditeur est suspendu..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (editorToSuspend) {
                  suspendEditor.mutate({
                    editorId: editorToSuspend.id,
                    email: editorToSuspend.email,
                    fullName: editorToSuspend.full_name || '',
                    reason: suspendReason,
                  });
                }
              }}
              disabled={!suspendReason || suspendEditor.isPending}
            >
              {suspendEditor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer la suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Editor Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Supprimer définitivement cet éditeur
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données associées à cet éditeur seront supprimées du système.
            </DialogDescription>
          </DialogHeader>
          {editorToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrls[editorToDelete.id]} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {editorToDelete.full_name?.slice(0, 2).toUpperCase() || 'ED'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editorToDelete.full_name || 'Non renseigné'}</p>
                  <p className="text-sm text-muted-foreground">{editorToDelete.email}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (editorToDelete) {
                  deleteEditor.mutate(editorToDelete);
                }
              }}
              disabled={deleteEditor.isPending}
            >
              {deleteEditor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Editor Dialog */}
      <Dialog open={showAddEditorDialog} onOpenChange={setShowAddEditorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ajouter un éditeur
            </DialogTitle>
            <DialogDescription>
              Invitez un nouvel éditeur à rejoindre votre équipe de production.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEditorSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editor-email">Email *</Label>
                <Input
                  id="editor-email"
                  type="email"
                  value={newEditorEmail}
                  onChange={(e) => setNewEditorEmail(e.target.value)}
                  placeholder="editeur@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editor-name">Nom complet</Label>
                <Input
                  id="editor-name"
                  value={newEditorName}
                  onChange={(e) => setNewEditorName(e.target.value)}
                  placeholder="Prénom Nom"
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={newEditorRole} onValueChange={setNewEditorRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITOR_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {EDITOR_ROLE_LABELS[role] || role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddEditorDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={addEditorMutation.isPending}>
                {addEditorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Inviter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
