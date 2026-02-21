import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  FileImage,
  Loader2,
  User,
  Building,
  Briefcase,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface PendingEditor {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  position: string | null;
  iban: string | null;
  avatar_url: string | null;
  id_card_url: string | null;
  profile_completed_at: string | null;
  notes: string | null;
  validation_status: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
}

export default function AdminEditorValidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEditor, setSelectedEditor] = useState<PendingEditor | null>(null);
  const [viewIdCard, setViewIdCard] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch all team members with different validation statuses
  const { data: editors, isLoading } = useQuery({
    queryKey: ['admin-editors-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('profile_completed_at', { ascending: false });

      if (error) throw error;
      return data as PendingEditor[];
    },
  });

  const pendingEditors = editors?.filter(e => e.validation_status === 'submitted') || [];
  const validatedEditors = editors?.filter(e => e.validation_status === 'validated') || [];
  const rejectedEditors = editors?.filter(e => e.validation_status === 'rejected') || [];

  // Validate editor mutation
  const validateEditor = useMutation({
    mutationFn: async (editor: PendingEditor) => {
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

      // Envoyer l'email de félicitations
      try {
        const { error: emailError } = await supabase.functions.invoke('send-account-activated-email', {
          body: {
            email: editor.email,
            full_name: editor.full_name || 'Éditeur',
          },
        });
        
        if (emailError) {
          console.error('Erreur envoi email activation:', emailError);
        }
      } catch (emailErr) {
        console.error('Erreur envoi email activation:', emailErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-editors-validation'] });
      setSelectedEditor(null);
      toast.success('Éditeur validé et activé avec succès ! Email de bienvenue envoyé.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la validation');
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
      queryClient.invalidateQueries({ queryKey: ['admin-editors-validation'] });
      setSelectedEditor(null);
      setShowRejectDialog(false);
      setRejectReason('');
      toast.success('Profil rejeté');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du rejet');
    },
  });

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('editor-documents')
      .createSignedUrl(path, 3600); // 1 hour validity

    if (error) {
      toast.error('Impossible de charger le document');
      return null;
    }
    return data.signedUrl;
  };

  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  // Load signed URLs for avatars
  const loadAvatarUrl = async (editorId: string, avatarPath: string) => {
    if (avatarUrls[editorId]) return;
    const url = await getSignedUrl(avatarPath);
    if (url) {
      setAvatarUrls(prev => ({ ...prev, [editorId]: url }));
    }
  };

  const EditorCard = ({ editor, showActions = false }: { editor: PendingEditor; showActions?: boolean }) => {
    // Load avatar URL when component mounts
    if (editor.avatar_url && !avatarUrls[editor.id]) {
      loadAvatarUrl(editor.id, editor.avatar_url);
    }
    
    return (
      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setSelectedEditor(editor)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrls[editor.id]} alt={editor.full_name || 'Avatar'} />
              <AvatarFallback>
                {editor.full_name?.slice(0, 2).toUpperCase() || 'ED'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{editor.full_name || 'Sans nom'}</h3>
                <Badge variant={
                  editor.validation_status === 'validated' ? 'default' :
                  editor.validation_status === 'rejected' ? 'destructive' : 'secondary'
                }>
                  {editor.validation_status === 'validated' ? 'Validé' :
                   editor.validation_status === 'rejected' ? 'Rejeté' : 'En attente'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{editor.email}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{editor.position || 'Non spécifié'}</span>
                {editor.profile_completed_at && (
                  <>
                    <span>•</span>
                    <span>Soumis le {format(new Date(editor.profile_completed_at), 'd MMM yyyy', { locale: fr })}</span>
                  </>
                )}
              </div>
            </div>
            {showActions && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedEditor(editor); }}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Validation des éditeurs</h1>
          <p className="text-muted-foreground">
            Vérifiez et validez les profils des nouveaux éditeurs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingEditors.length}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validatedEditors.length}</p>
                <p className="text-sm text-muted-foreground">Validés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedEditors.length}</p>
                <p className="text-sm text-muted-foreground">Rejetés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              En attente ({pendingEditors.length})
            </TabsTrigger>
            <TabsTrigger value="validated" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Validés ({validatedEditors.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejetés ({rejectedEditors.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingEditors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="font-medium">Aucun profil en attente</h3>
                  <p className="text-sm text-muted-foreground">
                    Tous les profils ont été traités
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingEditors.map(editor => (
                  <EditorCard key={editor.id} editor={editor} showActions />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="validated" className="mt-4">
            {validatedEditors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucun éditeur validé
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {validatedEditors.map(editor => (
                  <EditorCard key={editor.id} editor={editor} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {rejectedEditors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucun éditeur rejeté
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedEditors.map(editor => (
                  <EditorCard key={editor.id} editor={editor} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Editor Detail Dialog */}
      <Dialog open={!!selectedEditor} onOpenChange={() => setSelectedEditor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEditor && (
            <>
              <DialogHeader>
                <DialogTitle>Profil de l'éditeur</DialogTitle>
                <DialogDescription>
                  Vérifiez les informations avant de valider
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={selectedEditor.avatar_url ? avatarUrls[selectedEditor.id] : undefined} 
                      alt={selectedEditor.full_name || 'Avatar'} 
                    />
                    <AvatarFallback className="text-lg">
                      {selectedEditor.full_name?.slice(0, 2).toUpperCase() || 'ED'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedEditor.full_name}</h3>
                    <p className="text-muted-foreground">{selectedEditor.email}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Poste
                    </p>
                    <p className="font-medium">{selectedEditor.position || 'Non spécifié'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" /> Département
                    </p>
                    <p className="font-medium">{selectedEditor.department || 'Non spécifié'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> IBAN
                    </p>
                    <p className="font-mono text-sm">{selectedEditor.iban || 'Non renseigné'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date de soumission
                    </p>
                    <p className="font-medium">
                      {selectedEditor.profile_completed_at
                        ? format(new Date(selectedEditor.profile_completed_at), 'd MMMM yyyy à HH:mm', { locale: fr })
                        : 'Inconnue'}
                    </p>
                  </div>
                </div>

                {/* ID Card */}
                {selectedEditor.id_card_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Carte d'identité
                    </p>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const url = await getSignedUrl(selectedEditor.id_card_url!);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir la carte d'identité
                    </Button>
                  </div>
                )}

                {/* Actions */}
                {selectedEditor.validation_status === 'submitted' && (
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
                      onClick={() => validateEditor.mutate(selectedEditor)}
                      disabled={validateEditor.isPending}
                    >
                      {validateEditor.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Valider et activer
                    </Button>
                  </div>
                )}

                {selectedEditor.validation_status === 'rejected' && selectedEditor.notes && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Raison du rejet
                    </p>
                    <p className="text-sm text-red-700 mt-1">{selectedEditor.notes}</p>
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
              Indiquez la raison du rejet. L'éditeur pourra soumettre à nouveau son profil.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du rejet..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedEditor && rejectEditor.mutate({
                editorId: selectedEditor.id,
                reason: rejectReason,
              })}
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
    </DashboardLayout>
  );
}
