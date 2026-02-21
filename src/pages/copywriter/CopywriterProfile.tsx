import { CopywriterLayout } from '@/components/layout/CopywriterLayout';
import { useCopywriterProfile } from '@/hooks/useCopywriterData';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, CreditCard } from 'lucide-react';

export default function CopywriterProfile() {
  const { user } = useAuth();
  const { data: teamMember } = useCopywriterProfile();

  return (
    <CopywriterLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Mon Profil</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Nom complet</p>
                <p className="font-medium">{teamMember?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rôle</p>
                <p className="font-medium capitalize">{teamMember?.role || 'Copywriter'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="font-medium capitalize">{teamMember?.status || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Méthode de paiement</p>
                <p className="font-medium">{teamMember?.payment_method || 'Non configuré'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IBAN</p>
                <p className="font-medium">{teamMember?.iban ? '•••• ' + teamMember.iban.slice(-4) : 'Non configuré'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CopywriterLayout>
  );
}
