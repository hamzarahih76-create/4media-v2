import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Password reset state
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');

  // Check for password reset mode from URL or auth event - MUST run before redirect check
  useEffect(() => {
    const handleRecoveryCheck = async () => {
      // Check URL hash for recovery token (Supabase sends tokens in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      console.log('Auth page - checking for recovery:', { type, hasToken: !!accessToken, hash: window.location.hash });
      
      if (type === 'recovery' && accessToken) {
        console.log('Recovery mode detected from hash');
        setIsPasswordResetMode(true);
        return;
      }
      
      // Check if we have a session that came from recovery
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if this session was from a recovery flow by looking at the URL params
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reset') === 'true') {
          console.log('Recovery mode detected from URL param with active session');
          setIsPasswordResetMode(true);
          return;
        }
      }
    };
    
    handleRecoveryCheck();
    
    // Also listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event received');
        setIsPasswordResetMode(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Redirect if already logged in (but not in password reset mode)
  // Only redirect if coming from a fresh navigation, not from a redirect loop
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !isPasswordResetMode) {
        // Check if user was just redirected here from a failed permission check
        // by looking at the referrer - avoid redirect loops
        const fromRedirect = searchParams.get('from');
        if (fromRedirect === 'no-access') {
          // User has a session but no valid permissions - don't redirect back
          // Sign them out so they can re-login or contact admin
          await supabase.auth.signOut();
          toast.info('Votre compte n\'a pas encore les permissions nécessaires. Contactez un administrateur.');
          return;
        }
        navigate('/');
      }
    };
    checkSession();
  }, [navigate, isPasswordResetMode, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password: loginPassword 
    });
    
    if (error) {
      toast.error(error.message || 'Erreur de connexion');
    } else {
      toast.success('Connexion réussie');
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!signupFullName.trim()) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: signupFullName }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Cet email est déjà utilisé. Essayez de vous connecter.');
        } else {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        }
      } else {
        toast.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        // Switch to login tab
        setActiveTab('login');
        setLoginEmail(signupEmail);
        // Reset signup form
        setSignupEmail('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setSignupFullName('');
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || 'Erreur lors de l\'envoi');
      } else {
        toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
        setResetDialogOpen(false);
        setResetEmail('');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
    
    setIsResetting(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast.error(error.message || 'Erreur lors de la mise à jour du mot de passe');
      } else {
        toast.success('Mot de passe mis à jour avec succès !');
        setIsPasswordResetMode(false);
        setNewPassword('');
        setConfirmNewPassword('');
        // Clear the URL hash
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/');
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
    
    setIsLoading(false);
  };

  // Password Reset Mode UI
  if (isPasswordResetMode) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logo4Media} 
                alt="4Media" 
                className="h-16 w-auto"
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
            <CardDescription>
              Créez un nouveau mot de passe pour votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  'Mettre à jour le mot de passe'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logo4Media} 
              alt="4Media" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-2xl">4Media</CardTitle>
          <CardDescription>
            Agence de Personal Branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="gap-2">
                <LogIn className="h-4 w-4" />
                Connexion
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Inscription
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" forceMount className={activeTab !== 'login' ? 'hidden' : ''}>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline"
                        >
                          Mot de passe oublié ?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                          <DialogDescription>
                            Entrez votre adresse email pour recevoir un lien de réinitialisation.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="vous@exemple.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setResetDialogOpen(false)}
                              className="flex-1"
                            >
                              Annuler
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isResetting}>
                              {isResetting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Envoi...
                                </>
                              ) : (
                                'Envoyer le lien'
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" forceMount className={activeTab !== 'signup' ? 'hidden' : ''}>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Nom complet</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Jean Dupont"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 caractères
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    "S'inscrire comme éditeur"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  En vous inscrivant, votre profil sera soumis à validation par l'administrateur.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
