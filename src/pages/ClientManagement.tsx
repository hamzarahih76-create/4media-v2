import { useState, useMemo, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { differenceInDays, format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search, Building2, ChevronDown, ChevronRight, ChevronLeft, Pencil, TrendingUp, Clock, AlertCircle, CheckCircle2, CalendarClock, MapPin, CalendarDays, UserCheck, Zap, Flame, BarChart3, Trash2
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useClients } from '@/hooks/useClients';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminWorkflowControl } from '@/components/client-management/AdminWorkflowControl';
import { AdminContractSection } from '@/components/contract/AdminContractSection';
import { ProjectCountdown } from '@/components/client-management/ProjectCountdown';
import { ClientBriefSection } from '@/components/client-management/ClientBriefSection';
import { ClientStatsCards } from '@/components/client-management/ClientStatsCards';
import { EditClientBriefModal } from '@/components/client-management/EditClientBriefModal';
import { ClientContentTabs } from '@/components/client-management/ClientContentTabs';
import { ClientValidationSection } from '@/components/client-management/ClientValidationSection';
import { TodayActionsModal } from '@/components/client-management/TodayActionsModal';
import { OperationalRiskModal } from '@/components/client-management/OperationalRiskModal';

function EditableEndDate({ clientId, projectEndDate }: { clientId: string; projectEndDate?: string | null }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(projectEndDate ? new Date(projectEndDate) : undefined);
  const qc = useQueryClient();

  const handleSelect = async (d: Date | undefined) => {
    if (!d) return;
    setDate(d);
    const { error } = await supabase
      .from('client_profiles')
      .update({ project_end_date: d.toISOString() } as any)
      .eq('id', clientId);
    if (error) { toast.error('Erreur'); } else {
      toast.success('Date de fin mise à jour');
      qc.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 hover:text-foreground transition-colors" onClick={e => e.stopPropagation()}>
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{projectEndDate ? `Fin : ${new Date(projectEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Définir date de fin'}</span>
          <Pencil className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start" onClick={e => e.stopPropagation()}>
        <Calendar mode="single" selected={date} onSelect={handleSelect} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

const WORKFLOW_STATUSES = ['idea', 'script', 'filmmaking', 'editing', 'publication', 'analysis'];

export default function ClientManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const { data: clients = [], isLoading: isLoadingClients } = useClients();

  const { data: tasks = [] } = useQuery({
    queryKey: ['client-management-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*');
      return data || [];
    },
  });

  const { data: designTasks = [] } = useQuery({
    queryKey: ['client-management-design-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('design_tasks').select('*');
      return data || [];
    },
  });

  const { data: allVideos = [] } = useQuery({
    queryKey: ['client-management-videos'],
    queryFn: async () => {
      const { data } = await supabase.from('videos').select('id, is_validated, validated_at, task_id, status');
      return data || [];
    },
  });

  // Realtime subscription for design_tasks changes (sync from Designer)
  const queryClient2 = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('design-tasks-realtime-mgr')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'design_tasks' },
        () => {
          queryClient2.invalidateQueries({ queryKey: ['client-management-design-tasks'] });
          queryClient2.invalidateQueries({ queryKey: ['admin-client-design-tasks'] });
          queryClient2.invalidateQueries({ queryKey: ['clients'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient2]);

  const clientStats = useMemo(() => {
    return clients.map((client: any) => {
      const matchesClient = (t: any) => 
        (t.client_user_id && t.client_user_id === client.user_id) ||
        (t.client_name && client.company_name && t.client_name.toLowerCase().trim() === client.company_name.toLowerCase().trim());
      
      const ct = tasks.filter(matchesClient);
      const cd = designTasks.filter(matchesClient);

      return {
        ...client,
        activeVideoProjects: ct.filter((t: any) => !['completed', 'cancelled'].includes(t.status)).length,
        activeDesignProjects: cd.filter((t: any) => !['completed', 'cancelled'].includes(t.status)).length,
        totalVideoProjects: ct.length,
        totalDesignProjects: cd.length,
        totalVideosOrdered: ct.reduce((s: number, t: any) => s + (t.video_count || 0), 0),
        totalVideosDelivered: ct.reduce((s: number, t: any) => s + (t.videos_completed || 0), 0),
        totalDesignsOrdered: cd.reduce((s: number, t: any) => s + (t.design_count || 0), 0),
        totalDesignsDelivered: cd.reduce((s: number, t: any) => s + (t.designs_completed || 0), 0),
        pendingFeedback: ct.filter((t: any) => t.status === 'in_review').length + cd.filter((t: any) => t.status === 'in_review').length,
        revisionRequests: ct.filter((t: any) => t.status === 'revision_requested').length + cd.filter((t: any) => t.status === 'revision_requested').length,
      };
    });
  }, [clients, tasks, designTasks]);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const filtered = clientStats.filter((c: any) => {
    const matchesSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || (c.workflow_status || 'idea') === statusFilter;
    
    // Check if client has any task active during the selected month
    const matchesC = (t: any) => 
      (t.client_user_id && t.client_user_id === c.user_id) ||
      (t.client_name && c.company_name && t.client_name.toLowerCase().trim() === c.company_name.toLowerCase().trim());
    const ct = tasks.filter(matchesC);
    const cd = designTasks.filter(matchesC);
    const allTasks = [...ct, ...cd];
    const matchesMonth = allTasks.some((t: any) => {
      const createdAt = new Date(t.created_at);
      const completedAt = t.completed_at ? new Date(t.completed_at) : new Date();
      // Task overlaps with the selected month
      return createdAt <= monthEnd && completedAt >= monthStart;
    });
    // If no tasks, show client if created during or before this month
    const fallback = allTasks.length === 0 && new Date(c.created_at) <= monthEnd;

    return matchesSearch && matchesStatus && (matchesMonth || fallback);
  });

  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const globalStats = useMemo(() => {
    const matchClient = (c: any) => (t: any) =>
      (t.client_user_id && t.client_user_id === c.user_id) ||
      (t.client_name && c.company_name && t.client_name.toLowerCase().trim() === c.company_name.toLowerCase().trim());

    const totalAll = filtered.length;
    const activeStatuses = ['idea', 'script', 'filmmaking', 'editing', 'publication', 'analysis'];
    // "En retard" = clients whose project_end_date is within 7 days or already past
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const isLate = (c: any) => {
      const ws = (c.workflow_status || 'idea').toLowerCase();
      if (ws === 'analysis') return false; // completed clients are not late
      return c.project_end_date && new Date(c.project_end_date) <= sevenDaysFromNow;
    };
    const lateClients = filtered.filter(isLate);
    const totalSlow = lateClients.length;
    // "En cours" = active workflow BUT exclude late clients
    const totalActive = filtered.filter((c: any) => {
      const ws = (c.workflow_status || 'idea').toLowerCase();
      return activeStatuses.includes(ws) && ws !== 'analysis' && !isLate(c);
    }).length;
    const totalCompleted = filtered.filter((c: any) => {
      const ws = (c.workflow_status || 'idea').toLowerCase();
      if (ws === 'analysis') return true;
      const ct = tasks.filter(matchClient(c));
      const cd = designTasks.filter(matchClient(c));
      const allTasks = [...ct, ...cd];
      return allTasks.length > 0 && allTasks.every((t: any) => ['completed', 'cancelled'].includes(t.status));
    }).length;
    const totalPending = filtered.filter((c: any) => c.pendingFeedback > 0).length;
    
    // Monthly progress - count clients as projects, completed = analysis workflow or all tasks done
    const totalProjects = filtered.length;
    const completedProjects = filtered.filter((c: any) => {
      const ws = (c.workflow_status || 'idea').toLowerCase();
      if (ws === 'analysis') return true;
      const ct = tasks.filter(matchClient(c));
      const cd = designTasks.filter(matchClient(c));
      const allTasks = [...ct, ...cd];
      return allTasks.length > 0 && allTasks.every((t: any) => ['completed', 'cancelled'].includes(t.status));
    }).length;

    // À traiter aujourd'hui - detailed items
    const pendingValidationItems = [
      ...tasks.filter((t: any) => t.status === 'in_review').map((t: any) => ({
        id: t.id, type: 'video' as const, label: t.title || t.project_name, client: t.client_name, clientUserId: t.client_user_id,
      })),
      ...designTasks.filter((t: any) => t.status === 'in_review').map((t: any) => ({
        id: t.id, type: 'design' as const, label: t.title || t.project_name, client: t.client_name, clientUserId: t.client_user_id,
      })),
    ];
    const unvalidatedScriptItems = tasks.filter((t: any) => t.status === 'script_pending' || t.status === 'script').map((t: any) => ({
      id: t.id, type: 'script' as const, label: t.title || t.project_name, client: t.client_name, clientUserId: t.client_user_id,
    }));
    const readyToPublishItems = tasks.filter((t: any) => t.status === 'delivered' || t.status === 'validated').map((t: any) => ({
      id: t.id, type: 'publish' as const, label: t.title || t.project_name, client: t.client_name, clientUserId: t.client_user_id,
    }));
    const pendingValidations = pendingValidationItems.length;
    const unvalidatedScripts = unvalidatedScriptItems.length;
    const readyToPublish = readyToPublishItems.length;
    const todayActions = pendingValidations + unvalidatedScripts + readyToPublish;

    // Risque opérationnel - detailed items
    const now = new Date();
    const notStartedEditorItems = tasks.filter((t: any) => t.assigned_to && !t.started_at && t.status !== 'completed' && t.status !== 'cancelled').map((t: any) => ({
      id: t.id, type: 'not_started' as const, label: t.title || t.project_name, client: t.client_name, clientUserId: t.client_user_id,
    }));
    const staleScriptItems = tasks.filter((t: any) => {
      if (t.status !== 'script_pending' && t.status !== 'script') return false;
      const created = new Date(t.created_at);
      return differenceInDays(now, created) >= 3;
    }).map((t: any) => ({
      id: t.id, type: 'stale_script' as const, label: t.title || t.project_name, client: t.client_name, clientUserId: t.client_user_id,
    }));
    const missingRushItems = filtered.filter((c: any) => {
      const ct = tasks.filter((t: any) => t.client_user_id === c.user_id && !['completed', 'cancelled'].includes(t.status));
      return ct.length > 0 && !c.next_shooting_date;
    }).map((c: any) => ({
      id: c.id, type: 'missing_rush' as const, label: c.company_name, client: c.company_name, clientUserId: c.user_id,
    }));
    const notStartedEditors = notStartedEditorItems.length;
    const staleScripts = staleScriptItems.length;
    const missingRushes = missingRushItems.length;
    const operationalRisks = notStartedEditors + staleScripts + missingRushes;

    return {
      totalAll, totalActive, totalSlow, totalCompleted, totalPending,
      totalProjects, completedProjects,
      todayActions, pendingValidations, unvalidatedScripts, readyToPublish,
      pendingValidationItems, unvalidatedScriptItems, readyToPublishItems,
      operationalRisks, notStartedEditors, staleScripts, missingRushes,
      notStartedEditorItems, staleScriptItems, missingRushItems,
    };
  }, [filtered, tasks, designTasks, monthEnd]);

  const finalFiltered = useMemo(() => {
    if (!cardFilter) return filtered;
    return filtered.filter((c: any) => {
      const matchC = (t: any) =>
        (t.client_user_id && t.client_user_id === c.user_id) ||
        (t.client_name && c.company_name && t.client_name.toLowerCase().trim() === c.company_name.toLowerCase().trim());
      const ct = tasks.filter(matchC);
      const cd = designTasks.filter(matchC);
      const activeStatuses = ['idea', 'script', 'filmmaking', 'editing', 'publication', 'analysis'];
      switch (cardFilter) {
        case 'active': {
          const sevenDaysActive = new Date();
          sevenDaysActive.setDate(sevenDaysActive.getDate() + 7);
          const isLateCl = c.project_end_date && new Date(c.project_end_date) <= sevenDaysActive;
          const ws = (c.workflow_status || 'idea').toLowerCase();
          return activeStatuses.includes(ws) && ws !== 'analysis' && !isLateCl;
        }
        case 'slow': {
          const wsLate = (c.workflow_status || 'idea').toLowerCase();
          if (wsLate === 'analysis') return false;
          const sevenDays = new Date();
          sevenDays.setDate(sevenDays.getDate() + 7);
          return c.project_end_date && new Date(c.project_end_date) <= sevenDays;
        }
        case 'completed': {
          const ws2 = (c.workflow_status || 'idea').toLowerCase();
          if (ws2 === 'analysis') return true;
          const allTasks = [...ct, ...cd];
          return allTasks.length > 0 && allTasks.every((t: any) => ['completed', 'cancelled'].includes(t.status));
        }
        case 'pending':
          return c.pendingFeedback > 0;
        default:
          return true;
      }
    });
  }, [filtered, cardFilter, tasks, designTasks]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-8 text-white shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-800/20 blur-2xl" />
          <div className="relative text-center">
            <h1 className="text-3xl font-bold tracking-tight">Gestion Client</h1>
            <p className="mt-1.5 text-emerald-100/90 text-sm">Centre d'information interne — projets, briefs et workflow par client</p>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
            <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="p-1 rounded-md hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-[160px] justify-center">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: fr })}</span>
            </div>
            <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="p-1 rounded-md hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Monthly Performance Progress */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Performance du mois</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {globalStats.completedProjects}/{globalStats.totalProjects} projets terminés ({globalStats.totalProjects > 0 ? Math.round((globalStats.completedProjects / globalStats.totalProjects) * 100) : 0}%)
              </span>
            </div>
            <Progress value={globalStats.totalProjects > 0 ? (globalStats.completedProjects / globalStats.totalProjects) * 100 : 0} className="h-2.5" />
          </CardContent>
        </Card>

        {/* Operational cards row */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {/* À traiter aujourd'hui */}
          <Card 
            className={cn(
              "border-2 transition-all cursor-pointer hover:shadow-lg",
              globalStats.todayActions > 0 
                ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-md hover:border-amber-500" 
                : "border-border hover:border-muted-foreground/30"
            )}
            onClick={() => setShowTodayModal(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">⚡ À traiter aujourd'hui</p>
                    <p className="text-xs text-muted-foreground">{globalStats.todayActions} action{globalStats.todayActions !== 1 ? 's' : ''} en attente</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {globalStats.todayActions > 0 && (
                    <Badge className="bg-amber-500 text-white border-0">{globalStats.todayActions}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {globalStats.todayActions > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {globalStats.pendingValidations > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-300">{globalStats.pendingValidations} validation{globalStats.pendingValidations > 1 ? 's' : ''}</Badge>
                  )}
                  {globalStats.unvalidatedScripts > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 border-blue-300">{globalStats.unvalidatedScripts} script{globalStats.unvalidatedScripts > 1 ? 's' : ''}</Badge>
                  )}
                  {globalStats.readyToPublish > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-300">{globalStats.readyToPublish} à publier</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risque opérationnel */}
          <Card 
            className={cn(
              "border-2 transition-all cursor-pointer hover:shadow-lg",
              globalStats.operationalRisks > 0 
                ? "border-red-400 bg-red-50/50 dark:bg-red-950/20 shadow-md hover:border-red-500" 
                : "border-border hover:border-muted-foreground/30"
            )}
            onClick={() => setShowRiskModal(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center",
                    globalStats.operationalRisks > 0 ? "bg-red-500/15" : "bg-muted"
                  )}>
                    <Flame className={cn("h-5 w-5", globalStats.operationalRisks > 0 ? "text-red-600" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">🔥 Risque opérationnel</p>
                    <p className="text-xs text-muted-foreground">{globalStats.operationalRisks} élément{globalStats.operationalRisks !== 1 ? 's' : ''} bloquant{globalStats.operationalRisks !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {globalStats.operationalRisks > 0 && (
                    <Badge className="bg-red-500 text-white border-0">{globalStats.operationalRisks}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {globalStats.operationalRisks > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {globalStats.notStartedEditors > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-300">{globalStats.notStartedEditors} non démarré{globalStats.notStartedEditors > 1 ? 's' : ''}</Badge>
                  )}
                  {globalStats.staleScripts > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 border-orange-300">{globalStats.staleScripts} script{globalStats.staleScripts > 1 ? 's' : ''} bloqué{globalStats.staleScripts > 1 ? 's' : ''}</Badge>
                  )}
                  {globalStats.missingRushes > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/10 border-yellow-300">{globalStats.missingRushes} sans tournage</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <TodayActionsModal
          open={showTodayModal}
          onOpenChange={setShowTodayModal}
          pendingValidationItems={globalStats.pendingValidationItems}
          unvalidatedScriptItems={globalStats.unvalidatedScriptItems}
          readyToPublishItems={globalStats.readyToPublishItems}
          onNavigateToClient={(id) => setExpandedClient(id)}
        />
        <OperationalRiskModal
          open={showRiskModal}
          onOpenChange={setShowRiskModal}
          notStartedEditorItems={globalStats.notStartedEditorItems}
          staleScriptItems={globalStats.staleScriptItems}
          missingRushItems={globalStats.missingRushItems}
          onNavigateToClient={(id) => setExpandedClient(id)}
        />

        {/* Global KPIs - clickable filters */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <KpiCard icon={Building2} value={globalStats.totalAll} label="Tous les projets" color="text-primary" bg="bg-primary/10" active={cardFilter === null} onClick={() => setCardFilter(null)} />
          <KpiCard 
            icon={TrendingUp} 
            value={globalStats.totalActive} 
            label="En cours" 
            color="text-amber-500" 
            bg="bg-amber-500/10" 
            active={cardFilter === 'active'} 
            onClick={() => setCardFilter(cardFilter === 'active' ? null : 'active')} 
          />
          <KpiCard 
            icon={AlertCircle} 
            value={globalStats.totalSlow} 
            label="En retard" 
            color={globalStats.totalSlow > 0 ? "text-red-600" : "text-muted-foreground"}
            bg={globalStats.totalSlow > 0 ? "bg-red-500/15" : "bg-muted"}
            active={cardFilter === 'slow'} 
            onClick={() => setCardFilter(cardFilter === 'slow' ? null : 'slow')}
            urgent={globalStats.totalSlow > 0}
            urgentShadow={globalStats.totalSlow > 2}
          />
          <KpiCard icon={CheckCircle2} value={globalStats.totalCompleted} label="Terminés" color="text-green-500" bg="bg-green-500/10" active={cardFilter === 'completed'} onClick={() => setCardFilter(cardFilter === 'completed' ? null : 'completed')} />
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {WORKFLOW_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pending clients section */}
        {(() => {
          const pendingClients = clients.filter((c: any) => c.account_status === 'pending');
          if (pendingClients.length === 0) return null;
          return (
            <div className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-500" />
                Clients en attente de validation ({pendingClients.length})
              </h2>
              {pendingClients.map((client: any) => (
                <ClientValidationSection key={client.id} client={client} />
              ))}
            </div>
          );
        })()}

        {/* Client list */}
        {isLoadingClients ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Aucun client trouvé</h3>
            <p className="text-muted-foreground">{search ? 'Aucun résultat pour cette recherche' : 'Aucun client enregistré'}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {finalFiltered.filter((c: any) => c.account_status !== 'pending').map((client: any) => {
              const isExpanded = expandedClient === client.id;
              return (
                <Collapsible key={client.id} open={isExpanded} onOpenChange={() => setExpandedClient(isExpanded ? null : client.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-lg shrink-0">
                            {client.avatar_url ? (
                              <AvatarImage src={client.avatar_url} alt={client.company_name} className="rounded-lg object-cover" />
                            ) : null}
                            <AvatarFallback className="rounded-lg text-xs font-semibold" style={{ backgroundColor: `${client.primary_color || '#22c55e'}20`, color: client.primary_color || 'hsl(var(--primary))' }}>
                              {(client.company_name || '').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{client.company_name}</CardTitle>
                              <Badge variant={client.subscription_type === 'premium' ? 'default' : 'secondary'} className="text-[10px]">
                                {client.subscription_type || 'starter'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">{client.workflow_status || 'idea'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{client.contact_name}</p>
                          </div>
                          <div className="hidden md:flex items-center justify-center flex-1 gap-3">
                            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-5 py-2 shadow-sm">
                              <span className="text-lg font-extrabold capitalize text-foreground">
                                {client.workflow_status || 'idea'}
                              </span>
                              {client.project_end_date && (
                                <div className="border-l pl-3">
                                  <ProjectCountdown endDate={client.project_end_date} />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                            <EditableEndDate clientId={client.id} projectEndDate={client.project_end_date} />
                            {client.pendingFeedback > 0 && <Badge variant="outline" className="text-yellow-600 text-[10px]">{client.pendingFeedback} en attente</Badge>}
                            {client.revisionRequests > 0 && <Badge variant="outline" className="text-orange-600 text-[10px]">{client.revisionRequests} révisions</Badge>}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={e => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={e => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer {client.company_name} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Toutes les données du client (vidéos, tâches, contenus, feedbacks) seront définitivement supprimées.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
                                        body: { user_id: client.user_id, email: client.email }
                                      });
                                      if (error) throw error;
                                      toast.success(`${client.company_name} supprimé avec succès`);
                                      queryClient2.invalidateQueries({ queryKey: ['clients'] });
                                    } catch (err: any) {
                                      toast.error(err.message || 'Erreur lors de la suppression');
                                    }
                                  }}
                                >
                                  Supprimer définitivement
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-5 border-t pt-5">
                        <AdminWorkflowControl
                          clientId={client.id}
                          clientUserId={client.user_id}
                          currentStatus={client.workflow_status || 'idea'}
                          isAdmin={true}
                          nextShootingDate={client.next_shooting_date}
                          studioLocation={client.studio_location}
                        />

                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Fiche Brief Interne</h3>
                          <Button variant="outline" size="sm" onClick={() => setEditingClient(client)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                          </Button>
                        </div>
                        <ClientBriefSection client={client} />


                        <div className="pt-2">
                          <h3 className="text-sm font-semibold mb-3">Contenu du client</h3>
                          <ClientContentTabs clientUserId={client.user_id} />
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {editingClient && (
        <EditClientBriefModal
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          client={editingClient}
        />
      )}
    </DashboardLayout>
  );
}

function KpiCard({ icon: Icon, value, label, color, bg, active, onClick, urgent, urgentShadow }: { icon: any; value: number; label: string; color: string; bg: string; active?: boolean; onClick?: () => void; urgent?: boolean; urgentShadow?: boolean }) {
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        active && 'ring-2 ring-primary shadow-md',
        urgent && 'border-red-400 bg-red-50/50 dark:bg-red-950/20',
        urgentShadow && 'shadow-red-200 dark:shadow-red-900/30 shadow-lg'
      )} 
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', bg)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {urgent && value > 0 && (
            <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-0.5">⚠️ Action requise immédiatement</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
