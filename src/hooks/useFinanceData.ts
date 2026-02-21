import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useEffect } from 'react';

export interface DesignTypeBreakdown {
  miniatures: number;
  posts: number;
  logos: number;
  carousels: number;
  other: number;
}

export interface ClientCostBreakdown {
  videoCost: number;
  videoCount: number;
  videoRate: number;
  videosExpected: number;
  designCost: number;
  designCount: number;
  designTypes: DesignTypeBreakdown;
  designsExpected: { miniatures: number; posts: number; logos: number; carousels: number; thumbnails: number };
  copywritingCost: number;
  copywriterName: string | null;
  copywriterClientCount: number;
  copywriterMonthlyRate: number;
  scriptCount: number;
  totalCost: number;
  expectedTotalCost: number;
  netProfit: number;
  margin: number;
}

export interface ClientFinancial {
  userId: string;
  companyName: string;
  contactName: string | null;
  subscriptionType: string | null;
  totalContract: number;
  advanceReceived: number;
  monthlyPrice: number;
  contractDuration: number;
  projectEndDate: string | null;
  totalPaid: number;
  remaining: number;
  progress: number;
  status: 'on_track' | 'late' | 'critical';
  costBreakdown: ClientCostBreakdown;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    notes: string | null;
  }>;
}

export interface TeamMemberFinancial {
  userId: string;
  fullName: string;
  role: string;
  ratePerVideo: number;
  videosDelivered: number;
  designsDelivered: number;
  scriptsDelivered: number;
  totalEarned: number;
  clients: string[];
  details: Array<{
    clientName: string;
    count: number;
    earned: number;
  }>;
}

export interface FinanceSummary {
  revenueMonth: number;
  revenueTotal: number;
  collectedMonth: number;
  remainingToCollect: number;
  expensesMonth: number;
  profitMonth: number;
  profitTotal: number;
  dailyRevenue: number;
  dailyCollected: number;
  dailyExpenses: number;
}

// Helper to calc design earnings per item and detect type
const getDesignType = (notes: string | null): 'miniatures' | 'posts' | 'logos' | 'carousels' | 'other' => {
  if (!notes) return 'other';
  const match = notes.match(/^\[(.+?)\]/);
  if (!match) return 'other';
  const label = match[1].toLowerCase();
  if (label.includes('miniature')) return 'miniatures';
  if (label.includes('post')) return 'posts';
  if (label.includes('logo')) return 'logos';
  if (label.includes('carrousel') || label.includes('carousel')) return 'carousels';
  return 'other';
};

const calcDesignItemEarnings = (notes: string | null): number => {
  if (!notes) return 40;
  const match = notes.match(/^\[(.+?)\]/);
  if (!match) return 40;
  const label = match[1];
  const carouselMatch = label.match(/Carrousel\s*(\d+)p?/i);
  if (carouselMatch) {
    const pages = parseInt(carouselMatch[1]);
    return (pages / 2) * 40;
  }
  return 40;
};

export function useFinanceData(selectedMonth: Date = new Date()) {
  const queryClient = useQueryClient();
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  // Realtime subscriptions — invalidate queries on any change
  useEffect(() => {
    const channel = supabase
      .channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-payments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-videos'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_feedback' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-design-feedback'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_expenses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
        queryClient.invalidateQueries({ queryKey: ['finance-all-expenses'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-clients'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['finance-copywriter-tasks'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_deliveries' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-design-deliveries'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        queryClient.invalidateQueries({ queryKey: ['finance-team'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const clientsQuery = useQuery({
    queryKey: ['finance-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('account_status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ['finance-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const teamQuery = useQuery({
    queryKey: ['finance-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  const videosQuery = useQuery({
    queryKey: ['finance-videos', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('id, task_id, assigned_to, completed_at, title, status')
        .eq('status', 'completed')
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd + 'T23:59:59');
      if (error) throw error;
      return data || [];
    },
  });

  const tasksQuery = useQuery({
    queryKey: ['finance-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, client_name, client_user_id, assigned_to, copywriter_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Copywriter: completed tasks this month where copywriter_id is set
  const copywriterTasksQuery = useQuery({
    queryKey: ['finance-copywriter-tasks', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, client_name, copywriter_id, completed_at, status')
        .not('copywriter_id', 'is', null)
        .eq('status', 'completed')
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd + 'T23:59:59');
      if (error) throw error;
      return data || [];
    },
  });

  const designFeedbackQuery = useQuery({
    queryKey: ['finance-design-feedback', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_feedback')
        .select('id, design_task_id, delivery_id, decision, reviewed_at')
        .eq('decision', 'approved')
        .gte('reviewed_at', monthStart)
        .lte('reviewed_at', monthEnd + 'T23:59:59');
      if (error) throw error;
      return data || [];
    },
  });

  const designDeliveriesQuery = useQuery({
    queryKey: ['finance-design-deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_deliveries')
        .select('id, design_task_id, designer_id, notes');
      if (error) throw error;
      return data || [];
    },
  });

  const designTasksQuery = useQuery({
    queryKey: ['finance-design-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_tasks')
        .select('id, title, client_name, client_user_id, assigned_to, description');
      if (error) throw error;
      return data || [];
    },
  });

  const expensesQuery = useQuery({
    queryKey: ['finance-expenses', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_expenses')
        .select('*')
        .eq('month', monthStart);
      if (error) throw error;
      return data || [];
    },
  });

  const allExpensesQuery = useQuery({
    queryKey: ['finance-all-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_expenses')
        .select('*')
        .order('month', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Compute
  const clients = clientsQuery.data || [];
  const payments = paymentsQuery.data || [];
  const team = teamQuery.data || [];
  const videos = videosQuery.data || [];
  const tasks = tasksQuery.data || [];
  const copywriterTasks = copywriterTasksQuery.data || [];
  const designFeedbacks = designFeedbackQuery.data || [];
  const designDeliveries = designDeliveriesQuery.data || [];
  const designTasks = designTasksQuery.data || [];
  const expenses = expensesQuery.data || [];
  const allExpenses = allExpensesQuery.data || [];

  // Client financials with cost breakdown
  const clientFinancials: ClientFinancial[] = clients.map((c) => {
    const clientPayments = payments.filter((p) => p.client_user_id === c.user_id);
    const paymentsTotal = clientPayments.reduce((s, p) => s + Number(p.amount), 0);
    const advanceReceived = Number(c.advance_received || 0);
    const totalPaid = paymentsTotal + advanceReceived;
    const totalContract = Number(c.total_contract || 0);
    const remaining = totalContract - totalPaid;
    const progress = totalContract > 0 ? Math.round((totalPaid / totalContract) * 100) : 0;

    let status: 'on_track' | 'late' | 'critical' = 'on_track';
    if (c.project_end_date) {
      const endDate = new Date(c.project_end_date);
      const now = new Date();
      if (remaining > 0 && endDate < now) status = 'critical';
      else if (remaining > totalContract * 0.5) status = 'late';
    }

    // --- Per-client cost breakdown ---
    // Video costs: find tasks for this client, then completed videos, multiply by editor rate
    const clientTasks = tasks.filter((t) => t.client_user_id === c.user_id);
    const clientTaskIds = new Set(clientTasks.map((t) => t.id));
    const clientVideos = videos.filter((v) => clientTaskIds.has(v.task_id));
    let videoCost = 0;
    let videoRate = 100;
    clientVideos.forEach((v) => {
      const editorId = v.assigned_to;
      const editor = editorId ? team.find((m) => m.user_id === editorId) : null;
      const rate = editor ? Number(editor.rate_per_video || 0) : 100;
      videoRate = rate;
      videoCost += rate;
    });

    // Design costs: find design tasks for this client, then approved feedbacks
    const clientDesignTasks = designTasks.filter((dt) => dt.client_user_id === c.user_id);
    const clientDesignTaskIds = new Set(clientDesignTasks.map((dt) => dt.id));
    const clientDesignFeedbacks = designFeedbacks.filter((f) => clientDesignTaskIds.has(f.design_task_id));
    let designCost = 0;
    const designTypes: DesignTypeBreakdown = { miniatures: 0, posts: 0, logos: 0, carousels: 0, other: 0 };
    clientDesignFeedbacks.forEach((fb) => {
      const delivery = designDeliveries.find((d) => d.id === fb.delivery_id);
      designCost += calcDesignItemEarnings(delivery?.notes || null);
      const dtype = getDesignType(delivery?.notes || null);
      designTypes[dtype] += 1;
    });

    // Copywriting costs — smart allocation based on copywriter assignment
    // If this client has a copywriter_id, find how many active clients share that copywriter
    // Then divide the copywriter's monthly rate equally among them
    let copywritingCost = 0;
    let copywriterName: string | null = null;
    let copywriterClientCount = 0;
    let copywriterMonthlyRate = 0;
    if (c.copywriter_id) {
      const writer = team.find((m) => m.user_id === c.copywriter_id);
      if (writer) {
        copywriterName = writer.full_name || writer.email;
        copywriterMonthlyRate = Number(writer.rate_per_video || 0);
        // Count how many active clients are assigned to this copywriter
        copywriterClientCount = clients.filter((cl) => cl.copywriter_id === c.copywriter_id).length;
        if (copywriterClientCount > 0 && copywriterMonthlyRate > 0) {
          copywritingCost = Math.round(copywriterMonthlyRate / copywriterClientCount);
        }
      }
    }

    const totalCost = videoCost + designCost + copywritingCost;

    // Expected consumption from client pack
    const videosExpected = Number(c.videos_per_month || 0);
    const hasThumbnails = c.has_thumbnail_design === true;
    const designsExpected = {
      miniatures: Number(c.design_miniatures_per_month || 0),
      posts: Number(c.design_posts_per_month || 0),
      logos: Number(c.design_logos_per_month || 0),
      carousels: Number(c.design_carousels_per_month || 0),
      thumbnails: hasThumbnails ? videosExpected : 0,
    };

    // Expected cost = expected videos × rate + expected designs × 40 + thumbnails × 40
    const expectedVideoCost = videosExpected * videoRate;
    const expectedDesignCost = (designsExpected.miniatures + designsExpected.posts + designsExpected.logos + designsExpected.thumbnails) * 40;
    const expectedTotalCost = expectedVideoCost + expectedDesignCost + copywritingCost;

    // Use the greater of actual or expected for profit calc
    const effectiveCost = Math.max(totalCost, expectedTotalCost);
    const netProfit = totalContract - effectiveCost;
    const margin = totalContract > 0 ? Math.round((netProfit / totalContract) * 100) : 0;

    return {
      userId: c.user_id,
      companyName: c.company_name,
      contactName: c.contact_name,
      subscriptionType: c.subscription_type,
      totalContract,
      advanceReceived: Number(c.advance_received || 0),
      monthlyPrice: Number(c.monthly_price || 0),
      contractDuration: c.contract_duration_months || 1,
      projectEndDate: c.project_end_date,
      totalPaid,
      remaining: Math.max(0, remaining),
      progress,
      status,
      costBreakdown: {
        videoCost,
        videoCount: clientVideos.length,
        videoRate,
        videosExpected,
        designCost,
        designCount: clientDesignFeedbacks.length,
        designTypes,
        designsExpected,
        copywritingCost,
        copywriterName,
        copywriterClientCount,
        copywriterMonthlyRate,
        scriptCount: 0,
        totalCost: effectiveCost,
        expectedTotalCost,
        netProfit,
        margin,
      },
      payments: clientPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method || 'cash',
        notes: p.notes,
      })),
    };
  });

  // Team member financials
  const teamFinancials: TeamMemberFinancial[] = team.map((m) => {
    const memberId = m.user_id;
    if (!memberId) return null;

    const role = m.role || 'editor';
    const ratePerVideo = Number(m.rate_per_video || 0);

    if (role === 'editor') {
      const memberVideos = videos.filter((v) => v.assigned_to === memberId);
      const detailsMap = new Map<string, { count: number; earned: number }>();

      memberVideos.forEach((v) => {
        const task = tasks.find((t) => t.id === v.task_id);
        const clientName = task?.client_name || 'Sans client';
        const existing = detailsMap.get(clientName) || { count: 0, earned: 0 };
        existing.count += 1;
        existing.earned += ratePerVideo;
        detailsMap.set(clientName, existing);
      });

      const details = Array.from(detailsMap.entries()).map(([clientName, d]) => ({
        clientName,
        count: d.count,
        earned: d.earned,
      }));

      return {
        userId: memberId,
        fullName: m.full_name || m.email,
        role,
        ratePerVideo,
        videosDelivered: memberVideos.length,
        designsDelivered: 0,
        scriptsDelivered: 0,
        totalEarned: memberVideos.length * ratePerVideo,
        clients: details.map((d) => d.clientName),
        details,
      };
    }

    if (role === 'designer') {
      const memberDeliveryIds = new Set(
        designDeliveries.filter((d) => d.designer_id === memberId).map((d) => d.id)
      );
      const approvedFbs = designFeedbacks.filter((f) => memberDeliveryIds.has(f.delivery_id));
      const detailsMap = new Map<string, { count: number; earned: number }>();

      approvedFbs.forEach((fb) => {
        const delivery = designDeliveries.find((d) => d.id === fb.delivery_id);
        const task = designTasks.find((t) => t.id === fb.design_task_id);
        const clientName = task?.client_name || 'Sans client';
        const earned = calcDesignItemEarnings(delivery?.notes || null);
        const existing = detailsMap.get(clientName) || { count: 0, earned: 0 };
        existing.count += 1;
        existing.earned += earned;
        detailsMap.set(clientName, existing);
      });

      const details = Array.from(detailsMap.entries()).map(([clientName, d]) => ({
        clientName,
        count: d.count,
        earned: d.earned,
      }));

      const totalEarned = details.reduce((s, d) => s + d.earned, 0);

      return {
        userId: memberId,
        fullName: m.full_name || m.email,
        role,
        ratePerVideo: 0,
        videosDelivered: 0,
        designsDelivered: approvedFbs.length,
        scriptsDelivered: 0,
        totalEarned,
        clients: details.map((d) => d.clientName),
        details,
      };
    }

    if (role === 'copywriter') {
      // Smart allocation: find all active clients assigned to this copywriter
      const assignedClients = clients.filter((cl) => cl.copywriter_id === memberId);
      const clientCount = assignedClients.length;
      const monthlyRate = ratePerVideo; // rate_per_video = monthly salary for copywriters
      const perClientRate = clientCount > 0 && monthlyRate > 0 ? Math.round(monthlyRate / clientCount) : 0;

      const details = assignedClients.map((cl) => ({
        clientName: cl.company_name,
        count: 1,
        earned: perClientRate,
      }));

      return {
        userId: memberId,
        fullName: m.full_name || m.email,
        role,
        ratePerVideo,
        videosDelivered: 0,
        designsDelivered: 0,
        scriptsDelivered: 0,
        totalEarned: monthlyRate,
        clients: details.map((d) => d.clientName),
        details,
      };
    }

    return {
      userId: memberId,
      fullName: m.full_name || m.email,
      role,
      ratePerVideo: 0,
      videosDelivered: 0,
      designsDelivered: 0,
      scriptsDelivered: 0,
      totalEarned: 0,
      clients: [],
      details: [],
    };
  }).filter(Boolean) as TeamMemberFinancial[];

  // Summary calculations
  const revenueMonth = clients.reduce((s, c) => s + Number(c.monthly_price || 0), 0);
  const revenueTotal = clients.reduce((s, c) => s + Number(c.total_contract || 0), 0);

  const totalAdvances = clients.reduce((s, c) => s + Number(c.advance_received || 0), 0);
  const monthPayments = payments.filter(
    (p) => p.payment_date >= monthStart && p.payment_date <= monthEnd
  );
  const collectedMonth = monthPayments.reduce((s, p) => s + Number(p.amount), 0) + totalAdvances;
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0) + totalAdvances;
  const remainingToCollect = revenueTotal - totalCollected;

  const manualExpensesMonth = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const teamPayrollMonth = teamFinancials.reduce((s, m) => s + m.totalEarned, 0);
  const expensesMonth = manualExpensesMonth + teamPayrollMonth;

  const manualExpensesTotal = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = manualExpensesTotal + teamPayrollMonth;

  const profitMonth = collectedMonth - expensesMonth;
  const profitTotal = totalCollected - totalExpenses;

  const todayPayments = payments.filter((p) => p.payment_date === today);
  const dailyCollected = todayPayments.reduce((s, p) => s + Number(p.amount), 0);

  const summary: FinanceSummary = {
    revenueMonth,
    revenueTotal,
    collectedMonth,
    remainingToCollect: Math.max(0, remainingToCollect),
    expensesMonth,
    profitMonth,
    profitTotal,
    dailyRevenue: revenueMonth / 30,
    dailyCollected,
    dailyExpenses: expensesMonth / 30,
  };

  const isLoading =
    clientsQuery.isLoading ||
    paymentsQuery.isLoading ||
    teamQuery.isLoading ||
    videosQuery.isLoading ||
    tasksQuery.isLoading ||
    copywriterTasksQuery.isLoading ||
    designFeedbackQuery.isLoading ||
    designDeliveriesQuery.isLoading ||
    designTasksQuery.isLoading ||
    expensesQuery.isLoading;

  return {
    summary,
    clientFinancials,
    teamFinancials,
    expenses,
    allExpenses,
    payments,
    isLoading,
    refetch: () => {
      paymentsQuery.refetch();
      expensesQuery.refetch();
      allExpensesQuery.refetch();
    },
  };
}
