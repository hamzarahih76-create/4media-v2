import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface ClientProfile {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  industry: string | null;
  subscription_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  next_shooting_date: string | null;
  project_end_date: string | null;
  workflow_status: string;
  monthly_price: number | null;
  videos_per_month: number | null;
  has_thumbnail_design: boolean | null;
  account_status: string;
  domain_activity: string | null;
}
export interface ClientContentItem {
  id: string;
  client_user_id: string;
  workflow_step: 'idea' | 'script' | 'filmmaking' | 'editing' | 'publication' | 'analysis';
  title: string;
  description: string | null;
  content_type: string;
  status: 'draft' | 'in_progress' | 'pending_review' | 'validated' | 'delivered' | 'revision_requested';
  file_url: string | null;
  external_link: string | null;
  related_task_id: string | null;
  related_design_task_id: string | null;
  related_video_id: string | null;
  created_by: string | null;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ClientAnalytics {
  id: string;
  client_user_id: string;
  month: string;
  followers_count: number | null;
  followers_change: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  engagement_rate: number | null;
  notes: string | null;
  created_at: string;
}

export function useClientProfile(selectedMonth?: Date) {
  const { user } = useAuth();
  const monthDate = selectedMonth || new Date();
  const monthKey = format(startOfMonth(monthDate), 'yyyy-MM');
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['client-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data as ClientProfile;
    },
    enabled: !!user?.id,
  });

  const { data: contentItems = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ['client-content-items', user?.id, monthKey],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_content_items')
        .select('*')
        .eq('client_user_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientContentItem[];
    },
    enabled: !!user?.id,
  });

  const { data: analytics = [], isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['client-analytics', user?.id, monthKey],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_analytics')
        .select('*')
        .eq('client_user_id', user.id)
        .eq('month', monthStart)
        .limit(1);
      if (error) throw error;
      return data as ClientAnalytics[];
    },
    enabled: !!user?.id,
  });

  // Fetch video projects linked to this client for this month
  const { data: videoProjects = [], isLoading: isLoadingVideoProjects } = useQuery({
    queryKey: ['client-video-projects', user?.id, monthKey],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, videos(*)')
        .eq('client_user_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch design projects linked to this client for this month
  const { data: designProjects = [], isLoading: isLoadingDesignProjects } = useQuery({
    queryKey: ['client-design-projects', user?.id, monthKey],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('design_tasks')
        .select('*')
        .eq('client_user_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Group content by workflow step
  const contentByStep = {
    idea: contentItems.filter(i => i.workflow_step === 'idea'),
    script: contentItems.filter(i => i.workflow_step === 'script'),
    filmmaking: contentItems.filter(i => i.workflow_step === 'filmmaking'),
    editing: contentItems.filter(i => i.workflow_step === 'editing'),
    publication: contentItems.filter(i => i.workflow_step === 'publication'),
    analysis: contentItems.filter(i => i.workflow_step === 'analysis'),
  };

  return {
    profile,
    contentItems,
    contentByStep,
    analytics,
    videoProjects,
    designProjects,
    isLoading: isLoadingProfile || isLoadingContent || isLoadingAnalytics || isLoadingVideoProjects || isLoadingDesignProjects,
    isLoadingProfile,
  };
}
