import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, Loader2, Building2, Mail, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ClientValidationSectionProps {
  client: any;
  onClose?: () => void;
}

export function ClientValidationSection({ client, onClose }: ClientValidationSectionProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subscription_type: client.subscription_type || 'starter',
    monthly_price: client.monthly_price || 0,
    videos_per_month: client.videos_per_month || 0,
    has_thumbnail_design: client.has_thumbnail_design || false,
    primary_color: client.primary_color || '#22c55e',
    secondary_color: client.secondary_color || '#0f172a',
    accent_color: client.accent_color || '#f59e0b',
    strategic_description: client.strategic_description || '',
    visual_identity_notes: client.visual_identity_notes || '',
    positioning: client.positioning || '',
    client_objectives: client.client_objectives || '',
    tone_style: client.tone_style || '',
    next_shooting_date: client.next_shooting_date ? client.next_shooting_date.split('T')[0] : '',
    project_end_date: client.project_end_date ? client.project_end_date.split('T')[0] : '',
    studio_location: client.studio_location || '',
    shooting_day: client.shooting_day || '',
    industry: client.industry || client.domain_activity || '',
  });

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('client_profiles')
        .update({
          ...formData,
          monthly_price: Number(formData.monthly_price),
          videos_per_month: Number(formData.videos_per_month),
          next_shooting_date: formData.next_shooting_date || null,
          project_end_date: formData.project_end_date || null,
          account_status: 'active',
        })
        .eq('id', client.id);
      if (error) throw error;
      toast.success(`${client.company_name} a été activé avec succès`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose?.();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('client_profiles')
        .update({ account_status: 'rejected' })
        .eq('id', client.id);
      if (error) throw error;
      toast.success(`${client.company_name} a été refusé`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose?.();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {client.avatar_url ? (
                <AvatarImage src={client.avatar_url} alt={client.company_name} />
              ) : (
                <AvatarFallback><Building2 className="h-5 w-5" /></AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {client.company_name}
                <Badge className="bg-amber-500 text-white text-[10px]">En attente</Badge>
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                {client.domain_activity && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{client.domain_activity}</span>}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pack & Pricing */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Pack & Tarification</h4>
            <div className="space-y-2">
              <Label className="text-xs">Type d'abonnement</Label>
              <Select value={formData.subscription_type} onValueChange={v => setFormData(p => ({ ...p, subscription_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Prix mensuel (MAD)</Label>
              <Input type="number" value={formData.monthly_price} onChange={e => setFormData(p => ({ ...p, monthly_price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vidéos / mois</Label>
              <Input type="number" value={formData.videos_per_month} onChange={e => setFormData(p => ({ ...p, videos_per_month: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Miniature incluse</Label>
              <Switch checked={formData.has_thumbnail_design} onCheckedChange={v => setFormData(p => ({ ...p, has_thumbnail_design: v }))} />
            </div>
          </div>

          {/* Identity & Colors */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Identité visuelle</h4>
            <div className="space-y-2">
              <Label className="text-xs">Industrie</Label>
              <Input value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Principale</Label>
                <Input type="color" value={formData.primary_color} onChange={e => setFormData(p => ({ ...p, primary_color: e.target.value }))} className="h-8 p-0.5" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Secondaire</Label>
                <Input type="color" value={formData.secondary_color} onChange={e => setFormData(p => ({ ...p, secondary_color: e.target.value }))} className="h-8 p-0.5" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Accent</Label>
                <Input type="color" value={formData.accent_color} onChange={e => setFormData(p => ({ ...p, accent_color: e.target.value }))} className="h-8 p-0.5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes identité visuelle</Label>
              <Textarea rows={2} value={formData.visual_identity_notes} onChange={e => setFormData(p => ({ ...p, visual_identity_notes: e.target.value }))} placeholder="Polices, style, directives..." />
            </div>
          </div>
        </div>

        {/* Strategic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Description stratégique</Label>
            <Textarea rows={2} value={formData.strategic_description} onChange={e => setFormData(p => ({ ...p, strategic_description: e.target.value }))} placeholder="Stratégie de contenu..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Objectifs client</Label>
            <Textarea rows={2} value={formData.client_objectives} onChange={e => setFormData(p => ({ ...p, client_objectives: e.target.value }))} placeholder="Objectifs principaux..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Positionnement</Label>
            <Input value={formData.positioning} onChange={e => setFormData(p => ({ ...p, positioning: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ton & Style</Label>
            <Input value={formData.tone_style} onChange={e => setFormData(p => ({ ...p, tone_style: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Lieu de tournage</Label>
            <Input value={formData.studio_location} onChange={e => setFormData(p => ({ ...p, studio_location: e.target.value }))} />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Jour de tournage</Label>
            <Input value={formData.shooting_day} onChange={e => setFormData(p => ({ ...p, shooting_day: e.target.value }))} placeholder="Ex: Lundi" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prochain tournage</Label>
            <Input type="date" value={formData.next_shooting_date} onChange={e => setFormData(p => ({ ...p, next_shooting_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Fin de projet</Label>
            <Input type="date" value={formData.project_end_date} onChange={e => setFormData(p => ({ ...p, project_end_date: e.target.value }))} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button onClick={handleAccept} disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Accepter et activer
          </Button>
          <Button onClick={handleReject} disabled={isSubmitting} variant="destructive" className="flex-1">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Refuser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
