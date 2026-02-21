import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { VideoStatus } from '@/types/video';

interface Video {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  status: VideoStatus;
  deadline: string | null;
  assigned_to: string | null;
  started_at: string | null;
  completed_at: string | null;
  allowed_duration_minutes: number | null;
  revision_count: number | null;
  is_validated: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  client_name: string | null;
  client_type: string | null;
  client_user_id: string | null;
  project_name: string | null;
  reward_level: string | null;
  deadline: string | null;
  video_count: number | null;
  copywriter_id: string | null;
  source_files_link: string | null;
  editor_instructions: string | null;
  description: string | null;
}

export interface EditorVideo extends Video {
  task: Task | null;
}

export function useEditorVideos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch videos assigned to current editor
  const { data: videos = [], isLoading, error, refetch } = useQuery({
    queryKey: ['editor-videos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          task:tasks(
            id,
            title,
            client_name,
            client_type,
            client_user_id,
            project_name,
            reward_level,
            deadline,
            video_count,
            copywriter_id,
            source_files_link,
            editor_instructions,
            description
          )
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map status values for backward compatibility
      return (data || []).map(video => ({
        ...video,
        status: mapVideoStatus(video.status),
      })) as EditorVideo[];
    },
    enabled: !!user?.id,
  });

  // Set up real-time subscriptions for editor dashboard
  useEffect(() => {
    if (!user?.id) return;

    console.log('[Editor Videos] Setting up realtime subscriptions for user:', user.id);

    // Channel for video changes (assigned to current user)
    const videosChannel = supabase
      .channel(`editor-videos-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `assigned_to=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Editor Videos] Video change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['editor-videos', user.id] });
        }
      )
      .subscribe();

    // Channel for new video assignments (INSERT events without filter to catch new assignments)
    const assignmentsChannel = supabase
      .channel(`video-assignments-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos',
        },
        (payload) => {
          if (payload.new && (payload.new as any).assigned_to === user.id) {
            console.log('[Editor Videos] New video assigned:', payload.new);
            queryClient.invalidateQueries({ queryKey: ['editor-videos', user.id] });
          }
        }
      )
      .subscribe();

    // Channel for task updates (to get updated client info, deadlines, etc.)
    const tasksChannel = supabase
      .channel(`editor-tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('[Editor Videos] Task change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['editor-videos', user.id] });
        }
      )
      .subscribe();

    // Channel for video conversations (messages from admin)
    const conversationsChannel = supabase
      .channel(`editor-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_conversations',
        },
        (payload) => {
          console.log('[Editor Videos] New conversation message:', payload.eventType);
          // Trigger any conversation-related UI updates
          queryClient.invalidateQueries({ queryKey: ['video-conversations'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[Editor Videos] Cleaning up realtime subscriptions');
      supabase.removeChannel(videosChannel);
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [user?.id, queryClient]);

  // Computed stats
  const stats = useMemo(() => {
    const completed = videos.filter(v => v.status === 'completed' || v.is_validated);
    const inProgress = videos.filter(v => v.status === 'active');
    const inReviewAdmin = videos.filter(v => v.status === 'review_admin');
    const inReviewClient = videos.filter(v => v.status === 'review_client');
    const late = videos.filter(v => v.status === 'late');
    const newVideos = videos.filter(v => v.status === 'new');
    const revisionRequested = videos.filter(v => v.status === 'revision_requested');

    return {
      total: videos.length,
      completed: completed.length,
      inProgress: inProgress.length,
      inReviewAdmin: inReviewAdmin.length,
      inReviewClient: inReviewClient.length,
      late: late.length,
      new: newVideos.length,
      revisionRequested: revisionRequested.length,
    };
  }, [videos]);

  return {
    videos,
    stats,
    isLoading,
    error,
    refetch,
  };
}

// Map old status values to new unified statuses
function mapVideoStatus(status: string): VideoStatus {
  const statusMap: Record<string, VideoStatus> = {
    'new': 'new',
    'active': 'active',
    'in_progress': 'active', // Legacy mapping
    'late': 'late',
    'in_review': 'review_admin', // Legacy mapping
    'review_admin': 'review_admin',
    'review_client': 'review_client',
    'revision_requested': 'revision_requested',
    'completed': 'completed',
    'cancelled': 'cancelled',
  };
  return statusMap[status] || 'new';
}

// Hook to start a video (NEW → ACTIVE)
export function useStartVideo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const startVideo = async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', videoId)
      .eq('assigned_to', user?.id);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['editor-videos'] });
  };

  return { startVideo };
}

// Hook to submit video for review (ACTIVE → REVIEW_ADMIN)
export function useSubmitVideoForReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const submitForReview = async (videoId: string) => {
    const { error } = await supabase
      .from('videos')
      .update({
        status: 'review_admin',
      })
      .eq('id', videoId)
      .eq('assigned_to', user?.id);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['editor-videos'] });
  };

  return { submitForReview };
}
