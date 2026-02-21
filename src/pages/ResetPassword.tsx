import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // First check if we have hash params (recovery flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      console.log('ResetPassword - Hash check:', { type, hasToken: !!accessToken });
      
      if (type === 'recovery' && accessToken) {
        // We have a recovery token in hash - session should be established
        setIsValidSession(true);
        return;
      }
      
      // Check if we have an active session (from the recovery link)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('ResetPassword - Active session found for:', session.user?.email);
        setIsValidSession(true);
      } else {
        console.log('ResetPassword - No valid session');
        setIsValidSession(false);
      }
    };

    // Listen for auth events (PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ResetPassword - Auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Check if this was from a recovery flow
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get('type') === 'recovery') {
          setIsValidSession(true);
        }
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast.error(error.message || 'Erreur lors de la mise à jour du mot de passe');
      } else {
        setIsSuccess(true);
        toast.success('Mot de passe mis à jour avec succès !');
        // Clear the URL hash
        window.history.replaceState(null, '', window.location.pathname);
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    }
    
    setIsLoading(false);
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Vérification en cours...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/expired session
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo4Media} alt="4Media" className="h-16 w-auto" />
            </div>
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Lien expiré ou invalide</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation a expiré ou est invalide.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Retourner à la connexion
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Vous pouvez demander un nouveau lien depuis la page de connexion.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo4Media} alt="4Media" className="h-16 w-auto" />
            </div>
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Mot de passe mis à jour !</CardTitle>
            <CardDescription>
              Votre mot de passe a été modifié avec succès.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              Vous allez être redirigé vers la page de connexion...
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Se connecter maintenant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo4Media} alt="4Media" className="h-16 w-auto" />
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
                autoFocus
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
