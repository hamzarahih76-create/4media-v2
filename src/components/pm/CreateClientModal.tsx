import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Palette, PenTool } from 'lucide-react';
import { useActiveCopywriters } from '@/hooks/useTeamMembers';
interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateClientModal({ open, onOpenChange, onSuccess }: CreateClientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: activeCopywriters = [] } = useActiveCopywriters();
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    industry: '',
    subscription_type: 'starter',
    primary_color: '#22c55e',
    secondary_color: '#0f172a',
    accent_color: '#f59e0b',
    notes: '',
    copywriter_id: '',
    studio_location: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.email) {
      toast.error('Le nom de l\'entreprise et l\'email sont requis');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-client-account', {
        body: { ...form, invited_by: session?.user?.id || '' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Compte client créé pour ${form.company_name}`, {
        description: `Un email a été envoyé à ${form.email}`,
      });
      setForm({
        company_name: '', contact_name: '', email: '', phone: '',
        industry: '', subscription_type: 'starter',
        primary_color: '#22c55e', secondary_color: '#0f172a', accent_color: '#f59e0b', notes: '',
        copywriter_id: '', studio_location: '',
      });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Entreprise *</Label>
              <Input id="company_name" value={form.company_name} onChange={e => updateField('company_name', e.target.value)} placeholder="Nom de l'entreprise" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Contact</Label>
              <Input id="contact_name" value={form.contact_name} onChange={e => updateField('contact_name', e.target.value)} placeholder="Nom du contact" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="client@entreprise.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+33 6 ..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="industry">Secteur</Label>
              <Input id="industry" value={form.industry} onChange={e => updateField('industry', e.target.value)} placeholder="Tech, Mode, Sport..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subscription_type">Abonnement</Label>
              <Select value={form.subscription_type} onValueChange={v => updateField('subscription_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4" />
              Branding
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="primary_color" className="text-xs">Couleur principale</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="primary_color" value={form.primary_color} onChange={e => updateField('primary_color', e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => updateField('primary_color', e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondary_color" className="text-xs">Secondaire</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="secondary_color" value={form.secondary_color} onChange={e => updateField('secondary_color', e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => updateField('secondary_color', e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accent_color" className="text-xs">Accent</Label>
                <div className="flex items-center gap-2">
                  <input type="color" id="accent_color" value={form.accent_color} onChange={e => updateField('accent_color', e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
                  <Input value={form.accent_color} onChange={e => updateField('accent_color', e.target.value)} className="h-8 text-xs font-mono" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Aperçu :</span>
              <div className="flex gap-1">
                <div className="h-6 w-12 rounded" style={{ backgroundColor: form.primary_color }} />
                <div className="h-6 w-12 rounded" style={{ backgroundColor: form.secondary_color }} />
                <div className="h-6 w-12 rounded" style={{ backgroundColor: form.accent_color }} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studio_location">Studio / lieu de tournage</Label>
            <Input id="studio_location" value={form.studio_location} onChange={e => updateField('studio_location', e.target.value)} placeholder="Adresse du studio ou lieu..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Notes internes sur ce client..." rows={2} />
          </div>

          {/* Copywriter Selection */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Copywriter assigné
            </Label>
            <Select
              value={form.copywriter_id || '_none'}
              onValueChange={v => updateField('copywriter_id', v === '_none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun copywriter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Aucun copywriter</SelectItem>
                {activeCopywriters.filter(c => c.user_id).map((cw) => (
                  <SelectItem key={cw.user_id!} value={cw.user_id!}>
                    {cw.full_name || cw.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le compte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
