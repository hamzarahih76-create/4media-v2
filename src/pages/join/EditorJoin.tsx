import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Video, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

export default function EditorJoin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isWaitingForSession, setIsWaitingForSession] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Listen for session changes after signup
  useEffect(() => {
    if (!isWaitingForSession) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        toast.success('Inscription réussie ! Redirection vers votre espace éditeur...');
        // Use window.location.href to force a full page reload
        // This is necessary because /join/editor is outside AuthProvider
        // and we need the AuthProvider to initialize with the new session
        setTimeout(() => {
          window.location.href = '/editor';
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
      // Check if email already exists in team_members
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, status, user_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      // If already has a user_id, they already have an account
      if (existingMember?.user_id) {
        toast.error('Cet email est déjà enregistré. Essayez de vous connecter.');
        setIsLoading(false);
        return;
      }

      // Start listening for session before signup
      setIsWaitingForSession(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/editor`,
          data: {
            full_name: fullName.trim(),
            role: 'editor'
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
      } else if (data?.user) {
        const userId = data.user.id;

        if (existingMember) {
          // Link existing team_members record to new auth user
          await supabase
            .from('team_members')
            .update({ user_id: userId, full_name: fullName.trim() })
            .eq('id', existingMember.id);
        } else {
          // Create new team_members record
          await supabase
            .from('team_members')
            .insert({
              email: email.toLowerCase().trim(),
              full_name: fullName.trim(),
              role: 'editor',
              position: 'Video Editor',
              department: 'Production',
              status: 'pending',
              user_id: userId,
            });
        }

        // Assign editor role (insert only if not exists)
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!existingRole) {
          await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'editor' });
        }

        if (data?.session) {
          // Session immediately available (auto-confirm enabled)
          toast.success('Inscription réussie ! Redirection...');
          setTimeout(() => {
            window.location.href = '/editor';
          }, 500);
        } else {
          // Email confirmation required
          setIsWaitingForSession(false);
          setIsLoading(false);
          setEmailSent(true);
          toast.success('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
        }
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

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-2">
          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <div className="flex justify-center mb-4">
              <img src={logo4Media} alt="4Media" className="h-16 w-auto" />
            </div>
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Vérifiez votre email</h2>
              <p className="text-muted-foreground text-sm">
                Un email de confirmation a été envoyé à <strong>{email}</strong>.<br />
                Cliquez sur le lien dans l'email pour activer votre compte.
              </p>
            </div>
            <div className="bg-muted border border-border rounded-lg p-4 text-sm text-muted-foreground">
              Après confirmation, votre profil devra être validé par un administrateur avant de pouvoir accéder à votre espace.
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Aller à la page de connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
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
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rejoindre comme Éditeur</CardTitle>
          <CardDescription>
            Créez votre compte pour commencer à éditer des vidéos
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
                "S'inscrire comme éditeur"
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
