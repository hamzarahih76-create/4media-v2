import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Brain, Palette, Target, Video, MapPin, Calendar, CalendarClock, MessageSquare, Pencil, Package, CheckCircle2, XCircle, PenTool, Paintbrush
} from 'lucide-react';
import { ClientRushesSection } from './ClientRushesSection';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ClientBriefProps {
  client: {
    id: string;
    user_id: string;
    strategic_description?: string | null;
    visual_identity_notes?: string | null;
    positioning?: string | null;
    videos_per_month?: number | null;
    studio_location?: string | null;
    shooting_day?: string | null;
    next_shooting_date?: string | null;
    project_end_date?: string | null;
    client_objectives?: string | null;
    tone_style?: string | null;
    has_thumbnail_design?: boolean | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    copywriter_id?: string | null;
    design_posts_per_month?: number | null;
    design_miniatures_per_month?: number | null;
    design_logos_per_month?: number | null;
    design_carousels_per_month?: number | null;
    designer_id?: string | null;
  };
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium whitespace-pre-wrap">{value || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
      </div>
    </div>
  );
}

function EditableDateRow({ icon: Icon, label, value, clientId, field }: {
  icon: any; label: string; value?: string | null; clientId: string; field: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value ? new Date(value) : undefined);
  const [time, setTime] = useState(
    value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '10:00'
  );
  const isTimestamp = field === 'next_shooting_date';

  const handleSave = async () => {
    if (!selectedDate) return;
    let saveValue: string;
    if (isTimestamp) {
      const [h, m] = time.split(':').map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h || 10, m || 0, 0, 0);
      saveValue = dt.toISOString();
    } else {
      saveValue = selectedDate.toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('client_profiles')
      .update({ [field]: saveValue } as any)
      .eq('id', clientId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success(`${label} mis à jour`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
    }
  };

  const displayValue = value
    ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) +
      (isTimestamp ? ' · ' + new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')
    : null;

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 font-medium text-sm hover:text-primary group gap-1.5">
              {displayValue || <span className="text-muted-foreground italic">Non renseigné</span>}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("p-3 pointer-events-auto")}
            />
            {isTimestamp && (
              <div className="px-3 pb-2 flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Heure :</label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-28 h-8 text-sm" />
              </div>
            )}
            <div className="px-3 pb-3">
              <Button size="sm" className="w-full" onClick={handleSave} disabled={!selectedDate}>Enregistrer</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function EditableTextRow({ icon: Icon, label, value, clientId, field }: {
  icon: any; label: string; value?: string | null; clientId: string; field: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value || '');

  const handleSave = async () => {
    const { error } = await supabase
      .from('client_profiles')
      .update({ [field]: text } as any)
      .eq('id', clientId);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success(`${label} mis à jour`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 font-medium text-sm hover:text-primary group gap-1.5">
              {value || <span className="text-muted-foreground italic">Non renseigné</span>}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 pointer-events-auto" align="start">
            <div className="space-y-2">
              <Input value={text} onChange={e => setText(e.target.value)} placeholder={label} />
              <Button size="sm" className="w-full" onClick={handleSave}>Enregistrer</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function ClientBriefSection({ client }: ClientBriefProps) {
  const colors = [client.primary_color, client.secondary_color, client.accent_color].filter(Boolean);
  const queryClient = useQueryClient();
  const [copywriters, setCopywriters] = useState<{ user_id: string; full_name: string }[]>([]);
  const [designers, setDesigners] = useState<{ user_id: string; full_name: string }[]>([]);
  const [savingCopywriter, setSavingCopywriter] = useState(false);
  const [savingDesigner, setSavingDesigner] = useState(false);

  // Fetch design tasks to get carousel page details
  const { data: clientDesignTasks = [] } = useQuery({
    queryKey: ['brief-design-tasks', client.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('design_tasks')
        .select('description')
        .eq('client_user_id', client.user_id)
        .not('status', 'in', '("cancelled")');
      return data || [];
    },
  });

  // Parse carousel pages from design task descriptions
  const carouselPagesLabel = useMemo(() => {
    const pages: number[] = [];
    clientDesignTasks.forEach((dt: any) => {
      if (!dt.description) return;
      const match = dt.description.match(/^\[(.+?)\]/);
      if (!match) return;
      match[1].split('+').map((s: string) => s.trim()).forEach((part: string) => {
        const carM = part.match(/(\d+)x\s*Carrousel\s*(\d+)p/i);
        if (carM) pages.push(parseInt(carM[2]));
      });
    });
    return pages.length > 0 ? pages[0] : null; // Use first found page count
  }, [clientDesignTasks]);

  useEffect(() => {
    supabase
      .from('team_members')
      .select('user_id, full_name')
      .eq('role', 'copywriter')
      .not('user_id', 'is', null)
      .then(({ data }) => {
        if (data) setCopywriters(data as { user_id: string; full_name: string }[]);
      });
    supabase
      .from('team_members')
      .select('user_id, full_name')
      .in('role', ['designer', 'motion_designer'])
      .not('user_id', 'is', null)
      .then(({ data }) => {
        if (data) setDesigners(data as { user_id: string; full_name: string }[]);
      });
  }, []);

  const handleCopywriterChange = async (value: string) => {
    setSavingCopywriter(true);
    const newValue = value === 'none' ? null : value;
    const { error } = await supabase
      .from('client_profiles')
      .update({ copywriter_id: newValue } as any)
      .eq('id', client.id);
    setSavingCopywriter(false);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Copywriter assigné');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  };

  const handleDesignerChange = async (value: string) => {
    setSavingDesigner(true);
    const newValue = value === 'none' ? null : value;
    const { error } = await supabase
      .from('client_profiles')
      .update({ designer_id: newValue } as any)
      .eq('id', client.id);
    setSavingDesigner(false);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Designer assigné');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  };

  const currentCopywriter = copywriters.find(c => c.user_id === client.copywriter_id);

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brief Stratégique */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <h4 className="text-sm font-semibold">Brief Stratégique</h4>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Description</p>
              <p className="text-sm leading-relaxed">{client.strategic_description || <span className="text-muted-foreground italic text-xs">Non renseigné</span>}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Objectifs</p>
              <p className="text-sm leading-relaxed">{client.client_objectives || <span className="text-muted-foreground italic text-xs">Non renseigné</span>}</p>
            </div>
          </div>

          {/* Identité Visuelle */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Palette className="h-4 w-4 text-pink-500" />
              </div>
              <h4 className="text-sm font-semibold">Identité Visuelle</h4>
            </div>
            {colors.length > 0 ? (
              <div className="flex items-center gap-3">
                {colors.map((color, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="h-10 w-10 rounded-xl border-2 border-border shadow-sm" style={{ backgroundColor: color! }} />
                    <span className="text-[10px] text-muted-foreground uppercase">{['Primaire', 'Secondaire', 'Accent'][i]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucune couleur définie</p>
            )}
          </div>

          {/* Pack Vidéo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-emerald-500" />
              </div>
              <h4 className="text-sm font-semibold">Pack Vidéo</h4>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-bold">{client.videos_per_month || '—'}</span>
                <span className="text-xs text-muted-foreground">/ mois</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {client.has_thumbnail_design ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">{client.has_thumbnail_design ? 'Miniature incluse' : 'Sans miniature'}</span>
            </div>
            
            {/* Pack Design */}
            {(client.design_posts_per_month > 0 || client.design_miniatures_per_month > 0 || client.design_logos_per_month > 0 || client.design_carousels_per_month > 0) && (
              <div className="mt-3 border-t border-border/30 pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Pack Design</h4>
                <div className="flex flex-wrap gap-2">
                  {client.design_posts_per_month > 0 && (
                    <span className="text-xs bg-muted/50 rounded-md px-2 py-1">{client.design_posts_per_month}x Post</span>
                  )}
                  {client.design_miniatures_per_month > 0 && (
                    <span className="text-xs bg-muted/50 rounded-md px-2 py-1">{client.design_miniatures_per_month}x Miniature</span>
                  )}
                  {client.design_logos_per_month > 0 && (
                    <span className="text-xs bg-muted/50 rounded-md px-2 py-1">{client.design_logos_per_month}x Logo</span>
                  )}
                  {client.design_carousels_per_month > 0 && (
                    <span className="text-xs bg-muted/50 rounded-md px-2 py-1">{client.design_carousels_per_month}x Carrousel{carouselPagesLabel ? ` ${carouselPagesLabel}p` : ''}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Copywriter, Designer & Rushs */}
          <div className="md:col-span-3 border-t border-border/50 pt-4 mt-2">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <PenTool className="h-4 w-4 text-blue-500" />
                  </div>
                  <h4 className="text-sm font-semibold">Copywriter</h4>
                </div>
                <Select value={client.copywriter_id || 'none'} onValueChange={handleCopywriterChange} disabled={savingCopywriter}>
                  <SelectTrigger className="w-44 h-9">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {copywriters.map(cw => (
                      <SelectItem key={cw.user_id} value={cw.user_id}>{cw.full_name || cw.user_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Paintbrush className="h-4 w-4 text-purple-500" />
                  </div>
                  <h4 className="text-sm font-semibold">Designer</h4>
                </div>
                <Select value={client.designer_id || 'none'} onValueChange={handleDesignerChange} disabled={savingDesigner}>
                  <SelectTrigger className="w-44 h-9">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {designers.map(d => (
                      <SelectItem key={d.user_id} value={d.user_id}>{d.full_name || d.user_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-0">
                <ClientRushesSection clientUserId={client.user_id} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}