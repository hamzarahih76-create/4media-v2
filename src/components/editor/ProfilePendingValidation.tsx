import { Clock, CheckCircle2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfilePendingValidationProps {
  fullName: string;
  avatarUrl?: string | null;
  email?: string;
}

export function ProfilePendingValidation({ fullName, avatarUrl, email }: ProfilePendingValidationProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="relative mx-auto w-fit">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} />
              ) : (
                <AvatarFallback className="text-2xl">
                  {fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-2">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Profil en cours de validation</h2>
            <p className="text-muted-foreground">
              Bonjour <span className="font-medium text-foreground">{fullName}</span> !
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  Votre profil est en attente de validation par l'administrateur
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Vous recevrez une notification dès que votre compte sera activé. 
                  Cela peut prendre jusqu'à 24h.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Informations soumises
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-3 text-left">
                <p className="text-muted-foreground text-xs">Nom</p>
                <p className="font-medium truncate">{fullName}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-left">
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium truncate">{email}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-left">
                <p className="text-muted-foreground text-xs">Photo de profil</p>
                <p className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Envoyée
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-left">
                <p className="text-muted-foreground text-xs">Carte d'identité</p>
                <p className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Envoyée
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            En cas de problème, contactez votre administrateur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
