import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any | null;
  onSuccess: () => void;
}

export function EditClientModal({ open, onOpenChange, client, onSuccess }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  });

  useEffect(() => {
    if (client) {
      setForm({
        company_name: client.company_name || '',
        contact_name: client.contact_name || '',
        email: client.email || '',
        phone: client.phone || '',
        industry: client.industry || '',
        subscription_type: client.subscription_type || 'starter',
        primary_color: client.primary_color || '#22c55e',
        secondary_color: client.secondary_color || '#0f172a',
        accent_color: client.accent_color || '#f59e0b',
      });
      setLogoUrl(client.logo_url || null);
    }
  }, [client]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      // First upload original
      const ext = file.name.split('.').pop();
      const filePath = `${client.user_id}/avatar-original.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(filePath);

      const originalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setLogoUrl(originalUrl);
      toast.success('Photo uploadée, suppression du fond en cours...');

      // Call edge function to remove background
      try {
        const { data: bgData, error: bgError } = await supabase.functions.invoke('remove-bg', {
          body: { imageUrl: originalUrl, clientUserId: client.user_id },
        });

        if (bgError) throw bgError;

        if (bgData?.url) {
          setLogoUrl(bgData.url);
          toast.success('Fond supprimé avec succès !');
        }
      } catch (bgErr: any) {
        console.error('Background removal failed:', bgErr);
        // Keep original photo if bg removal fails
        await supabase
          .from('client_profiles')
          .update({ logo_url: originalUrl })
          .eq('id', client.id);
        toast.info('Photo enregistrée (suppression du fond non disponible)');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_profiles')
        .update({
          company_name: form.company_name,
          contact_name: form.contact_name || null,
          email: form.email || null,
          phone: form.phone || null,
          industry: form.industry || null,
          subscription_type: form.subscription_type,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          accent_color: form.accent_color,
          logo_url: logoUrl,
        })
        .eq('id', client.id);
      if (error) throw error;
      toast.success('Client mis à jour');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const initials = (client.company_name || 'CL').slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier {client.company_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={logoUrl || ''} />
                <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: form.primary_color + '30', color: form.primary_color }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Photo de profil</p>
              <p className="text-xs text-muted-foreground">Cliquez pour changer la photo</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom contact</Label>
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            </div>
            <div>
              <Label>Industrie</Label>
              <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Abonnement</Label>
              <Select value={form.subscription_type} onValueChange={v => setForm(f => ({ ...f, subscription_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Couleurs de marque</Label>
            <div className="flex gap-4 mt-1">
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                <span className="text-xs text-muted-foreground">Primaire</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                <span className="text-xs text-muted-foreground">Secondaire</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                <span className="text-xs text-muted-foreground">Accent</span>
              </div>
            </div>
          </div>




          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
