import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo4Media from '@/assets/4media-logo.png';

const DEPARTMENTS = [
  { value: 'management', label: 'Management' },
  { value: 'production', label: 'Production' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance / Comptabilité' },
  { value: 'tech', label: 'Technique / IT' },
];

const POSITIONS = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'accountant', label: 'Comptable' },
  { value: 'copywriter', label: 'Copywriter' },
  { value: 'motion_designer', label: 'Motion Designer' },
  { value: 'colorist', label: 'Coloriste' },
  { value: 'other', label: 'Autre' },
];

export default function TeamJoin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }

    if (!department) {
      toast.error('Veuillez sélectionner votre département');
      return;
    }

    if (!position) {
      toast.error('Veuillez sélectionner votre poste');
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            role: 'team_member',
            department,
            position
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Cet email est déjà utilisé. Essayez de vous connecter.');
        } else {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        }
      } else {
        toast.success('Compte créé avec succès ! Un administrateur validera votre accès.');
        // Redirect to auth page for login after approval
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
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
            <div className="h-14 w-14 rounded-full bg-secondary/20 flex items-center justify-center">
              <Users className="h-7 w-7 text-secondary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rejoindre l'équipe</CardTitle>
          <CardDescription>
            Créez votre compte membre de l'équipe 4Media
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@4media.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Département</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Poste</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                "Demander l'accès"
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
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Se connecter
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Votre demande sera examinée par un administrateur avant activation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
