import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DesignerLayout } from '@/components/layout/DesignerLayout';
import { FullProfileCompletionModal } from '@/components/editor/FullProfileCompletionModal';
import { ProfilePendingValidation } from '@/components/editor/ProfilePendingValidation';
import { MonthSelector, isWithinMonth } from '@/components/editor/MonthSelector';
import { CreateDesignTaskModal } from '@/components/designer/CreateDesignTaskModal';
import { DesignerProfileCard } from '@/components/designer/DesignerProfileCard';
import { DesignerStatCard } from '@/components/designer/DesignerStatCard';
import { DesignerProjectRow } from '@/components/designer/DesignerProjectRow';
import { startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { 
  Palette, 
  Clock, 
  Star, 
  TrendingUp, 
  Loader2, 
  Plus,
  Sparkles,
  CreditCard,
  FolderClock,
  FolderOpen,
  Coins,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDesignerProfile, useDesignerStats } from '@/hooks/useDesignerProfile';
import { useDesignerTasks, useStartDesignTask, DesignTask } from '@/hooks/useDesignerTasks';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// Calculate per-item earnings from an item label like "[Miniature 2]", "[Carrousel 6p]"
function calcItemEarningFromLabel(itemLabel: string, taskDescription: string | null): number {
  if (!itemLabel) return 40;
  if (/Carrousel/i.test(itemLabel)) {
    // Get page count from task description
    const descMatch = (taskDescription || '').match(/\[([^\]]+)\]/);
    if (descMatch) {
      const entries = descMatch[1].split('+').map(s => s.trim());
      for (const entry of entries) {
        const cm = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
        if (cm) return (parseInt(cm[2]) / 2) * 40;
      }
    }
    return 80; // default 4p
  }
  if (/Post|Miniature/i.test(itemLabel)) return 40;
  return 40;
}

export default function DesignerDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { tasks, stats, isLoading: tasksLoading, refetch } = useDesignerTasks();
  const { profile, teamMember, needsProfileCompletion, isAwaitingValidation, isLoading: profileLoading } = useDesignerProfile();
  const { data: designerStats } = useDesignerStats();

  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [approvedFeedbacks, setApprovedFeedbacks] = useState<Array<{
    reviewed_at: string;
    notes: string | null;
    task_description: string | null;
  }>>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [earningsGraphOpen, setEarningsGraphOpen] = useState(false);

  const { startTask } = useStartDesignTask();

  // Fetch approved feedbacks for per-item earnings
  useEffect(() => {
    const fetchApprovedFeedbacks = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('design_feedback')
        .select('reviewed_at, delivery_id')
        .eq('decision', 'approved');
      
      if (error || !data || data.length === 0) {
        setApprovedFeedbacks([]);
        return;
      }

      // Get delivery notes and task descriptions
      const deliveryIds = [...new Set(data.map(f => f.delivery_id))];
      const { data: deliveries } = await supabase
        .from('design_deliveries')
        .select('id, notes, design_task_id, designer_id')
        .in('id', deliveryIds);

      if (!deliveries) { setApprovedFeedbacks([]); return; }

      // Filter to only this designer's deliveries
      const myDeliveries = deliveries.filter(d => d.designer_id === user.id);
      if (myDeliveries.length === 0) { setApprovedFeedbacks([]); return; }

      const taskIds = [...new Set(myDeliveries.map(d => d.design_task_id))];
      const { data: tasksData } = await supabase
        .from('design_tasks')
        .select('id, description')
        .in('id', taskIds);

      const taskMap = new Map((tasksData || []).map(t => [t.id, t.description]));
      const deliveryMap = new Map(myDeliveries.map(d => [d.id, d]));

      const results = data
        .filter(f => deliveryMap.has(f.delivery_id))
        .map(f => {
          const del = deliveryMap.get(f.delivery_id)!;
          return {
            reviewed_at: f.reviewed_at,
            notes: del.notes,
            task_description: taskMap.get(del.design_task_id) || null,
          };
        });

      setApprovedFeedbacks(results);
    };
    fetchApprovedFeedbacks();
  }, [user?.id, tasks]);

  // Load avatar
  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (teamMember?.avatar_url) {
        const { data, error } = await supabase.storage
          .from('editor-documents')
          .createSignedUrl(teamMember.avatar_url, 3600);
        if (!error && data) {
          setAvatarUrl(data.signedUrl);
        }
      }
    };
    loadAvatarUrl();
  }, [teamMember?.avatar_url]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Filter tasks by month
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.status === 'new') return true;
      if (task.started_at && isWithinMonth(new Date(task.started_at), selectedMonth)) return true;
      if (task.completed_at && isWithinMonth(new Date(task.completed_at), selectedMonth)) return true;
      return false;
    });
  }, [tasks, selectedMonth]);

  // Group tasks by status for tabs
  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredTasks.filter(t => t.status === 'new'),
      inProgress: filteredTasks.filter(t => ['active', 'in_review', 'revision_requested'].includes(t.status)),
      completed: filteredTasks.filter(t => t.status === 'completed'),
    };
  }, [filteredTasks]);

  // Helper: calculate earnings from a task description
  const calcTaskEarnings = (desc: string | null) => {
    let total = 0;
    const match = (desc || '').match(/\[([^\]]+)\]/);
    if (match) {
      const items = match[1].split('+').map(s => s.trim());
      for (const item of items) {
        const qtyMatch = item.match(/^(\d+)x\s+/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const pagesMatch = item.match(/(\d+)p$/i);
        total += pagesMatch ? qty * (parseInt(pagesMatch[1]) / 2) * 40 : qty * 40;
      }
    }
    return total;
  };

  // Calculate total earnings from all approved items (not just completed projects)
  const totalEarnings = useMemo(() => {
    return approvedFeedbacks.reduce((sum, fb) => {
      const itemLabel = fb.notes?.match(/^\[(.+?)\]/)?.[1] || '';
      return sum + calcItemEarningFromLabel(itemLabel, fb.task_description);
    }, 0);
  }, [approvedFeedbacks]);

  // New stat cards data
  const newStats = useMemo(() => {
    const notStarted = tasks.filter(t => t.status === 'new');
    const inProgress = tasks.filter(t => ['active', 'in_review', 'revision_requested'].includes(t.status));
    
    const notStartedEarnings = notStarted.reduce((sum, t) => sum + calcTaskEarnings(t.description), 0);
    
    const inProgressEarnings = inProgress.reduce((sum, t) => sum + calcTaskEarnings(t.description), 0);
    
    // Earnings this month from approved items (per-item, not per-project)
    const thisMonthFeedbacks = approvedFeedbacks.filter(fb => 
      fb.reviewed_at && isWithinMonth(new Date(fb.reviewed_at), selectedMonth)
    );
    const thisMonthEarnings = thisMonthFeedbacks.reduce((sum, fb) => {
      const itemLabel = fb.notes?.match(/^\[(.+?)\]/)?.[1] || '';
      return sum + calcItemEarningFromLabel(itemLabel, fb.task_description);
    }, 0);

    // Today's earnings
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEarnings = approvedFeedbacks
      .filter(fb => fb.reviewed_at && new Date(fb.reviewed_at) >= todayStart)
      .reduce((sum, fb) => {
        const itemLabel = fb.notes?.match(/^\[(.+?)\]/)?.[1] || '';
        return sum + calcItemEarningFromLabel(itemLabel, fb.task_description);
      }, 0);

    // Daily earnings data for graph (group by day of month)
    const dailyEarnings: Record<number, number> = {};
    thisMonthFeedbacks.forEach(fb => {
      const day = new Date(fb.reviewed_at).getDate();
      const itemLabel = fb.notes?.match(/^\[(.+?)\]/)?.[1] || '';
      dailyEarnings[day] = (dailyEarnings[day] || 0) + calcItemEarningFromLabel(itemLabel, fb.task_description);
    });
    
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const chartData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1}`,
      earnings: dailyEarnings[i + 1] || 0,
    }));

    // Payment method check
    const hasPaymentMethod = !!(teamMember?.iban || teamMember?.payment_method);

    return { notStartedCount: notStarted.length, notStartedEarnings, inProgressEarnings, thisMonthEarnings, todayEarnings, chartData, hasPaymentMethod };
  }, [tasks, selectedMonth, teamMember, approvedFeedbacks]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalDesigns = designerStats?.total_designs_delivered || 0;
    const hasDelivered = totalDesigns > 0;

    return {
      totalDesigns,
      qualityRating: hasDelivered
        ? (designerStats?.average_rating ? Number(designerStats.average_rating) : 5)
        : 5,
      productivityScore: hasDelivered
        ? Math.round(((designerStats?.total_on_time || 0) / Math.max(totalDesigns, 1)) * 100)
        : 100,
    };
  }, [designerStats]);

  const handleStartTask = async (taskId: string) => {
    try {
      await startTask(taskId);
      toast.success('⏱️ Tâche démarrée !');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500 relative" />
          </div>
          <p className="text-muted-foreground">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (isAwaitingValidation && teamMember) {
    return (
      <ProfilePendingValidation
        fullName={teamMember.full_name || 'Designer'}
        email={user?.email}
      />
    );
  }

  const shouldShowProfileModal = user && (needsProfileCompletion || profileLoading) && !isAwaitingValidation;
  const designerName = teamMember?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Designer';

  return (
    <DesignerLayout>
      <FullProfileCompletionModal 
        open={shouldShowProfileModal} 
        defaultEmail={user?.email}
        teamMemberId={teamMember?.id}
      />
      
      <CreateDesignTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={refetch}
      />


      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative space-y-8">
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold">Mon Espace Designer</h1>
          </div>
          <MonthSelector 
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth} 
          />
        </motion.div>

        {/* Profile Card */}
        <DesignerProfileCard
          name={designerName}
          avatarUrl={avatarUrl}
          rating={globalStats.qualityRating}
          totalDesigns={globalStats.totalDesigns}
          totalEarnings={totalEarnings}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DesignerStatCard
            icon={Coins}
            label="Gains aujourd'hui"
            value={`${newStats.todayEarnings.toLocaleString()} DH / 400 DH`}
            subtitle="objectif du jour"
            variant={newStats.todayEarnings >= 400 ? 'success' : 'default'}
            delay={0.1}
          />
          <DesignerStatCard
            icon={FolderClock}
            label="Projets non démarrés"
            value={`${newStats.notStartedCount} / ${newStats.notStartedEarnings.toLocaleString()} DH`}
            variant="default"
            delay={0.2}
          />
          <DesignerStatCard
            icon={FolderOpen}
            label="Projets en cours"
            value={`${newStats.inProgressEarnings.toLocaleString()} DH`}
            variant="primary"
            delay={0.3}
          />
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="cursor-pointer"
            onClick={() => setEarningsGraphOpen(true)}
          >
            <DesignerStatCard
              icon={Coins}
              label="Total gagné ce mois"
              value={`${newStats.thisMonthEarnings.toLocaleString()} DH / 10 000 DH`}
              subtitle="objectif du mois"
              variant={newStats.thisMonthEarnings >= 10000 ? 'success' : 'primary'}
              delay={0.4}
            />
          </motion.div>
        </div>

        {/* Earnings Graph Dialog */}
        <Dialog open={earningsGraphOpen} onOpenChange={setEarningsGraphOpen}>
          <DialogContent className="sm:max-w-[900px] w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-500" />
                Gains du mois
              </DialogTitle>
            </DialogHeader>
            <div className="h-[450px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newStats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [`${value} DH`, 'Gains']}
                    labelFormatter={(label) => `Jour ${label}`}
                  />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(142, 71%, 45%)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-bold text-foreground">{newStats.thisMonthEarnings.toLocaleString()} DH / 10 000 DH</span>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${Math.min((newStats.thisMonthEarnings / 10000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {Math.round((newStats.thisMonthEarnings / 10000) * 100)}% de l'objectif mensuel
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tasks Section */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Mes designs</h2>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {filteredTasks.length} ce mois
              </Badge>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={() => setCreateModalOpen(true)} 
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/25"
              >
                <Plus className="h-4 w-4" />
                Nouveau projet
              </Button>
            </motion.div>
          </div>

          {tasksLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 relative" />
                </div>
                <span className="text-muted-foreground">Chargement des designs...</span>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="todo" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 backdrop-blur-sm p-1 rounded-xl">
                {[
                  { value: 'todo', label: 'À faire', count: tasksByStatus.todo.length, color: 'bg-blue-500' },
                  { value: 'inProgress', label: 'En cours', count: tasksByStatus.inProgress.length, color: 'bg-amber-500' },
                  { value: 'completed', label: 'Terminés', count: tasksByStatus.completed.length, color: 'bg-emerald-500' },
                ].map((tab) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.count > 0 && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full text-white font-medium",
                        tab.color
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                {['todo', 'inProgress', 'completed'].map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-6">
                    <motion.div 
                      className="grid gap-4 grid-cols-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {tasksByStatus[tab as keyof typeof tasksByStatus].length === 0 ? (
                        <motion.div 
                          className="col-span-full flex flex-col items-center justify-center py-16 text-center"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="p-4 rounded-full bg-muted/50 mb-4">
                            <Palette className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium">
                            Aucun design dans cette catégorie
                          </p>
                          <p className="text-sm text-muted-foreground/70 mt-1">
                            Les nouveaux projets apparaîtront ici
                          </p>
                        </motion.div>
                      ) : (
                        tasksByStatus[tab as keyof typeof tasksByStatus].map((task, index) => (
                          <DesignerProjectRow
                            key={task.id}
                            task={task}
                            onStart={handleStartTask}
                            onDeliverySuccess={refetch}
                            onDeleteSuccess={refetch}
                          />
                        ))
                      )}
                    </motion.div>
                  </TabsContent>
                ))}
              </AnimatePresence>
            </Tabs>
          )}
        </motion.div>
      </div>
    </DesignerLayout>
  );
}
