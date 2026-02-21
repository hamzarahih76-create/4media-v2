import { cn } from '@/lib/utils';
import {
  Lightbulb, FileText, Camera, Film, Send, BarChart3, Check, Video, Palette, MapPin, Plus, Trash2, ChevronDown, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const WORKFLOW_STEPS = [
  { key: 'idea', label: 'Idée', icon: Lightbulb, description: 'Brainstorming & concepts' },
  { key: 'script', label: 'Script', icon: FileText, description: 'Rédaction & validation' },
  { key: 'filmmaking', label: 'Filmmaking', icon: Camera, description: 'Tournage & production' },
  { key: 'editing', label: 'Montage & Design', icon: Film, description: 'Édition vidéo & visuels' },
  { key: 'publication', label: 'Publication', icon: Send, description: 'Mise en ligne' },
  { key: 'analysis', label: 'Analyse', icon: BarChart3, description: 'Performance & insights' },
];

interface AdminWorkflowControlProps {
  clientId: string;
  clientUserId: string;
  currentStatus: string;
  isAdmin?: boolean;
  nextShootingDate?: string | null;
  studioLocation?: string | null;
}

interface StageKPI {
  label: string;
  validated: number;
  total: number;
  icon: any;
  color: string;
  bg: string;
  secondRow?: { label: string; validated: number; total: number; icon: any; color: string; bg: string };
  isShootingDate?: boolean;
}

function useStageStats(clientUserId: string) {
  const { data: contentItems = [] } = useQuery({
    queryKey: ['workflow-content', clientUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_content_items')
        .select('*')
        .eq('client_user_id', clientUserId);
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['workflow-tasks', clientUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, videos(*)')
        .eq('client_user_id', clientUserId);
      return data || [];
    },
  });

  const { data: designTasks = [] } = useQuery({
    queryKey: ['workflow-designs', clientUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('design_tasks')
        .select('*')
        .eq('client_user_id', clientUserId);
      return data || [];
    },
  });

  // Ideas
  const ideas = contentItems.filter((i: any) => i.workflow_step === 'idea');
  const ideasValidated = ideas.filter((i: any) => i.status === 'approved').length;

  // Scripts
  const scripts = contentItems.filter((i: any) => i.workflow_step === 'script');
  const scriptsValidated = scripts.filter((i: any) => i.status === 'approved').length;

  // Filmmaking - all videos across all tasks
  const allVideos = tasks.flatMap((t: any) => t.videos || []);
  const totalVideos = allVideos.length;
  const videosShot = allVideos.filter((v: any) => 
    ['editing', 'review_admin', 'review_client', 'completed', 'validated'].includes(v.status)
  ).length;

  // Editing - videos completed/validated
  const videosEdited = allVideos.filter((v: any) => 
    ['review_admin', 'review_client', 'completed', 'validated'].includes(v.status)
  ).length;
  const totalVideoCount = tasks.reduce((s: number, t: any) => s + (t.video_count || 0), 0) || totalVideos;

  // Designs
  const totalDesigns = designTasks.reduce((s: number, t: any) => s + (t.design_count || 0), 0);
  const designsCompleted = designTasks.reduce((s: number, t: any) => s + (t.designs_completed || 0), 0);

  // Publication - content scheduled in planning
  const planningItems = contentItems.filter((i: any) => i.workflow_step === 'planning');
  const totalPlanned = planningItems.length;
  const scheduledReady = planningItems.filter((i: any) => i.status === 'approved' || i.status === 'published').length;

  // Analysis
  const publishedItems = contentItems.filter((i: any) => i.status === 'published');

  const stageMap: Record<string, StageKPI> = {
    idea: {
      label: 'Idées validées',
      validated: ideasValidated,
      total: ideas.length,
      icon: Lightbulb,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    script: {
      label: 'Scripts validés',
      validated: scriptsValidated,
      total: scripts.length,
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    filmmaking: {
      label: 'Prochain tournage',
      validated: 0,
      total: 0,
      icon: Camera,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      isShootingDate: true,
    },
    editing: {
      label: 'Vidéos montées',
      validated: videosEdited,
      total: totalVideoCount || totalVideos,
      icon: Video,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      secondRow: {
        label: 'Designs livrés',
        validated: designsCompleted,
        total: totalDesigns,
        icon: Palette,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
      },
    },
    publication: {
      label: 'Prêts à publier',
      validated: scheduledReady,
      total: totalPlanned || (totalVideoCount + totalDesigns),
      icon: Send,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    analysis: {
      label: 'Analysés',
      validated: publishedItems.length,
      total: publishedItems.length,
      icon: BarChart3,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  };

  return stageMap;
}

function ShootingDateKPI({ shootingDate, clientId, studioLocation }: { shootingDate?: string | null; clientId: string; studioLocation?: string | null }) {
  const queryClient = useQueryClient();
  const { data: existingLocations = [] } = useQuery({
    queryKey: ['studio-locations'],
    queryFn: async () => {
      const { data } = await supabase.from('studio_locations').select('name').order('name');
      return (data || []).map((d: any) => d.name) as string[];
    },
  });

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    shootingDate ? new Date(shootingDate) : undefined
  );
  const [time, setTime] = useState(
    shootingDate ? new Date(shootingDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '10:00'
  );
  const [location, setLocation] = useState(studioLocation || '');
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const handleDeleteLocation = async (name: string) => {
    await supabase.from('studio_locations').delete().eq('name', name);
    queryClient.invalidateQueries({ queryKey: ['studio-locations'] });
    if (location === name) setLocation('');
    toast.success('Lieu supprimé');
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h || 10, m || 0, 0, 0);
    if (isNewLocation && location.trim()) {
      await supabase.from('studio_locations').upsert({ name: location.trim() } as any, { onConflict: 'name' });
      queryClient.invalidateQueries({ queryKey: ['studio-locations'] });
    }
    const { error } = await supabase
      .from('client_profiles')
      .update({ next_shooting_date: dt.toISOString(), studio_location: location || null } as any)
      .eq('id', clientId);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Tournage mis à jour');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
      setIsNewLocation(false);
    }
  };

  const displayDate = shootingDate
    ? new Date(shootingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
      ' · ' +
      new Date(shootingDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="space-y-1.5 w-full cursor-pointer">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center hover:bg-white/10 transition-colors">
            <p className="text-base font-bold text-white">{displayDate}</p>
            {studioLocation && (
              <p className="text-[9px] text-white/50 leading-tight flex items-center justify-center gap-1 mt-0.5">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {studioLocation}
              </p>
            )}
            <p className="text-[9px] text-white/50 leading-tight">Prochain tournage</p>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="center">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="p-3"
        />
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Heure :</label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-28 h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Lieu :</span>
            </div>
            {!isNewLocation ? (
              <Popover open={locationDropdownOpen} onOpenChange={setLocationDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 w-full justify-between text-sm font-normal">
                    {location || 'Sélectionner un lieu'}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-1 pointer-events-auto" align="start">
                  <div className="max-h-48 overflow-y-auto">
                    {existingLocations.map(loc => (
                      <div key={loc} className="flex items-center justify-between group">
                        <button
                          className={cn("flex-1 text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent", location === loc && "bg-accent font-medium")}
                          onClick={() => { setLocation(loc); setLocationDropdownOpen(false); }}
                        >{loc}</button>
                        <button
                          className="px-2 py-1.5 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded-sm transition-opacity"
                          onClick={async (e) => { e.stopPropagation(); await handleDeleteLocation(loc); }}
                        ><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-1 pt-1">
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent flex items-center gap-1.5"
                      onClick={() => { setIsNewLocation(true); setLocation(''); setLocationDropdownOpen(false); }}
                    ><Plus className="h-3 w-3" /> Nouveau lieu</button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex gap-1.5">
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Adresse du studio..." className="h-8 text-sm" autoFocus />
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setIsNewLocation(false); setLocation(studioLocation || ''); }}>✕</Button>
              </div>
            )}
          </div>
          <Button size="sm" className="w-full" onClick={handleSave} disabled={!selectedDate}>Enregistrer</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MiniKPI({ kpi, shootingDate, clientId, studioLocation }: { kpi: StageKPI; shootingDate?: string | null; clientId?: string; studioLocation?: string | null }) {
  if (kpi.isShootingDate && clientId) {
    return <ShootingDateKPI shootingDate={shootingDate} clientId={clientId} studioLocation={studioLocation} />;
  }

  const pct = kpi.total > 0 ? Math.round((kpi.validated / kpi.total) * 100) : 0;
  const isComplete = kpi.total > 0 && kpi.validated >= kpi.total;

  return (
    <div className="space-y-1.5 w-full">
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
        <p className={cn(
          'text-base font-bold',
          isComplete ? 'text-green-400' : 'text-white'
        )}>
          {kpi.validated}/{kpi.total}
        </p>
        <p className="text-[9px] text-white/50 leading-tight">{kpi.label}</p>
        {kpi.total > 0 && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isComplete ? 'bg-green-400' : pct > 50 ? 'bg-amber-400' : 'bg-white/30'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      {kpi.secondRow && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
          <p className={cn(
            'text-base font-bold',
            kpi.secondRow.total > 0 && kpi.secondRow.validated >= kpi.secondRow.total ? 'text-green-400' : 'text-white'
          )}>
            {kpi.secondRow.validated}/{kpi.secondRow.total}
          </p>
          <p className="text-[9px] text-white/50 leading-tight">{kpi.secondRow.label}</p>
          {kpi.secondRow.total > 0 && (
            <div className="mt-1.5 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  kpi.secondRow.validated >= kpi.secondRow.total ? 'bg-green-400' : 'bg-white/30'
                )}
                style={{ width: `${Math.round((kpi.secondRow.validated / kpi.secondRow.total) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminWorkflowControl({ clientId, clientUserId, currentStatus, isAdmin = false, nextShootingDate, studioLocation }: AdminWorkflowControlProps) {
  const queryClient = useQueryClient();
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.key === currentStatus);
  const stageStats = useStageStats(clientUserId);

  const handleStepClick = async (stepKey: string) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from('client_profiles')
      .update({ workflow_status: stepKey } as any)
      .eq('id', clientId);
    if (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    } else {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  };

  return (
    <div className="w-full rounded-xl bg-sidebar p-6">
      <h3 className="text-sm font-semibold text-white mb-5">Avancement du projet</h3>
      
      {/* Desktop */}
      <div className="hidden md:flex items-start justify-between gap-2 relative">
        <div className="absolute top-6 left-[calc(8.33%+12px)] right-[calc(8.33%+12px)] h-0.5 bg-white/10" />

        {WORKFLOW_STEPS.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const kpi = stageStats[step.key];

          return (
            <div
              key={step.key}
              className={cn(
                'flex flex-col items-center text-center flex-1 relative z-10',
                isAdmin && 'cursor-pointer'
              )}
              onClick={() => handleStepClick(step.key)}
            >
              <div
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all',
                  isPast && 'bg-green-500 border-green-500 text-white',
                  isCurrent && 'bg-green-500/80 border-green-500 text-white animate-pulse',
                  isFuture && 'bg-white/10 border-white/20 text-white/40'
                )}
              >
                {isPast ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                'mt-3 text-xs font-medium',
                isFuture ? 'text-white/40' : 'text-white'
              )}>
                {step.label}
              </span>
              <span className="text-[10px] text-white/30 mt-0.5 mb-2">{step.description}</span>
              
              {/* KPI Card */}
              {kpi && <MiniKPI kpi={kpi} shootingDate={step.key === 'filmmaking' ? nextShootingDate : undefined} clientId={step.key === 'filmmaking' ? clientId : undefined} studioLocation={step.key === 'filmmaking' ? studioLocation : undefined} />}
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {WORKFLOW_STEPS.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const kpi = stageStats[step.key];

          return (
            <div
              key={step.key}
              className={cn('flex items-center gap-3', isAdmin && 'cursor-pointer')}
              onClick={() => handleStepClick(step.key)}
            >
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0',
                isPast && 'bg-green-500 border-green-500 text-white',
                isCurrent && 'bg-green-500/80 border-green-500 text-white',
                isFuture && 'bg-white/10 border-white/20 text-white/40'
              )}>
                {isPast ? <Check className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn('text-xs', isFuture ? 'text-white/40' : 'text-white font-medium')}>
                  {step.label}
                </span>
                {kpi && kpi.total > 0 && (
                  <span className="text-[10px] text-white/50 ml-2">
                    {kpi.validated}/{kpi.total}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
