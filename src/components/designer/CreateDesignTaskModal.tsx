import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Palette, Plus, Copy, Trash2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface CreateDesignTaskModalProps {
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

export function CreateDesignTaskModal({ open, onOpenChange, onSuccess }: CreateDesignTaskModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { data: clients = [] } = useClients();

  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientUserId, setClientUserId] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([createEntry()]);




  // Auto-fill design entries from client's Pack Design when selecting a client
  const handleClientChange = (v: string) => {
    if (v === '_manual') {
      setClientUserId('');
      setClientName('');
      setDesignEntries([createEntry()]);
      return;
    }
    const client = clients.find(c => c.user_id === v);
    
    setClientUserId(v);
    setClientName(client?.company_name || '');

    // Build entries from client's Pack Design config
    if (client) {
      const entries: DesignEntry[] = [];
      if (client.design_posts_per_month && client.design_posts_per_month > 0) {
        entries.push({ id: crypto.randomUUID(), type: 'post', carouselPages: '', count: client.design_posts_per_month });
      }
      if (client.design_miniatures_per_month && client.design_miniatures_per_month > 0) {
        entries.push({ id: crypto.randomUUID(), type: 'miniature', carouselPages: '', count: client.design_miniatures_per_month });
      }
      if (client.design_logos_per_month && client.design_logos_per_month > 0) {
        entries.push({ id: crypto.randomUUID(), type: 'logo', carouselPages: '', count: client.design_logos_per_month });
      }
      if (client.design_carousels_per_month && client.design_carousels_per_month > 0) {
        entries.push({ id: crypto.randomUUID(), type: 'carousel', carouselPages: '', count: client.design_carousels_per_month });
      }
      
      setDesignEntries(entries.length > 0 ? entries : [createEntry()]);
    }
  };

  const resetForm = () => {
    setDescription('');
    setClientName('');
    setClientUserId('');
    setDeadline(undefined);
    setDesignEntries([createEntry()]);
  };

  const addEntry = () => setDesignEntries(prev => [...prev, createEntry()]);

  const duplicateEntry = (entry: DesignEntry) => {
    setDesignEntries(prev => [...prev, { ...entry, id: crypto.randomUUID() }]);
  };

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
    // Post ou Miniature = 40 DH chacun
    return 40 * entry.count;
  };

  const totalPrice = designEntries.reduce((sum, e) => sum + calculateEntryPrice(e), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Veuillez sélectionner ou saisir un client');
      return;
    }

    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsLoading(true);

    try {
      const parts = designEntries.map(entry => {
        if (entry.type === 'carousel' && entry.carouselPages) {
          return `${entry.count}x Carrousel ${entry.carouselPages}p`;
        } else if (entry.type === 'miniature') {
          return `${entry.count}x Miniature`;
        } else if (entry.type === 'logo') {
          return `${entry.count}x Logo`;
        } else {
          return `${entry.count}x Post`;
        }
      });

      const typeLabel = parts.join(' + ');
      const fullDescription = `[${typeLabel}] ${description.trim() || ''}`.trim();

      // Auto-generate title from client name
      const autoTitle = clientName.trim();

      const { error } = await supabase
        .from('design_tasks')
        .insert({
          title: autoTitle,
          description: fullDescription || null,
          client_name: clientName.trim() || null,
          client_user_id: clientUserId || null,
          project_name: null,
          priority: 'medium',
          deadline: deadline ? deadline.toISOString() : null,
          design_count: totalDesigns,
          assigned_to: user.id,
          created_by: user.id,
          status: 'new',
          client_type: 'b2c',
        });

      if (error) throw error;

      // Sync is handled automatically by database trigger (trg_sync_design_pack)

      toast.success('🎨 Projet design créé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['design-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['brief-design-tasks'] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating design task:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            Nouveau projet design
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={clientUserId || '_manual'}
              onValueChange={handleClientChange}
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
              <Input
                id="clientName"
                placeholder="Client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Client Info: Identity + Pack Design */}
          {clientUserId && (() => {
            const selectedClient = clients.find(c => c.user_id === clientUserId);
            if (!selectedClient) return null;
            const colors = [selectedClient.primary_color, selectedClient.secondary_color, selectedClient.accent_color].filter(Boolean);
            const hasPackDesign = (selectedClient.design_posts_per_month || 0) > 0 || (selectedClient.design_miniatures_per_month || 0) > 0 || (selectedClient.design_logos_per_month || 0) > 0 || (selectedClient.design_carousels_per_month || 0) > 0;
            if (!colors.length && !hasPackDesign) return null;
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
                      {(selectedClient.design_posts_per_month || 0) > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{selectedClient.design_posts_per_month}x Post</span>
                      )}
                      {(selectedClient.design_miniatures_per_month || 0) > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{selectedClient.design_miniatures_per_month}x Miniature</span>
                      )}
                      {(selectedClient.design_logos_per_month || 0) > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{selectedClient.design_logos_per_month}x Logo</span>
                      )}
                      {(selectedClient.design_carousels_per_month || 0) > 0 && (
                        <span className="text-xs bg-background rounded-md px-2 py-1 border">{selectedClient.design_carousels_per_month}x Carrousel</span>
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

          {/* Design Entries */}
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
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
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
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Pages" />
                        </SelectTrigger>
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
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={entry.count}
                      onChange={(e) => updateEntry(entry.id, { count: parseInt(e.target.value) || 1 })}
                      className="h-9"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => duplicateEntry(entry)}
                    title="Dupliquer"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {designEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeEntry(entry.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={addEntry}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un type de design
            </Button>
            <p className="text-sm font-semibold text-primary">
              Montant total : {totalPrice} DH
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le travail à réaliser..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                  locale={fr}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le projet
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
