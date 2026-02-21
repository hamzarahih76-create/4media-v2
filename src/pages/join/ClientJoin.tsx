import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, ArrowLeft, Camera, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

const DOMAIN_OPTIONS = [
  'Docteur',
  'Coach sportif',
  'Avocat',
  'Architecte',
  'Consultant',
];


export default function ClientJoin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [domainActivity, setDomainActivity] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isWaitingForSession, setIsWaitingForSession] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isWaitingForSession) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Upload avatar if provided
        if (avatarFile && session.user.id) {
          uploadAvatar(session.user.id, avatarFile).then(() => {
            toast.success('Inscription réussie ! Votre profil est en cours de validation.');
            setTimeout(() => { window.location.href = '/client'; }, 500);
          });
        } else {
          toast.success('Inscription réussie ! Votre profil est en cours de validation.');
          setTimeout(() => { window.location.href = '/client'; }, 500);
        }
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [isWaitingForSession, avatarFile]);

  const uploadAvatar = async (userId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `client-avatars/${userId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('client_profiles').update({ avatar_url: publicUrl }).eq('user_id', userId);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 5 Mo');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Veuillez entrer votre nom complet'); return; }
    if (!domainActivity || (domainActivity === 'Autre' && !customDomain.trim())) { toast.error('Veuillez sélectionner votre domaine d\'activité'); return; }
    if (password.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (password.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (password !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }

    setIsLoading(true);
    try {
      setIsWaitingForSession(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/client`,
          data: {
            full_name: fullName.trim(),
            role: 'client',
            domain_activity: domainActivity === 'Autre' ? customDomain.trim() : domainActivity,
            phone: phone.trim() || undefined,
          }
        }
      });

      if (error) {
        setIsWaitingForSession(false);
        if (error.message.includes('already registered')) {
          toast.error('Cet email est déjà utilisé. Essayez de vous connecter.');
        } else {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        }
        setIsLoading(false);
      } else if (data?.user && data?.session) {
        if (avatarFile) {
          await uploadAvatar(data.user.id, avatarFile);
        }
        toast.success('Inscription réussie ! Votre profil est en cours de validation.');
        setTimeout(() => { window.location.href = '/client'; }, 500);
      } else if (data?.user && !data?.session) {
        toast.info('Finalisation de l\'inscription...');
      } else {
        setIsWaitingForSession(false);
        toast.error('Erreur inattendue');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Une erreur est survenue');
      setIsWaitingForSession(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo4Media} alt="4Media" className="h-16 w-auto" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Créer votre espace client</CardTitle>
          <CardDescription>
            Inscrivez-vous pour accéder à votre espace de suivi de projets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Avatar upload */}
            <div className="flex justify-center">
              <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary transition-colors">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Photo de profil" />
                  ) : (
                    <AvatarFallback className="bg-muted">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">Photo de profil (optionnel)</p>

            <div className="space-y-2">
              <Label htmlFor="fullname">Nom complet *</Label>
              <Input id="fullname" type="text" placeholder="Jean Dupont" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domaine / Activité *</Label>
              <Select value={domainActivity} onValueChange={setDomainActivity} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre domaine..." />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {domainActivity === 'Autre' && (
                <Input placeholder="Précisez votre domaine..." value={customDomain} onChange={e => setCustomDomain(e.target.value)} disabled={isLoading} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="vous@exemple.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input id="phone" type="tel" placeholder="+212 6XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />
              <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe *</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création du compte...</>
              ) : "Créer mon espace client"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Déjà un compte ?</p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />Se connecter
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Après inscription, votre profil sera validé par notre équipe sous 24h.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
