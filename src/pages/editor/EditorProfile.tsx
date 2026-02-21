import { useState, useEffect, useRef } from 'react';
import { EditorLayout } from '@/components/layout/EditorLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEditorProfile, useEditorStats } from '@/hooks/useEditorProfile';
import { useEditorReviews } from '@/hooks/useEditorReviews';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Camera,
  Shield,
  Star,
  Calendar,
  Edit2,
  Save,
  X,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';

export default function EditorProfile() {
  const { user } = useAuth();
  const { profile, teamMember, isLoading } = useEditorProfile();
  const editorStatsQuery = useEditorStats();
  const stats = editorStatsQuery.data;
  const { data: reviews, isLoading: reviewsLoading } = useEditorReviews();
  
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    iban: '',
    payment_method: '',
  });

  // Video & Audio test state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoTestActive, setIsVideoTestActive] = useState(false);
  const [isAudioTestActive, setIsAudioTestActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasVideoPermission, setHasVideoPermission] = useState<boolean | null>(null);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (teamMember) {
      setFormData({
        full_name: teamMember.full_name || '',
        email: teamMember.email || '',
        iban: teamMember.iban || '',
        payment_method: '',
      });
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

  // Cleanup video/audio on unmount
  useEffect(() => {
    return () => {
      stopVideoTest();
      stopAudioTest();
    };
  }, []);

  const startVideoTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoStream(stream);
      setHasVideoPermission(true);
      setIsVideoTestActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasVideoPermission(false);
      toast.error('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const stopVideoTest = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsVideoTestActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startAudioTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasAudioPermission(true);
      setIsAudioTestActive(true);

      // Create audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Animation loop for audio level visualization
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, (average / 128) * 100));
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
      // Store stream for cleanup
      setVideoStream(prev => {
        if (prev) {
          stream.getTracks().forEach(track => prev.addTrack(track));
          return prev;
        }
        return stream;
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setHasAudioPermission(false);
      toast.error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopAudioTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setIsAudioTestActive(false);
  };

  const handleSave = async () => {
    if (!teamMember?.id) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          full_name: formData.full_name,
          iban: formData.iban,
          payment_method: formData.payment_method,
        })
        .eq('id', teamMember.id);

      if (error) throw error;

      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  const initials = formData.full_name?.slice(0, 2).toUpperCase() || 
    user?.email?.slice(0, 2).toUpperCase() || 'ED';

  const memberSince = teamMember?.activated_at 
    ? format(new Date(teamMember.activated_at), 'MMMM yyyy', { locale: fr })
    : 'Récemment';

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      bronze: 'bg-amber-600',
      silver: 'bg-gray-400',
      gold: 'bg-yellow-500',
      platinum: 'bg-cyan-400',
      diamond: 'bg-purple-500',
    };
    return colors[rank] || 'bg-primary';
  };

  if (isLoading) {
    return (
      <EditorLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </EditorLayout>
    );
  }

  return (
    <EditorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mon Profil</h1>
            <p className="text-muted-foreground">Gérez vos informations personnelles</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar Section */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{formData.full_name || 'Éditeur'}</h2>
                  <Badge className={getRankColor(stats?.rank || 'bronze')}>
                    {stats?.rank?.charAt(0).toUpperCase() + (stats?.rank?.slice(1) || 'Bronze')}
                  </Badge>
                  {teamMember?.validation_status === 'validated' && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Vérifié
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membre depuis {memberSince}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {stats?.average_rating?.toFixed(1) || '5.0'} ({reviews?.length || 0} avis)
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground">Niveau</span>
                    <p className="font-semibold">{stats?.level || 1}</p>
                  </div>
                  <div className="bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground">XP</span>
                    <p className="font-semibold">{stats?.xp || 0}</p>
                  </div>
                  <div className="bg-muted/50 px-3 py-2 rounded-lg">
                    <span className="text-muted-foreground">Vidéos</span>
                    <p className="font-semibold">{stats?.total_videos_delivered || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>Vos coordonnées et informations de contact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Votre nom complet"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informations de paiement
            </CardTitle>
            <CardDescription>Vos coordonnées bancaires pour recevoir vos paiements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN / RIB</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  disabled={!isEditing}
                  placeholder="FR76 XXXX XXXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Méthode de paiement</Label>
                <Input
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Virement bancaire"
                />
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💰 Tarif par vidéo : <span className="font-semibold text-foreground">100 DH</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Avis Clients
            </CardTitle>
            <CardDescription>Ce que vos clients pensent de votre travail</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : !reviews || reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucun avis pour le moment</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Les avis apparaîtront ici après validation de vos vidéos
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div 
                    key={review.id} 
                    className="bg-muted/30 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    {/* Stars */}
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= (review.rating || 0)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>

                    {/* Feedback text */}
                    {review.feedback_text && (
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        "{review.feedback_text}"
                      </p>
                    )}

                    {/* Video title + Date */}
                    <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {review.video_title || 'Vidéo'}
                      </span>
                      <span>
                        {format(new Date(review.reviewed_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EditorLayout>
  );
}
