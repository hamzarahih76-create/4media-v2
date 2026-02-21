import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { 
  TaskProjectSummary, 
  PendingVideoValidation, 
  EditorPerformance,
  VideoStatus 
} from '@/types/video';

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

export function usePMDashboard() {
  const queryClient = useQueryClient();

  // Real-time subscriptions for PM Dashboard
  useEffect(() => {
    console.log('[PM Dashboard] Setting up realtime subscriptions');

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel('pm-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('[PM Dashboard] Task change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['pm-tasks'] });
        }
      )
      .subscribe();

    // Subscribe to videos changes
    const videosChannel = supabase
      .channel('pm-videos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
        },
        (payload) => {
          console.log('[PM Dashboard] Video change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
          queryClient.invalidateQueries({ queryKey: ['pm-pending-videos'] });
        }
      )
      .subscribe();

    // Subscribe to video deliveries (new uploads)
    const deliveriesChannel = supabase
      .channel('pm-deliveries-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_deliveries',
        },
        (payload) => {
          console.log('[PM Dashboard] Video delivery change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
          queryClient.invalidateQueries({ queryKey: ['pm-pending-videos'] });
        }
      )
      .subscribe();

    // Subscribe to editor questions
    const questionsChannel = supabase
      .channel('pm-questions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_conversations',
        },
        (payload) => {
          console.log('[PM Dashboard] Editor question change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['pm-editor-questions'] });
          queryClient.invalidateQueries({ queryKey: ['pm-video-message-counts'] });
        }
      )
      .subscribe();

    // Subscribe to editor stats changes
    const statsChannel = supabase
      .channel('pm-editor-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'editor_stats',
        },
        (payload) => {
          console.log('[PM Dashboard] Editor stats change received:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['pm-editor-stats'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[PM Dashboard] Cleaning up realtime subscriptions');
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(videosChannel);
      supabase.removeChannel(deliveriesChannel);
      supabase.removeChannel(questionsChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [queryClient]);

  // Fetch all tasks (projects)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['pm-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all videos with their latest delivery
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['pm-videos'],
    queryFn: async () => {
      const { data: videosData, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch all deliveries to get external links
      const videoIds = videosData?.map(v => v.id) || [];
      if (videoIds.length > 0) {
        const { data: deliveries } = await supabase
          .from('video_deliveries')
          .select('video_id, external_link, link_type, version_number, file_path, delivery_type, cloudflare_stream_id')
          .in('video_id', videoIds)
          .order('version_number', { ascending: false });
        
        // Create a map of latest delivery per video
        const latestDeliveryMap = new Map<string, { 
          external_link: string | null; 
          link_type: string | null;
          file_path: string | null;
          delivery_type: string | null;
          cloudflare_stream_id: string | null;
        }>();
        deliveries?.forEach(d => {
          if (!latestDeliveryMap.has(d.video_id)) {
            latestDeliveryMap.set(d.video_id, { 
              external_link: d.external_link, 
              link_type: d.link_type,
              file_path: d.file_path,
              delivery_type: d.delivery_type,
              cloudflare_stream_id: d.cloudflare_stream_id,
            });
          }
        });
        
        // Add delivery info to videos and map status
        return videosData?.map(v => ({
          ...v,
          status: mapVideoStatus(v.status),
          external_link: latestDeliveryMap.get(v.id)?.external_link || null,
          link_type: latestDeliveryMap.get(v.id)?.link_type || null,
          file_path: latestDeliveryMap.get(v.id)?.file_path || null,
          delivery_type: latestDeliveryMap.get(v.id)?.delivery_type || null,
          cloudflare_stream_id: latestDeliveryMap.get(v.id)?.cloudflare_stream_id || null,
        })) || [];
      }
      
      // Map status for videos without deliveries
      return (videosData || []).map(v => ({
        ...v,
        status: mapVideoStatus(v.status),
      }));
    },
  });

  // Fetch team members for editor name mapping (only editors, not admin/PM)
  const EDITOR_ROLES = ['editor', 'motion_designer', 'colorist'];
  
  const { data: teamMembers = [], isLoading: teamMembersLoading } = useQuery({
    queryKey: ['pm-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, full_name, email, role, status')
        .in('role', EDITOR_ROLES);
      
      if (error) throw error;
      return data;
    },
  });

  // Create a map of user_id to name for quick lookup
  const editorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach(member => {
      if (member.user_id) {
        map.set(member.user_id, member.full_name || member.email || 'Éditeur');
      }
    });
    return map;
  }, [teamMembers]);

  // Helper to get editor name
  const getEditorName = (userId: string | null) => {
    if (!userId) return 'Non assigné';
    return editorNameMap.get(userId) || `Éditeur ${userId.substring(0, 6)}`;
  };

  // Fetch editor stats
  const { data: editorStats = [], isLoading: editorsLoading } = useQuery({
    queryKey: ['pm-editor-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editor_stats')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch editor questions from video_conversations
  const { data: editorQuestions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['pm-editor-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_conversations')
        .select('*')
        .eq('sender_type', 'editor')
        .eq('is_answered', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch message counts per video for badges
  const { data: videoMessageCounts = {} } = useQuery({
    queryKey: ['pm-video-message-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_conversations')
        .select('video_id');
      
      if (error) throw error;
      
      // Count messages per video_id
      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        if (row.video_id) {
          counts[row.video_id] = (counts[row.video_id] || 0) + 1;
        }
      });
      return counts;
    },
  });
  // Fetch videos in review_admin with delivery info
  const { data: pendingVideos = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pm-pending-videos', tasks.length, teamMembers.length],
    queryFn: async () => {
      // Fetch both review_admin and legacy in_review statuses
      const { data: reviewVideos, error } = await supabase
        .from('videos')
        .select('*')
        .in('status', ['review_admin', 'in_review']);
      
      if (error) throw error;
      
      if (reviewVideos && reviewVideos.length > 0) {
        const videoIds = reviewVideos.map(v => v.id);
        const { data: deliveries } = await supabase
          .from('video_deliveries')
          .select('*')
          .in('video_id', videoIds)
          .order('version_number', { ascending: false });
        
        return reviewVideos.map(video => {
          const delivery = deliveries?.find(d => d.video_id === video.id);
          const task = tasks.find(t => t.id === video.task_id);
          return {
            id: video.id,
            video_id: video.id,
            title: video.title,
            task_title: task?.title || 'Unknown Task',
            client_name: task?.client_name || null,
            editor_id: video.assigned_to || '',
            editor_name: getEditorName(video.assigned_to),
            delivery_id: delivery?.id || '',
            submitted_at: delivery?.submitted_at || video.updated_at,
            deadline: video.deadline,
            is_on_time: video.deadline ? new Date(delivery?.submitted_at || video.updated_at) <= new Date(video.deadline) : true,
            is_urgent: false, // Priority field removed
            revision_count: video.revision_count || 0,
            preview_link: delivery?.external_link || null,
            preview_link_type: (delivery?.link_type as 'drive' | 'frame' | 'dropbox' | 'other' | null) || null,
            file_path: delivery?.file_path || null,
            delivery_type: delivery?.delivery_type || null,
            cloudflare_stream_id: delivery?.cloudflare_stream_id || null,
            description: video.description || null,
          } as PendingVideoValidation;
        });
      }
      
      return [];
    },
    enabled: !tasksLoading && !teamMembersLoading,
  });

  // Fetch client profiles for avatars
  const { data: clientProfiles = [] } = useQuery({
    queryKey: ['pm-client-profiles-avatars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('user_id, avatar_url, logo_url, company_name');
      if (error) throw error;
      return data;
    },
  });

  // Map client_user_id to avatar
  const clientAvatarMap = useMemo(() => {
    const map = new Map<string, string | null>();
    clientProfiles.forEach(cp => {
      map.set(cp.user_id, cp.avatar_url || cp.logo_url || null);
    });
    return map;
  }, [clientProfiles]);

  // Compute task project summaries
  const taskSummaries = useMemo<TaskProjectSummary[]>(() => {
    return tasks.map(task => {
      const taskVideos = videos.filter(v => v.task_id === task.id);
      const videosCompleted = taskVideos.filter(v => v.is_validated).length;
      const videosLate = taskVideos.filter(v => 
        v.status === 'late' || 
        (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
      ).length;
      const videosInReview = taskVideos.filter(v => v.status === 'review_admin').length;
      const videosAtClient = taskVideos.filter(v => v.status === 'review_client').length;
      const videosActive = taskVideos.filter(v => 
        ['active', 'revision_requested'].includes(v.status)
      ).length;

      // Group by editor
      const editorMap = new Map<string, { videos_assigned: number; videos_completed: number }>();
      taskVideos.forEach(v => {
        if (v.assigned_to) {
          const existing = editorMap.get(v.assigned_to) || { videos_assigned: 0, videos_completed: 0 };
          existing.videos_assigned++;
          if (v.is_validated) existing.videos_completed++;
          editorMap.set(v.assigned_to, existing);
        }
      });

      return {
        id: task.id,
        title: task.title,
        client_name: task.client_name,
        client_avatar: task.client_user_id ? clientAvatarMap.get(task.client_user_id) || null : null,
        video_count: task.video_count || taskVideos.length,
        videos_completed: videosCompleted,
        videos_late: videosLate,
        videos_in_review: videosInReview,
        videos_at_client: videosAtClient,
        videos_active: videosActive,
        deadline: task.deadline,
        editors: Array.from(editorMap.entries()).map(([id, stats]) => ({
          id,
          name: getEditorName(id),
          ...stats,
        })),
      };
    });
  }, [tasks, videos, getEditorName, clientAvatarMap]);

  // Compute editor performance - include ALL active editors from team_members
  const editorPerformance = useMemo<EditorPerformance[]>(() => {
    // Get all active editors from team_members (even without stats)
    const activeEditors = teamMembers.filter(m => 
      m.user_id && m.status === 'active' && EDITOR_ROLES.includes(m.role || '')
    );
    
    // Create a map of stats by user_id for quick lookup
    const statsMap = new Map(editorStats.map(s => [s.user_id, s]));
    
    return activeEditors.map(member => {
      const stat = statsMap.get(member.user_id!);
      const editorVideos = videos.filter(v => v.assigned_to === member.user_id);
      const thisMonth = new Date();
      const monthStart = startOfMonth(thisMonth);
      const monthEnd = endOfMonth(thisMonth);
      
      const monthlyVideos = editorVideos.filter(v => {
        if (!v.completed_at) return false;
        const completedAt = new Date(v.completed_at);
        return completedAt >= monthStart && completedAt <= monthEnd;
      });

      const activeVideos = editorVideos.filter(v => 
        ['new', 'active', 'review_admin', 'review_client', 'revision_requested'].includes(v.status)
      ).length;

      const lateVideos = editorVideos.filter(v => 
        v.status === 'late' || 
        (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
      ).length;

      // Use stats if available, otherwise use defaults
      const totalDelivered = stat?.total_videos_delivered || 0;
      const totalOnTime = stat?.total_on_time || 0;
      const consecutiveLate = stat?.consecutive_late_count || 0;

      // Determine status based on rules
      let status: 'active' | 'warning' | 'at_risk' = 'active';
      const onTimeRate = totalDelivered > 0 
        ? (totalOnTime / totalDelivered) * 100
        : 100; // Default to 100% for new editors
      
      // At risk: <75% on-time rate OR 3+ consecutive late
      if (onTimeRate < 75 || consecutiveLate >= 3) {
        status = 'at_risk';
      } else if (lateVideos > 0 || consecutiveLate >= 1) {
        status = 'warning';
      }

      return {
        id: member.user_id!,
        name: member.full_name || member.email || 'Éditeur',
        avatar: null,
        level: stat?.level || 1,
        rank: stat?.rank || 'bronze',
        xp: stat?.xp || 0,
        videos_this_month: monthlyVideos.length,
        validated_videos: totalDelivered,
        late_videos: stat?.total_late || 0,
        on_time_rate: Math.round(onTimeRate),
        avg_quality: Number(stat?.average_rating) || 5,
        active_videos: activeVideos,
        streak: stat?.streak_days || 0,
        status,
      };
    });
  }, [editorStats, videos, teamMembers]);

  // Compute workload data
  const workloadData = useMemo(() => {
    return editorPerformance.map(editor => ({
      id: editor.id,
      name: editor.name,
      avatar: editor.avatar || editor.name.substring(0, 2).toUpperCase(),
      active_videos: editor.active_videos,
      capacity: 5,
      videos_completed: editor.validated_videos,
      videos_late: editor.late_videos,
      videos_in_review: videos.filter(v => 
        v.assigned_to === editor.id && (v.status === 'review_admin' || v.status === 'review_client')
      ).length,
    }));
  }, [editorPerformance, videos]);

  // Compute global stats
  const stats = useMemo(() => {
    const totalEditors = editorPerformance.length;
    const activeEditors = editorPerformance.filter(e => e.active_videos > 0).length;
    const atRiskEditors = editorPerformance.filter(e => e.status === 'at_risk').length;
    
    const avgOnTimeRate = totalEditors > 0 
      ? Math.round(editorPerformance.reduce((acc, e) => acc + e.on_time_rate, 0) / totalEditors)
      : 0;
    
    const totalPendingVideos = pendingVideos.length;
    
    const totalLateVideos = videos.filter(v => 
      v.status === 'late' || (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
    ).length;

    const totalRevisionVideos = videos.filter(v => v.status === 'revision_requested').length;

    const totalActiveVideos = videos.filter(v => v.status === 'active').length;
    
    const totalQuestions = editorQuestions.length;

    return {
      totalEditors,
      activeEditors,
      atRiskEditors,
      avgOnTimeRate,
      totalPendingVideos,
      totalLateVideos,
      totalRevisionVideos,
      totalActiveVideos,
      totalQuestions,
    };
  }, [editorPerformance, pendingVideos, videos, editorQuestions]);

  // Fetch design tasks
  const { data: designTasks = [], isLoading: designTasksLoading } = useQuery({
    queryKey: ['pm-design-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Designer name lookup (from team_members with role 'designer')
  const { data: designerMembers = [] } = useQuery({
    queryKey: ['pm-designer-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, full_name, email, role, status')
        .eq('role', 'designer');
      
      if (error) throw error;
      return data;
    },
  });

  const getDesignerName = (userId: string | null) => {
    if (!userId) return 'Non assigné';
    const member = designerMembers.find(m => m.user_id === userId);
    if (member) return member.full_name || member.email || 'Designer';
    // Fallback to editor map
    return editorNameMap.get(userId) || `Designer ${userId.substring(0, 6)}`;
  };

  // Realtime subscription for design_tasks
  useEffect(() => {
    const channel = supabase
      .channel('pm-design-tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'design_tasks',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['pm-design-tasks'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    // Raw data
    tasks,
    videos,
    editorStats,
    pendingVideos,
    editorQuestions,
    videoMessageCounts,
    designTasks,
    
    // Computed data
    taskSummaries,
    editorPerformance,
    workloadData,
    stats,
    
    // Helper functions
    getEditorName,
    getDesignerName,
    
    // Loading state
    isLoading: tasksLoading || videosLoading || editorsLoading || pendingLoading || teamMembersLoading || questionsLoading || designTasksLoading,
  };
}
