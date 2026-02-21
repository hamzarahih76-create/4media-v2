import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Palette, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

export default function DesignerJoin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isWaitingForSession, setIsWaitingForSession] = useState(false);

  // Listen for session changes after signup
  useEffect(() => {
    if (!isWaitingForSession) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        toast.success('Inscription réussie ! Redirection vers votre espace designer...');
        setTimeout(() => {
          window.location.href = '/designer';
        }, 500);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isWaitingForSession]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      // Check if email already exists
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
          emailRedirectTo: `${window.location.origin}/designer`,
          data: {
            full_name: fullName.trim(),
            role: 'designer'
          }
        }
      });
      
      if (error) {
        setIsWaitingForSession(false);
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.error('Cet email est déjà utilisé. Essayez de vous connecter.');
        } else {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        }
        setIsLoading(false);
      } else if (data?.user && data?.session) {
        console.log('Session immediately available, navigating to /designer');
        toast.success('Inscription réussie ! Redirection vers votre espace designer...');
        setTimeout(() => {
          window.location.href = '/designer';
        }, 500);
      } else if (data?.user && !data?.session) {
        console.log('Waiting for session to be established...');
        toast.info('Finalisation de l\'inscription...');
      } else {
        setIsWaitingForSession(false);
        toast.error('Erreur inattendue lors de l\'inscription');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logo4Media} 
              alt="4Media" 
              className="h-16 w-auto"
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
              <Palette className="h-7 w-7 text-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rejoindre comme Designer</CardTitle>
          <CardDescription>
            Créez votre compte pour commencer à créer des designs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Nom complet</Label>
              <Input
                id="fullname"
                type="text"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 caractères
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                "S'inscrire comme designer"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Déjà un compte ?
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth')}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Se connecter
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
