import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Pencil, Plus, Copy, Trash2, Palette, Package } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';
import { useQueryClient } from '@tanstack/react-query';
import { ClientRushesPreview } from './ClientRushesPreview';

interface DesignEntry {
  id: string;
  type: 'post' | 'miniature' | 'carousel' | 'logo';
  carouselPages: string;
  count: number;
}

interface DesignTask {
  id: string;
  title: string;
  description?: string | null;
  client_name?: string | null;
  client_user_id?: string | null;
  deadline?: string | null;
  design_count?: number | null;
  priority: string;
  status: string;
}

interface EditDesignTaskModalProps {
  task: DesignTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const createEntry = (type: 'post' | 'miniature' | 'carousel' | 'logo' = 'post'): DesignEntry => ({
  id: crypto.randomUUID(),
  type,
  carouselPages: '',
  count: 1,
});

// Parse description prefix like "[2x Post + 1x Carrousel 4p]" back into entries
const parseDescriptionToEntries = (description: string | null | undefined): { entries: DesignEntry[], userDescription: string } => {
  if (!description) return { entries: [createEntry()], userDescription: '' };

  const match = description.match(/^\[(.+?)\]\s*(.*)/s);
  if (!match) return { entries: [createEntry()], userDescription: description };

  const prefix = match[1];
  const userDescription = match[2] || '';

  const parts = prefix.split('+').map(s => s.trim());
  const entries: DesignEntry[] = [];

  for (const part of parts) {
    const carouselMatch = part.match(/(\d+)x\s*Carrousel\s*(\d+)p/i);
    const miniatureMatch = part.match(/(\d+)x\s*Miniature/i);
    const logoMatch = part.match(/(\d+)x\s*Logo/i);
    const postMatch = part.match(/(\d+)x\s*Post/i);

    if (carouselMatch) {
      entries.push({ id: crypto.randomUUID(), type: 'carousel', count: parseInt(carouselMatch[1]), carouselPages: carouselMatch[2] });
    } else if (miniatureMatch) {
      entries.push({ id: crypto.randomUUID(), type: 'miniature', count: parseInt(miniatureMatch[1]), carouselPages: '' });
    } else if (logoMatch) {
      entries.push({ id: crypto.randomUUID(), type: 'logo', count: parseInt(logoMatch[1]), carouselPages: '' });
    } else if (postMatch) {
      entries.push({ id: crypto.randomUUID(), type: 'post', count: parseInt(postMatch[1]), carouselPages: '' });
    }
  }

  return { entries: entries.length > 0 ? entries : [createEntry()], userDescription };
};

export function EditDesignTaskModal({ task, open, onOpenChange, onSuccess }: EditDesignTaskModalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientUserId, setClientUserId] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([createEntry()]);
  const { data: clients = [] } = useClients();

  useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setClientName(task.client_name || '');
      setClientUserId(task.client_user_id || '');
      setDeadline(task.deadline ? new Date(task.deadline) : undefined);

      const { entries, userDescription } = parseDescriptionToEntries(task.description);
      setDesignEntries(entries);
      setDescription(userDescription);
    }
  }, [task, open]);

  const addEntry = () => setDesignEntries(prev => [...prev, createEntry()]);
  const duplicateEntry = (entry: DesignEntry) => setDesignEntries(prev => [...prev, { ...entry, id: crypto.randomUUID() }]);
  const removeEntry = (id: string) => {
    if (designEntries.length <= 1) return;
    setDesignEntries(prev => prev.filter(e => e.id !== id));
  };
  const updateEntry = (id: string, updates: Partial<DesignEntry>) => {
    setDesignEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const totalDesigns = designEntries.reduce((sum, e) => sum + e.count, 0);

  const calculateEntryPrice = (entry: DesignEntry): number => {
    if (entry.type === 'carousel' && entry.carouselPages) {
      const pages = parseInt(entry.carouselPages);
      return (pages / 2) * 40 * entry.count;
    }
    return 40 * entry.count;
  };

  const totalPrice = designEntries.reduce((sum, e) => sum + calculateEntryPrice(e), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    setIsLoading(true);
    try {
      const parts = designEntries.map(entry => {
        if (entry.type === 'carousel' && entry.carouselPages) return `${entry.count}x Carrousel ${entry.carouselPages}p`;
        if (entry.type === 'miniature') return `${entry.count}x Miniature`;
        if (entry.type === 'logo') return `${entry.count}x Logo`;
        return `${entry.count}x Post`;
      });
      const typeLabel = parts.join(' + ');
      const fullDescription = `[${typeLabel}] ${description.trim() || ''}`.trim();

      const { error } = await supabase
        .from('design_tasks')
        .update({
          title: title.trim(),
          description: fullDescription || null,
          client_name: clientName.trim() || null,
          client_user_id: clientUserId || null,
          deadline: deadline ? deadline.toISOString() : null,
          design_count: totalDesigns,
        })
        .eq('id', task.id);

      if (error) throw error;

      // Sync is handled automatically by database trigger (trg_sync_design_pack)

      toast.success('✏️ Projet modifié avec succès !');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['design-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['brief-design-tasks'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating design task:', error);
      toast.error(error.message || 'Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Pencil className="h-5 w-5 text-accent" />
            </div>
            Modifier le projet
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titre du projet *</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={clientUserId || '_manual'}
              onValueChange={(v) => {
                if (v === '_manual') {
                  setClientUserId('');
                  setClientName('');
                } else {
                  const client = clients.find(c => c.user_id === v);
                  setClientUserId(v);
                  setClientName(client?.company_name || '');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_manual">✏️ Saisie manuelle</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.user_id} value={client.user_id}>
                    {client.company_name}{client.contact_name ? ` — ${client.contact_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!clientUserId && (
              <Input id="edit-clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client" className="mt-2" />
            )}
          </div>

          {/* Client Info: Identity + Pack Design */}
          {clientUserId && (() => {
            const selectedClient = clients.find(c => c.user_id === clientUserId);
            if (!selectedClient) return null;
            const colors = [selectedClient.primary_color, selectedClient.secondary_color, selectedClient.accent_color].filter(Boolean);
            const livePostCount = designEntries.filter(e => e.type === 'post').reduce((s, e) => s + e.count, 0);
            const liveMiniCount = designEntries.filter(e => e.type === 'miniature').reduce((s, e) => s + e.count, 0);
            const liveCarouselCount = designEntries.filter(e => e.type === 'carousel').reduce((s, e) => s + e.count, 0);
            const liveCarouselPages = designEntries.find(e => e.type === 'carousel' && e.carouselPages)?.carouselPages;
            const hasPackDesign = livePostCount > 0 || liveMiniCount > 0 || liveCarouselCount > 0 || (selectedClient.design_logos_per_month || 0) > 0;
            if (!colors.length && !hasPackDesign && !selectedClient.monthly_price && !selectedClient.notes) return null;
            return (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                {colors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="h-4 w-4 text-pink-500" />
                      <span className="text-xs font-semibold">Identité Visuelle</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {colors.map((color, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="h-8 w-8 rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: color! }} />
                          <span className="text-[10px] text-muted-foreground uppercase">{['Primaire', 'Secondaire', 'Accent'][i]}</span>
                        </div>
                      ))}
                    </div>
                    {selectedClient.visual_identity_notes && (
                      <p className="text-[11px] text-muted-foreground mt-2 italic">{selectedClient.visual_identity_notes}</p>
                    )}
                  </div>
                )}
                {hasPackDesign && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold">Pack Design</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {livePostCount > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{livePostCount}x Post</span>
                      )}
                      {liveMiniCount > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{liveMiniCount}x Miniature</span>
                      )}
                      {(selectedClient.design_logos_per_month || 0) > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{selectedClient.design_logos_per_month}x Logo</span>
                      )}
                      {liveCarouselCount > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{liveCarouselCount}x Carrousel{liveCarouselPages ? ` ${liveCarouselPages}p` : ''}</span>
                      )}
                    </div>
                  </div>
                )}
                {selectedClient.has_thumbnail_design && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🖼️ Miniatures incluses dans le pack</span>
                  </div>
                )}
                {selectedClient.notes && (
                  <div>
                    <span className="text-xs font-semibold">📝 Notes :</span>
                    <p className="text-[11px] text-muted-foreground mt-1">{selectedClient.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Rushs du client */}
          {clientUserId && <ClientRushesPreview clientUserId={clientUserId} />}

          <div className="space-y-3">
            <Label>Designs à réaliser</Label>
            {designEntries.map((entry) => (
              <div key={entry.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <Select
                      value={entry.type}
                      onValueChange={(val) => updateEntry(entry.id, {
                        type: val as DesignEntry['type'],
                        carouselPages: val !== 'carousel' ? '' : entry.carouselPages,
                      })}
                    >
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
            <p className="text-sm font-semibold text-primary">
              Montant total : {totalPrice} DH
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !deadline && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus locale={fr} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Modification...</>) : (<><Pencil className="h-4 w-4 mr-2" />Enregistrer</>)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
