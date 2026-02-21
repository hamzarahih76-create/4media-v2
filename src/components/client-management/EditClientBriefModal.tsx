import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface EditClientBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
}

interface DesignEntry {
  id: string;
  type: 'post' | 'miniature' | 'logo' | 'carousel';
  carouselPages: string;
  count: number;
}

const VIDEO_PACKS = ['8', '12', '16', '25', '50'];

const createEntry = (type: DesignEntry['type'] = 'post'): DesignEntry => ({
  id: crypto.randomUUID(),
  type,
  carouselPages: '',
  count: 1,
});

const buildEntriesFromClient = (client: any): DesignEntry[] => {
  const entries: DesignEntry[] = [];
  if (client.design_posts_per_month > 0) entries.push({ id: crypto.randomUUID(), type: 'post', carouselPages: '', count: client.design_posts_per_month });
  if (client.design_miniatures_per_month > 0) entries.push({ id: crypto.randomUUID(), type: 'miniature', carouselPages: '', count: client.design_miniatures_per_month });
  if (client.design_logos_per_month > 0) entries.push({ id: crypto.randomUUID(), type: 'logo', carouselPages: '', count: client.design_logos_per_month });
  if (client.design_carousels_per_month > 0) entries.push({ id: crypto.randomUUID(), type: 'carousel', carouselPages: client.design_carousel_pages || '', count: client.design_carousels_per_month });
  return entries.length > 0 ? entries : [createEntry()];
};

const entriesToColumns = (entries: DesignEntry[]) => {
  const result = { design_posts_per_month: 0, design_miniatures_per_month: 0, design_logos_per_month: 0, design_carousels_per_month: 0 };
  for (const e of entries) {
    if (e.type === 'post') result.design_posts_per_month += e.count;
    else if (e.type === 'miniature') result.design_miniatures_per_month += e.count;
    else if (e.type === 'logo') result.design_logos_per_month += e.count;
    else if (e.type === 'carousel') result.design_carousels_per_month += e.count;
  }
  return result;
};

export function EditClientBriefModal({ open, onOpenChange, client }: EditClientBriefModalProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    strategic_description: '',
    visual_identity_notes: '',
    positioning: '',
    client_objectives: '',
    tone_style: '',
    videos_per_month: 0,
    has_thumbnail_design: false,
  });
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([createEntry()]);

  useEffect(() => {
    if (client) {
      setForm({
        strategic_description: client.strategic_description || '',
        visual_identity_notes: client.visual_identity_notes || '',
        positioning: client.positioning || '',
        client_objectives: client.client_objectives || '',
        tone_style: client.tone_style || '',
        videos_per_month: client.videos_per_month || 0,
        has_thumbnail_design: client.has_thumbnail_design || false,
      });
      setDesignEntries(buildEntriesFromClient(client));
    }
  }, [client]);

  const addEntry = () => setDesignEntries(prev => [...prev, createEntry()]);
  const duplicateEntry = (entry: DesignEntry) => setDesignEntries(prev => [...prev, { ...entry, id: crypto.randomUUID() }]);
  const removeEntry = (id: string) => {
    if (designEntries.length <= 1) return;
    setDesignEntries(prev => prev.filter(e => e.id !== id));
  };
  const updateEntry = (id: string, updates: Partial<DesignEntry>) => {
    setDesignEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleSave = async () => {
    setSaving(true);
    const designColumns = entriesToColumns(designEntries);
    const { error } = await supabase
      .from('client_profiles')
      .update({ ...form, ...designColumns } as any)
      .eq('id', client.id);
    setSaving(false);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Brief client mis à jour');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le brief — {client?.company_name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Description stratégique</Label>
            <Textarea rows={3} value={form.strategic_description} onChange={e => setForm(f => ({ ...f, strategic_description: e.target.value }))} placeholder="Contexte, stratégie, audience cible..." />
          </div>
          <div>
            <Label>Objectifs client</Label>
            <Input value={form.client_objectives} onChange={e => setForm(f => ({ ...f, client_objectives: e.target.value }))} placeholder="Ex: 10K followers en 3 mois" />
          </div>

          {/* Pack vidéo */}
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <Label className="text-sm font-semibold mb-3 block">Pack Vidéo</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Vidéos / mois</Label>
                <Select value={String(form.videos_per_month)} onValueChange={v => setForm(f => ({ ...f, videos_per_month: parseInt(v) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_PACKS.map(p => (
                      <SelectItem key={p} value={p}>{p} vidéos / mois</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Miniature design incluse</Label>
                <Switch checked={form.has_thumbnail_design} onCheckedChange={v => setForm(f => ({ ...f, has_thumbnail_design: v }))} />
              </div>
            </div>
          </div>

          {/* Pack Design - style designer */}
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <Label className="text-sm font-semibold mb-3 block">Pack Design</Label>
            <div className="space-y-3">
              {designEntries.map((entry) => (
                <div key={entry.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <Select value={entry.type} onValueChange={(val) => updateEntry(entry.id, { type: val as DesignEntry['type'], carouselPages: val !== 'carousel' ? '' : entry.carouselPages })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post">Post</SelectItem>
                          <SelectItem value="miniature">Miniature</SelectItem>
                          <SelectItem value="logo">Logo</SelectItem>
                          <SelectItem value="carousel">Carrousel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {entry.type === 'carousel' && (
                      <div className="w-28 space-y-1">
                        <span className="text-xs text-muted-foreground">Pages</span>
                        <Select value={entry.carouselPages} onValueChange={(val) => updateEntry(entry.id, { carouselPages: val })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Pages" /></SelectTrigger>
                          <SelectContent>
                            {['1','2','3','4','5','6','7','8','9','10','11','12'].map(n => (
                              <SelectItem key={n} value={n}>{n} pages</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="w-20 space-y-1">
                      <span className="text-xs text-muted-foreground">Qté</span>
                      <Input type="number" min={1} max={50} value={entry.count} onChange={(e) => updateEntry(entry.id, { count: parseInt(e.target.value) || 1 })} className="h-9" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => duplicateEntry(entry)} title="Dupliquer">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {designEntries.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive hover:text-destructive" onClick={() => removeEntry(entry.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={addEntry}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter un type de design
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
