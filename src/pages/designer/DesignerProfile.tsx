import { useState, useEffect, useRef } from 'react';
import { DesignerLayout } from '@/components/layout/DesignerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useDesignerProfile, useDesignerStats } from '@/hooks/useDesignerProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Star, TrendingUp, Calendar, Edit, Loader2, Camera, Save, X, Upload, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function DesignerProfile() {
  const { user } = useAuth();
  const { profile, teamMember, isLoading } = useDesignerProfile();
  const { data: stats } = useDesignerStats();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingIdCard, setIsUploadingIdCard] = useState(false);
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [iban, setIban] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    if (teamMember) {
      setFullName(teamMember.full_name || '');
      setIban(teamMember.iban || '');
      setPaymentMethod(teamMember.payment_method || '');
    }
  }, [teamMember]);

  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (teamMember?.avatar_url) {
        const { data, error } = await supabase.storage
          .from('editor-documents')
          .createSignedUrl(teamMember.avatar_url, 3600);
        if (!error && data) {
          setAvatarUrl(data.signedUrl);
        }
      }
    };
    loadAvatarUrl();
  }, [teamMember?.avatar_url]);

  useEffect(() => {
    const loadIdCardUrl = async () => {
      if (teamMember?.id_card_url) {
        const { data, error } = await supabase.storage
          .from('editor-documents')
          .createSignedUrl(teamMember.id_card_url, 3600);
        if (!error && data) {
          setIdCardUrl(data.signedUrl);
        }
      }
    };
    loadIdCardUrl();
  }, [teamMember?.id_card_url]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !teamMember?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('editor-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('team_members')
        .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh signed URL
      const { data } = await supabase.storage
        .from('editor-documents')
        .createSignedUrl(filePath, 3600);
      if (data) setAvatarUrl(data.signedUrl);

      queryClient.invalidateQueries({ queryKey: ['team-member'] });
      toast.success('Photo de profil mise à jour !');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error('Erreur lors de l\'upload de la photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !teamMember?.id) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner une image ou un PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }

    setIsUploadingIdCard(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/id-card.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('editor-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('team_members')
        .update({ id_card_url: filePath, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { data } = await supabase.storage
        .from('editor-documents')
        .createSignedUrl(filePath, 3600);
      if (data) setIdCardUrl(data.signedUrl);

      queryClient.invalidateQueries({ queryKey: ['team-member'] });
      toast.success('Carte d\'identité mise à jour !');
    } catch (err: any) {
      console.error('ID card upload error:', err);
      toast.error('Erreur lors de l\'upload de la carte d\'identité');
    } finally {
      setIsUploadingIdCard(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Utilisateur non connecté');
      return;
    }
    setIsSaving(true);
    try {
      console.log('Saving profile for user_id:', user.id);
      console.log('Team member:', teamMember?.id, teamMember?.user_id);
      
      // Update team_members
      const { error: tmError, data: tmData } = await supabase
        .from('team_members')
        .update({
          full_name: fullName.trim() || teamMember?.full_name,
          iban: iban.trim() || teamMember?.iban,
          payment_method: paymentMethod || teamMember?.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      console.log('Team members update result:', { error: tmError, data: tmData });
      if (tmError) throw tmError;

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (profileError) console.warn('Profile update warning:', profileError);

      queryClient.invalidateQueries({ queryKey: ['team-member'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès !');
    } catch (err: any) {
      console.error('Save error details:', JSON.stringify(err));
      toast.error(`Erreur: ${err.message || 'Erreur lors de la sauvegarde'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DesignerLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DesignerLayout>
    );
  }

  const designerName = teamMember?.full_name || profile?.full_name || 'Designer';
  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })
    : 'Inconnu';

  const totalDesigns = stats?.total_designs_delivered || 0;
  const onTimeRate = totalDesigns > 0 
    ? Math.round((stats?.total_on_time || 0) / totalDesigns * 100) 
    : 100;
  const avgRating = stats?.average_rating ? Number(stats.average_rating) : 5;

  return (
    <DesignerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setFullName(teamMember?.full_name || '');
                setIban(teamMember?.iban || '');
                setPaymentMethod(teamMember?.payment_method || '');
              }}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={avatarUrl || ''} />
                  <AvatarFallback className="bg-accent/10 text-accent text-3xl">
                    {designerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Votre nom complet"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold">{designerName}</h2>
                )}
                <p className="text-muted-foreground mt-1">{user?.email}</p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                    <Palette className="h-3 w-3 mr-1" />
                    Designer
                  </Badge>
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Membre depuis {memberSince}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Designs livrés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalDesigns}</div>
              <p className="text-xs text-muted-foreground">Total carrière</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Note qualité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgRating.toFixed(1)}<span className="text-lg text-muted-foreground">/5</span></div>
              <p className="text-xs text-muted-foreground">Moyenne des évaluations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Taux à temps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{onTimeRate}%</div>
              <p className="text-xs text-muted-foreground">Livraisons dans les délais</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations de paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iban">Virement bancaire (IBAN)</SelectItem>
                        <SelectItem value="rib">RIB</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN / RIB</Label>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="MA00 0000 0000 0000 0000 0000 000"
                    className="font-mono"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Méthode de paiement</p>
                  <p className="font-medium">{teamMember?.payment_method || 'Non configuré'}</p>
                </div>
                {teamMember?.iban && (
                  <div>
                    <p className="text-sm text-muted-foreground">IBAN</p>
                    <p className="font-medium font-mono">
                      {teamMember.iban.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ID Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Carte d'identité nationale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {idCardUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <FileCheck className="h-5 w-5" />
                  <span className="font-medium">Document uploadé</span>
                </div>
                <img 
                  src={idCardUrl} 
                  alt="Carte d'identité" 
                  className="max-w-sm rounded-lg border shadow-sm"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun document uploadé</p>
            )}
            <input
              ref={idCardInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleIdCardUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => idCardInputRef.current?.click()}
              disabled={isUploadingIdCard}
            >
              {isUploadingIdCard ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {idCardUrl ? 'Remplacer le document' : 'Uploader ma carte d\'identité'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DesignerLayout>
  );
}
