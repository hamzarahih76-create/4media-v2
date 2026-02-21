import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, Calendar, Palette, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any | null;
}

export function ClientDetailModal({ open, onOpenChange, client }: ClientDetailModalProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${client.primary_color || '#22c55e'}20` }}>
              <Building2 className="h-5 w-5" style={{ color: client.primary_color || 'hsl(var(--primary))' }} />
            </div>
            {client.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {client.contact_name && (
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Contact :</span>
              <span>{client.contact_name}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Email :</span>
              <span>{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Téléphone :</span>
              <span>{client.phone}</span>
            </div>
          )}
          {client.industry && (
            <div className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Industrie :</span>
              <span>{client.industry}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Couleurs :</span>
            <div className="flex gap-1">
              <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: client.primary_color || '#22c55e' }} title="Primaire" />
              <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: client.secondary_color || '#0f172a' }} title="Secondaire" />
              <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: client.accent_color || '#f59e0b' }} title="Accent" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">Abonnement :</span>
            <Badge variant="secondary">{client.subscription_type || 'starter'}</Badge>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Créé le :</span>
            <span>{format(new Date(client.created_at), 'dd MMMM yyyy', { locale: fr })}</span>
          </div>

          {client.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-1">Notes :</p>
              <p className="text-sm text-muted-foreground">{client.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
