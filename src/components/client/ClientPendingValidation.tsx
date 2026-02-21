import { Clock, CheckCircle2, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo4Media from '@/assets/4media-logo.png';

interface ClientPendingValidationProps {
  fullName: string;
  avatarUrl?: string | null;
  email?: string | null;
  onSignOut: () => void;
}

export function ClientPendingValidation({ fullName, avatarUrl, email, onSignOut }: ClientPendingValidationProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-2 text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="flex justify-center">
            <img src={logo4Media} alt="4Media" className="h-12 w-auto" />
          </div>
          
          <Avatar className="h-20 w-20 mx-auto border-4 border-primary/20">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} />
            ) : (
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {fullName?.charAt(0)?.toUpperCase() || 'C'}
              </AvatarFallback>
            )}
          </Avatar>

          <div>
            <h2 className="text-xl font-bold">Bonjour {fullName} 👋</h2>
            {email && <p className="text-sm text-muted-foreground mt-1">{email}</p>}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              Profil en cours de validation
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Votre profil est en cours de vérification par notre équipe. 
              Vous recevrez une confirmation sous <strong>24 heures</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Compte créé avec succès</span>
          </div>

          <Button variant="ghost" onClick={onSignOut} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
