import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PenTool, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

export default function CopywriterJoin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isWaitingForSession, setIsWaitingForSession] = useState(false);

  useEffect(() => {
    if (!isWaitingForSession) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        toast.success('Inscription réussie ! Redirection vers votre espace copywriter...');
        setTimeout(() => { window.location.href = '/copywriter'; }, 500);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [isWaitingForSession]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Veuillez entrer votre nom complet'); return; }
    if (password.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
    if (password !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }

    setIsLoading(true);
    try {
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existingMember) {
        toast.error('Cet email est déjà enregistré. Essayez de vous connecter.');
        setIsLoading(false);
        return;
      }

      setIsWaitingForSession(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/copywriter`,
          data: { full_name: fullName.trim(), role: 'copywriter' }
        }
      });

      if (error) {
        setIsWaitingForSession(false);
        toast.error(error.message.includes('already registered') ? 'Cet email est déjà utilisé.' : error.message);
        setIsLoading(false);
      } else if (data?.user && data?.session) {
        toast.success('Inscription réussie !');
        setTimeout(() => { window.location.href = '/copywriter'; }, 500);
      } else if (data?.user && !data?.session) {
        toast.info('Finalisation de l\'inscription...');
      } else {
        setIsWaitingForSession(false);
        toast.error('Erreur inattendue');
        setIsLoading(false);
      }
    } catch (err) {
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
            <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center">
              <PenTool className="h-7 w-7 text-violet-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rejoindre comme Copywriter</CardTitle>
          <CardDescription>Créez votre compte pour rédiger des idées, scripts et plannings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Nom complet</Label>
              <Input id="fullname" type="text" placeholder="Jean Dupont" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
              <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création du compte...</> : "S'inscrire comme copywriter"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Déjà un compte ?</p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')} disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />Se connecter
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-6">
            Après inscription, vous devrez compléter votre profil et attendre la validation par un administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
