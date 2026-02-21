import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditorLayout } from '@/components/layout/EditorLayout';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { PerformanceChart } from '@/components/editor/PerformanceChart';
import { RemunerationDrawer } from '@/components/editor/RemunerationDrawer';
import { TaskTabs } from '@/components/editor/TaskTabs';
import { TaskWorkflowPanel } from '@/components/editor/TaskWorkflowPanel';
import { FullProfileCompletionModal } from '@/components/editor/FullProfileCompletionModal';
import { ProfilePendingValidation } from '@/components/editor/ProfilePendingValidation';
import { MonthSelector, isWithinMonth } from '@/components/editor/MonthSelector';
import { startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Video, Clock, Star, TrendingUp, Loader2 } from 'lucide-react';
import type { WorkflowTask, TaskWorkflowStatus } from '@/types/workflow';
import type { VideoStatus } from '@/types/video';
import { useAuth } from '@/hooks/useAuth';
import { useEditorVideos, useStartVideo, useSubmitVideoForReview, type EditorVideo } from '@/hooks/useEditorVideos';
import { useEditorProfile, useEditorStats } from '@/hooks/useEditorProfile';
import { supabase } from '@/integrations/supabase/client';

const bonusTiers = [
  { videos: 30, bonus: 150 },
  { videos: 50, bonus: 500 },
  { videos: 80, bonus: 1000 },
];

const DEFAULT_ALLOWED_DURATION = 5 * 60 * 60; // 5 hours in seconds

// Convert DB video to WorkflowTask format for the panel
const convertToWorkflowTask = (video: EditorVideo): WorkflowTask => ({
  id: video.id,
  project_id: video.task_id,
  assigned_to: video.assigned_to,
  created_by: null,
  title: video.title,
  description: video.description,
  client_name: video.task?.client_name || null,
  project_name: video.task?.title || null,
  client_type: (video.task?.client_type as 'b2b' | 'b2c' | 'international') || 'b2b',
  status: video.status as TaskWorkflowStatus,
  reward_level: (video.task?.reward_level as 'standard' | 'high' | 'premium') || 'standard',
  deadline: video.deadline || video.task?.deadline || null,
  started_at: video.started_at,
  completed_at: video.completed_at,
  created_at: video.created_at,
  updated_at: video.updated_at,
});

// Map video status to TaskTabs status format
const mapStatusForTabs = (status: VideoStatus): 'new' | 'active' | 'late' | 'review_admin' | 'review_client' | 'revision_requested' | 'completed' => {
  return status as any;
};

// Determine if video is late based on timer
const isVideoLate = (video: EditorVideo): boolean => {
  // If already marked as late in DB, it's late
  if (video.status === 'late') return true;
  
  // If video is active and timer has exceeded, it's late
  if (video.status === 'active' && video.started_at) {
    const allowedDuration = (video.allowed_duration_minutes || 300) * 60; // seconds
    const elapsed = Math.floor((Date.now() - new Date(video.started_at).getTime()) / 1000);
    if (elapsed > allowedDuration) return true;
  }
  
  // If deadline is passed and video is not completed
  if (video.deadline && video.status !== 'completed') {
    const deadlineDate = new Date(video.deadline);
    if (new Date() > deadlineDate) return true;
  }
  
  return false;
};

// Convert video to TaskTabs format
const convertToTaskFormat = (video: EditorVideo) => {
  // Determine effective status (override to 'late' if conditions are met)
  const effectiveStatus = isVideoLate(video) && video.status !== 'completed' 
    ? 'late' 
    : mapStatusForTabs(video.status);
  
  return {
    id: video.id,
    title: video.title,
    client: video.task?.client_name || 'Client',
    project: video.task?.title || '',
    status: effectiveStatus,
    deadline: video.deadline || video.task?.deadline || '',
    rewardLevel: (video.task?.reward_level as 'standard' | 'high' | 'premium') || 'standard',
    clientType: (video.task?.client_type as 'b2b' | 'b2c' | 'international') || 'b2b',
    source: 'assigned' as const,
    startedAt: video.started_at ? new Date(video.started_at) : null,
    completedAt: video.completed_at ? new Date(video.completed_at) : null,
    allowedDuration: (video.allowed_duration_minutes || 300) * 60,
  };
};

export default function EditorDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { videos, stats, isLoading: videosLoading, refetch } = useEditorVideos();
  const { profile, teamMember, needsProfileCompletion, isAwaitingValidation, isActivated, isLoading: profileLoading } = useEditorProfile();
  const { data: editorStats } = useEditorStats();

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [workflowPanelOpen, setWorkflowPanelOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [clientColors, setClientColors] = useState<{ primary?: string; secondary?: string; accent?: string } | null>(null);

  const { startVideo } = useStartVideo();
  const { submitForReview } = useSubmitVideoForReview();

  // Load signed URL for avatar from storage
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

  // Convert videos to task format for TaskTabs

  // Convert videos to task format for TaskTabs
  const tasks = useMemo(() => {
    return videos.map(convertToTaskFormat);
  }, [videos]);

  // Filter tasks by selected month - NEW videos always shown
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Les vidéos "new" sont TOUJOURS affichées (pas encore commencées)
      if (task.status === 'new') {
        return true;
      }
      // Pour les autres statuts, filtrer par mois de travail
      if (task.startedAt && isWithinMonth(task.startedAt, selectedMonth)) {
        return true;
      }
      if (task.completedAt && isWithinMonth(task.completedAt, selectedMonth)) {
        return true;
      }
      return false;
    });
  }, [tasks, selectedMonth]);

  // Global stats from editor_stats table
  // Default values for new editors: quality = 5/5, on-time rate = 100%
  const globalStats = useMemo(() => {
    const totalVideos = editorStats?.total_videos_delivered || 0;
    const hasDeliveredVideos = totalVideos > 0;
    
    return {
      totalVideos: totalVideos,
      avgTimeHours: hasDeliveredVideos ? 3.2 : 0,
      // Default 5/5 for new editors, otherwise use actual rating
      qualityRating: hasDeliveredVideos 
        ? (editorStats?.average_rating ? Number(editorStats.average_rating) : 5) 
        : 5,
      // Default 100% for new editors, otherwise calculate from stats
      productivityScore: hasDeliveredVideos 
        ? Math.round(((editorStats?.total_on_time || 0) / Math.max(totalVideos, 1)) * 100)
        : 100,
    };
  }, [editorStats]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');
    return {
      validatedVideos: completedTasks.length,
      weeklyProgress: completedTasks.length,
    };
  }, [filteredTasks]);

  const selectedVideo = selectedVideoId 
    ? videos.find(v => v.id === selectedVideoId)
    : null;

  const selectedTask = selectedVideo ? convertToWorkflowTask(selectedVideo) : null;

  // Fetch client colors when selectedVideo changes
  useEffect(() => {
    const fetchClientColors = async () => {
      if (!selectedVideo?.task?.client_name) {
        setClientColors(null);
        return;
      }
      
      const { data } = await supabase
        .from('client_profiles')
        .select('primary_color, secondary_color, accent_color')
        .eq('company_name', selectedVideo.task.client_name)
        .single();
      
      if (data) {
        setClientColors({
          primary: data.primary_color || undefined,
          secondary: data.secondary_color || undefined,
          accent: data.accent_color || undefined,
        });
      } else {
        setClientColors(null);
      }
    };

    fetchClientColors();
  }, [selectedVideo?.task?.client_name]);

  const handleOpenWorkflow = (taskId: string) => {
    setSelectedVideoId(taskId);
    setWorkflowPanelOpen(true);
  };

  const handleStartTask = useCallback(async (taskId: string) => {
    try {
      await startVideo(taskId);
      toast.success('⏱️ Timer démarré ! Vous avez 5h pour terminer.');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  }, [startVideo, refetch]);

  const handleFinishTask = useCallback(async (taskId: string) => {
    try {
      await submitForReview(taskId);
      toast.success('✅ Vidéo soumise pour validation admin');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la soumission');
    }
  }, [submitForReview, refetch]);

  // Show loading state only during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show profile pending validation screen  
  if (isAwaitingValidation && teamMember) {
    return (
      <ProfilePendingValidation
        fullName={teamMember.full_name || 'Éditeur'}
        email={user?.email}
      />
    );
  }

  // For new users: show profile modal immediately if:
  // 1. User is authenticated AND (profile needs completion OR profile is still loading)
  // 2. Not awaiting validation (already submitted)
  const shouldShowProfileModal = user && (needsProfileCompletion || profileLoading) && !isAwaitingValidation;

  // Editor data for header
  const editorData = {
    name: teamMember?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'Éditeur',
    avatar: avatarUrl || undefined,
    totalEarnings: 0,
    averageRating: globalStats.qualityRating,
    totalReviews: globalStats.totalVideos,
    memberSince: profile?.created_at 
      ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : 'Nouveau',
  };

  return (
    <EditorLayout>
      {/* Profile Completion Modal */}
      <FullProfileCompletionModal 
        open={shouldShowProfileModal} 
        defaultEmail={user?.email}
        teamMemberId={teamMember?.id}
      />

      <div className="space-y-6">
        {/* Month Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Mon Espace Éditeur</h1>
          <MonthSelector 
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth} 
          />
        </div>

        {/* Profile header */}
        <EditorHeader editor={editorData} />

        {/* Global Performance Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <Video className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vidéos livrées</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{globalStats.totalVideos}</span>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Temps moyen</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{globalStats.avgTimeHours}h</span>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <Star className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Note qualité</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{globalStats.qualityRating.toFixed(1)}/5</span>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taux à temps</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{globalStats.productivityScore}%</span>
              </div>
            </div>
          </div>
        </div>


        {/* Performance Chart */}
        <PerformanceChart
          videos={videos.map(v => ({
            id: v.id,
            completed_at: v.completed_at,
            is_validated: v.is_validated ?? false,
            status: v.status,
          }))}
          basePayPerVideo={100}
          currency="DH"
          selectedMonth={selectedMonth}
        />

        {/* Remuneration */}
        <RemunerationDrawer 
          currentVideos={monthlyStats.validatedVideos} 
          tiers={bonusTiers}
          basePayPerVideo={100}
          currency="DH"
          selectedMonth={selectedMonth}
        />

        {/* Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Mes vidéos
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredTasks.length} ce mois)
              </span>
            </h2>
          </div>
          
          {videosLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement des vidéos...</span>
            </div>
          ) : (
            <TaskTabs
              tasks={filteredTasks}
              onStart={handleStartTask}
              onOpenWorkflow={handleOpenWorkflow}
            />
          )}
        </div>
      </div>

      {/* Workflow Panel */}
      <TaskWorkflowPanel
        task={selectedTask}
        videoId={selectedVideoId || undefined}
        open={workflowPanelOpen}
        onOpenChange={setWorkflowPanelOpen}
        onStart={handleStartTask}
        onFinish={handleFinishTask}
        currentUserId={user?.id || ''}
        allowedDuration={selectedVideo?.allowed_duration_minutes 
          ? selectedVideo.allowed_duration_minutes * 60 
          : DEFAULT_ALLOWED_DURATION}
        revisionCount={selectedVideo?.revision_count || 0}
        clientColors={clientColors}
        videoCount={selectedVideo?.task?.video_count}
        copywriterId={selectedVideo?.task?.copywriter_id}
        clientUserId={selectedVideo?.task?.client_user_id}
        editorInstructions={selectedVideo?.task?.editor_instructions}
      />
    </EditorLayout>
  );
}
