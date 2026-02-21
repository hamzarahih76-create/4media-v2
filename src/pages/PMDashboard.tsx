import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  Video,
  Target,
  AlertCircle,
  Play,
  Eye,
  Star,
  FolderOpen,
  RotateCcw,
  Plus,
  TrendingUp,
  Calendar,
  Zap,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePMDashboard } from '@/hooks/usePMDashboard';
import { useEditorPresence } from '@/hooks/useEditorPresence';
import { useClients } from '@/hooks/useClients';
import { BarChart3 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateProjectModal } from '@/components/pm/CreateProjectModal';
import { PMStatCard } from '@/components/pm/PMStatCard';
import { PMProjectRow } from '@/components/pm/PMProjectRow';
import { PMDesignProjectRow } from '@/components/pm/PMDesignProjectRow';
import { PMProjectFilters, type ProjectFilters } from '@/components/pm/PMProjectFilters';
import { PMValidationCard } from '@/components/pm/PMValidationCard';
import { PMEmptyState } from '@/components/pm/PMEmptyState';
import { PMQuickActions } from '@/components/pm/PMQuickActions';
import { EditorWorkloadCard } from '@/components/pm/EditorWorkloadCard';
import { SendToClientModal } from '@/components/pm/SendToClientModal';
import { EditProjectModal } from '@/components/pm/EditProjectModal';
import { EditorQuestionsCard } from '@/components/pm/EditorQuestionsCard';
import { ProjectDetailModal } from '@/components/pm/ProjectDetailModal';
import type { PendingVideoValidation } from '@/types/video';
import { format, parseISO, isPast } from 'date-fns';
import { VideoPreviewModal } from '@/components/pm/VideoPreviewModal';
import { fr } from 'date-fns/locale';
import { MonthSelector } from '@/components/editor/MonthSelector';
import { EditorManagementTab } from '@/components/pm/EditorManagementTab';
import { EditorDetailDialog } from '@/components/pm/EditorDetailDialog';
import { Users as UsersIcon } from 'lucide-react';
import type { EditorPerformance } from '@/types/video';
const rankColors: Record<string, string> = {
  bronze: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  silver: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  platinum: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  diamond: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
};

const statusConfig = {
  active: { label: 'Actif', color: 'bg-success/20 text-success' },
  warning: { label: 'Attention', color: 'bg-warning/20 text-warning' },
  at_risk: { label: 'À risque', color: 'bg-destructive/20 text-destructive' },
};

export default function PMDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline, getOnlineCount } = useEditorPresence();
  const { data: allClients = [] } = useClients();
  
  const {
    tasks,
    videos,
    pendingVideos,
    editorQuestions,
    taskSummaries,
    editorPerformance,
    workloadData,
    stats,
    getEditorName,
    getDesignerName,
    isLoading,
    videoMessageCounts,
    designTasks,
  } = usePMDashboard();
  
  // Local state
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<PendingVideoValidation | null>(null);
  const [qualityRating, setQualityRating] = useState([4]);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [lateVideosDialogOpen, setLateVideosDialogOpen] = useState(false);
  const [activeEditorsDialogOpen, setActiveEditorsDialogOpen] = useState(false);
  
  const [pendingVideosDialogOpen, setPendingVideosDialogOpen] = useState(false);
  const [atRiskEditorsDialogOpen, setAtRiskEditorsDialogOpen] = useState(false);
  const [revisionVideosDialogOpen, setRevisionVideosDialogOpen] = useState(false);
  const [activeVideosDialogOpen, setActiveVideosDialogOpen] = useState(false);
  const [clientPendingDialogOpen, setClientPendingDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>({
    search: '',
    client: null,
    status: null,
    editor: null,
  });
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const [sendToClientOpen, setSendToClientOpen] = useState(false);
  const [videoToSend, setVideoToSend] = useState<{
    id: string;
    title: string;
    client_name: string | null;
    external_link: string | null;
  } | null>(null);
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [videoToPreview, setVideoToPreview] = useState<{
    id: string;
    title: string;
    externalLink: string | null;
    filePath: string | null;
    clientName: string | null;
    cloudflareStreamId: string | null;
  } | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<string | null>(null);
  const [editorDetailOpen, setEditorDetailOpen] = useState(false);
  const [selectedEditorDetail, setSelectedEditorDetail] = useState<EditorPerformance | null>(null);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Compute video breakdown for selected editor
  const selectedEditorVideosList = useMemo(() => {
    if (!selectedEditorDetail) return [];
    return videos.filter(v => v.assigned_to === selectedEditorDetail.id);
  }, [selectedEditorDetail, videos]);

  const selectedEditorVideos = useMemo(() => {
    if (!selectedEditorDetail) return null;
    
    const editorVideos = selectedEditorVideosList;
    
    return {
      active: editorVideos.filter(v => ['new', 'active'].includes(v.status)).length,
      in_revision: editorVideos.filter(v => v.status === 'revision_requested').length,
      awaiting_client: editorVideos.filter(v => v.status === 'review_client').length,
      validated: editorVideos.filter(v => v.status === 'completed' || v.is_validated).length,
      late: editorVideos.filter(v => 
        v.status === 'late' || (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
      ).length,
    };
  }, [selectedEditorDetail, selectedEditorVideosList]);

  // Get client name from task_id
  const getClientNameFromTask = useMemo(() => {
    const taskMap = new Map<string, string>();
    for (const task of taskSummaries) {
      taskMap.set(task.id, task.client_name || task.title);
    }
    return (taskId: string) => taskMap.get(taskId) || 'Client inconnu';
  }, [taskSummaries]);

  const handleEditorClick = (editor: EditorPerformance) => {
    setSelectedEditorDetail(editor);
    setEditorDetailOpen(true);
  };

  const lateVideosByEditor = useMemo(() => {
    const lateVideos = videos.filter(v => 
      v.status === 'late' || (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
    );
    
    const grouped = new Map<string, { id: string; name: string; videos: typeof lateVideos }>();
    
    lateVideos.forEach(video => {
      const editorId = video.assigned_to || 'unassigned';
      const editorName = editorId === 'unassigned' 
        ? 'Non assigné' 
        : getEditorName(editorId);
      
      if (!grouped.has(editorId)) {
        grouped.set(editorId, { id: editorId, name: editorName, videos: [] });
      }
      grouped.get(editorId)!.videos.push(video);
    });
    
    return Array.from(grouped.values()).sort((a, b) => b.videos.length - a.videos.length);
  }, [videos, getEditorName]);

  // Validate video mutation
  const validateVideoMutation = useMutation({
    mutationFn: async (params: { videoId: string; rating: number }) => {
      const { error } = await supabase
        .from('videos')
        .update({
          is_validated: true,
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
          validation_rating: params.rating,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', params.videoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vidéo validée avec succès!');
      setValidateDialogOpen(false);
      setSelectedVideo(null);
      queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
      queryClient.invalidateQueries({ queryKey: ['pm-pending-videos'] });
      queryClient.invalidateQueries({ queryKey: ['pm-tasks'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la validation');
      console.error(error);
    },
  });

  // Request revision mutation
  const requestRevisionMutation = useMutation({
    mutationFn: async (params: { videoId: string; notes: string; images: File[] }) => {
      // Upload images to storage first
      const imageUrls: string[] = [];
      for (const image of params.images) {
        const filePath = `revision-images/${params.videoId}/${Date.now()}-${image.name}`;
        const { error: uploadError } = await supabase.storage
          .from('deliveries')
          .upload(filePath, image);
        
        if (!uploadError) {
          const { data: urlData } = await supabase.storage
            .from('deliveries')
            .createSignedUrl(filePath, 60 * 60 * 24 * 30); // 30 days
          if (urlData?.signedUrl) {
            imageUrls.push(urlData.signedUrl);
          }
        }
      }

      const { error } = await supabase
        .from('videos')
        .update({
          status: 'revision_requested',
          revision_count: (selectedVideo?.revision_count || 0) + 1,
        })
        .eq('id', params.videoId);
      
      if (error) throw error;

      // Fetch the latest delivery and review link for this video
      let deliveryId = selectedVideo?.delivery_id;
      let reviewLinkId: string | null = null;
      
      // Get delivery and review link together
      const { data: deliveryData } = await supabase
        .from('video_deliveries')
        .select('id')
        .eq('video_id', params.videoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (deliveryData) {
        deliveryId = deliveryData.id;
        
        // Get the active review link for this delivery
        const { data: reviewLink } = await supabase
          .from('video_review_links')
          .select('id')
          .eq('delivery_id', deliveryId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        reviewLinkId = reviewLink?.id || null;
        
        // If no review link exists, create one for internal admin tracking
        if (!reviewLinkId) {
          const { data: newReviewLink } = await supabase
            .from('video_review_links')
            .insert({
              video_id: params.videoId,
              delivery_id: deliveryId,
              token: crypto.randomUUID(),
              is_active: true,
            })
            .select('id')
            .single();
          
          reviewLinkId = newReviewLink?.id || null;
        }
      }

      // Insert video feedback with revision notes and images
      if (deliveryId && reviewLinkId) {
        const { error: feedbackError } = await supabase.from('video_feedback').insert({
          video_id: params.videoId,
          delivery_id: deliveryId,
          review_link_id: reviewLinkId,
          decision: 'revision_requested',
          revision_notes: params.notes,
          revision_images: imageUrls,
          reviewed_by: user?.email || 'PM',
        });
        
        if (feedbackError) {
          console.error('Error inserting feedback:', feedbackError);
        }
      } else if (deliveryId) {
        // Fallback: store the revision notes in video_conversations if no review link can be created
        await supabase.from('video_conversations').insert({
          video_id: params.videoId,
          sender_id: user?.id || '',
          sender_name: user?.email || 'Admin',
          sender_type: 'admin',
          message: `🔄 Révision demandée: ${params.notes}`,
          is_answered: true,
        });
      }

      // Send notification to editor with project, client and video info
      // Get video details including assigned editor
      const { data: videoData } = await supabase
        .from('videos')
        .select('assigned_to, title, task_id')
        .eq('id', params.videoId)
        .single();
      
      if (videoData?.assigned_to) {
        // Get task details for project and client name
        let projectName = selectedVideo?.task_title || 'Projet';
        let clientName = selectedVideo?.client_name || '';
        const videoTitle = videoData.title || selectedVideo?.title || 'Vidéo';
        
        if (videoData.task_id) {
          const { data: taskData } = await supabase
            .from('tasks')
            .select('project_name, client_name')
            .eq('id', videoData.task_id)
            .single();
          
          projectName = taskData?.project_name || projectName;
          clientName = taskData?.client_name || clientName;
        }
        
        const contextParts = [projectName];
        if (clientName) contextParts.push(clientName);
        const contextLine = contextParts.join(' • ');
        
        await supabase.rpc('create_notification', {
          p_user_id: videoData.assigned_to,
          p_type: 'revision_requested',
          p_title: 'Révision demandée',
          p_message: `${contextLine} - Des modifications ont été demandées sur la vidéo "${videoTitle}".`,
          p_link: '/editor',
          p_metadata: {
            video_id: params.videoId,
            video_title: videoTitle,
            project_name: projectName,
            client_name: clientName,
            requires_email: true,
          },
        });

        // Trigger email notification
        await supabase.functions.invoke('send-notification-email', {
          body: {
            send_to_editor: videoData.assigned_to,
            video_title: videoTitle,
            admin_message: `Révision demandée: ${params.notes}`,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success('Révision demandée');
      setRevisionDialogOpen(false);
      setSelectedVideo(null);
      setRevisionNotes('');
      queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
      queryClient.invalidateQueries({ queryKey: ['pm-pending-videos'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la demande de révision');
      console.error(error);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // First delete all videos associated with this task
      const { error: videosError } = await supabase
        .from('videos')
        .delete()
        .eq('task_id', taskId);
      
      if (videosError) throw videosError;

      // Then delete the task itself
      const { error: taskError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (taskError) throw taskError;
    },
    onSuccess: () => {
      toast.success('Projet supprimé avec succès!');
      setDeleteProjectDialogOpen(false);
      setProjectToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['pm-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du projet');
      console.error(error);
    },
  });

  const handleDeleteProject = (taskId: string, title: string) => {
    setProjectToDelete({ id: taskId, title });
    setDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    deleteProjectMutation.mutate(projectToDelete.id);
  };

  const handleValidateVideo = (video: PendingVideoValidation) => {
    setSelectedVideo(video);
    setQualityRating([4]);
    setValidateDialogOpen(true);
  };

  const handleRequestRevision = (video: PendingVideoValidation) => {
    setSelectedVideo(video);
    setRevisionNotes('');
    setRevisionDialogOpen(true);
  };

  const confirmValidation = () => {
    if (!selectedVideo) return;
    validateVideoMutation.mutate({
      videoId: selectedVideo.video_id,
      rating: qualityRating[0],
    });
  };

  const confirmRevision = () => {
    if (!selectedVideo) return;
    requestRevisionMutation.mutate({
      videoId: selectedVideo.video_id,
      notes: revisionNotes,
      images: [],
    });
  };

  const handleViewTaskDetails = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskDetailsOpen(true);
  };

  // Handlers for video actions in project row
  const handleViewVideoFromProject = (video: { id: string; title: string }) => {
    // Find the full video data from videos array (now includes external_link, file_path, and cloudflare_stream_id)
    const fullVideo = videos.find(v => v.id === video.id) as typeof videos[0] & { 
      external_link?: string | null;
      file_path?: string | null;
      cloudflare_stream_id?: string | null;
    };
    const task = taskSummaries.find(t => fullVideo && t.id === fullVideo.task_id);
    
    setVideoToPreview({
      id: video.id,
      title: video.title,
      externalLink: fullVideo?.external_link || null,
      filePath: fullVideo?.file_path || null,
      clientName: task?.client_name || null,
      cloudflareStreamId: fullVideo?.cloudflare_stream_id || null,
    });
    setVideoPreviewOpen(true);
  };

  const handleRequestRevisionFromProject = (video: { id: string; title: string }) => {
    // Find the video and create a minimal PendingVideoValidation object
    const fullVideo = videos.find(v => v.id === video.id);
    if (fullVideo) {
      // Get the task for this video
      const task = taskSummaries.find(t => t.id === fullVideo.task_id);
      const pending: PendingVideoValidation = {
        id: fullVideo.id,
        video_id: fullVideo.id,
        title: fullVideo.title,
        task_title: task?.title || '',
        client_name: task?.client_name || null,
        editor_id: fullVideo.assigned_to || '',
        editor_name: getEditorName(fullVideo.assigned_to),
        delivery_id: '', // Will be fetched if needed
        submitted_at: fullVideo.updated_at,
        deadline: fullVideo.deadline,
        is_on_time: !(fullVideo.deadline && new Date() > new Date(fullVideo.deadline)),
        is_urgent: false,
        revision_count: fullVideo.revision_count || 0,
        preview_link: (fullVideo as typeof fullVideo & { external_link?: string | null }).external_link || null,
        preview_link_type: null,
        file_path: (fullVideo as typeof fullVideo & { file_path?: string | null }).file_path || null,
        delivery_type: (fullVideo as typeof fullVideo & { delivery_type?: string | null }).delivery_type || null,
        cloudflare_stream_id: (fullVideo as typeof fullVideo & { cloudflare_stream_id?: string | null }).cloudflare_stream_id || null,
        description: fullVideo.description || null,
      };
      setSelectedVideo(pending);
      setRevisionNotes('');
      setRevisionDialogOpen(true);
    }
  };

  const handleSendToClientFromProject = (video: { id: string; title: string }) => {
    const fullVideo = videos.find(v => v.id === video.id) as typeof videos[0] & { external_link?: string | null };
    const task = taskSummaries.find(t => fullVideo && t.id === fullVideo.task_id);
    
    setVideoToSend({
      id: video.id,
      title: video.title,
      client_name: task?.client_name || null,
      external_link: fullVideo?.external_link || null,
    });
    setSendToClientOpen(true);
  };

  const handleProjectClick = (taskId: string) => {
    setSelectedProjectId(taskId);
    setProjectDetailOpen(true);
  };

  const handleEditProject = (projectId: string) => {
    setProjectToEdit(projectId);
    setEditProjectOpen(true);
  };

  const selectedTaskDetails = useMemo(() => {
    if (!selectedTaskId) return null;
    const task = taskSummaries.find(t => t.id === selectedTaskId);
    const taskVideos = videos.filter(v => v.task_id === selectedTaskId);
    return { task, videos: taskVideos };
  }, [selectedTaskId, taskSummaries, videos]);

  const { totalEditors, atRiskEditors } = stats;

  // Month range for filtering
  const monthRange = useMemo(() => {
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
    return { monthStart, monthEnd };
  }, [selectedMonth]);

  // Filter videos by selected month (based on created_at or deadline)
  const videosForMonth = useMemo(() => {
    return videos.filter(v => {
      // Include videos created in selected month OR with deadline in selected month
      const createdAt = v.created_at ? new Date(v.created_at) : null;
      const deadline = v.deadline ? new Date(v.deadline) : null;
      
      const createdInMonth = createdAt && createdAt >= monthRange.monthStart && createdAt <= monthRange.monthEnd;
      const deadlineInMonth = deadline && deadline >= monthRange.monthStart && deadline <= monthRange.monthEnd;
      
      return createdInMonth || deadlineInMonth;
    });
  }, [videos, monthRange]);

  // All monthly stats
  const monthlyStats = useMemo(() => {
    const confirmed = videos.filter(v => {
      if (!v.is_validated || !v.validated_at) return false;
      const validatedAt = new Date(v.validated_at);
      return validatedAt >= monthRange.monthStart && validatedAt <= monthRange.monthEnd;
    }).length;

    const active = videosForMonth.filter(v => v.status === 'active').length;
    const pending = videosForMonth.filter(v => v.status === 'review_admin').length;
    const clientPending = videosForMonth.filter(v => v.status === 'review_client').length;
    const late = videosForMonth.filter(v => 
      v.status === 'late' || (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
    ).length;
    const revision = videosForMonth.filter(v => v.status === 'revision_requested').length;

    const totalVideos = videosForMonth.length;

    return { confirmed, active, pending, clientPending, late, revision, totalVideos };
  }, [videos, videosForMonth, monthRange]);

  // Count projects by status (for selected month)
  const projectStats = useMemo(() => {
    // Filter tasks that have videos in the selected month
    const tasksWithMonthlyVideos = taskSummaries.filter(task => {
      const taskVideos = videosForMonth.filter(v => v.task_id === task.id);
      return taskVideos.length > 0;
    });
    
    const completed = tasksWithMonthlyVideos.filter(t => t.videos_completed === t.video_count && t.video_count > 0).length;
    const inProgress = tasksWithMonthlyVideos.filter(t => t.videos_completed < t.video_count || t.video_count === 0).length;
    const late = tasksWithMonthlyVideos.filter(t => t.videos_late > 0).length;
    return { completed, inProgress, late, total: tasksWithMonthlyVideos.length };
  }, [taskSummaries, videosForMonth]);

  // Get unique clients for filter
  const uniqueClients = useMemo(() => {
    const clients = taskSummaries
      .map(t => t.client_name)
      .filter((c): c is string => Boolean(c));
    return [...new Set(clients)];
  }, [taskSummaries]);

  // Get unique editors for filter
  const allEditors = useMemo(() => {
    const editorMap = new Map<string, string>();
    taskSummaries.forEach(task => {
      task.editors.forEach(editor => {
        editorMap.set(editor.id, editor.name);
      });
    });
    return Array.from(editorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [taskSummaries]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return taskSummaries.filter(task => {
      // Search filter
      if (projectFilters.search) {
        const search = projectFilters.search.toLowerCase();
        if (!task.title.toLowerCase().includes(search) && 
            !task.client_name?.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Client filter
      if (projectFilters.client && task.client_name !== projectFilters.client) {
        return false;
      }

      // Status filter
      if (projectFilters.status) {
        const isCompleted = task.videos_completed === task.video_count && task.video_count > 0;
        const isLate = task.videos_late > 0;
        
        if (projectFilters.status === 'completed' && !isCompleted) return false;
        if (projectFilters.status === 'late' && !isLate) return false;
        if (projectFilters.status === 'in_progress' && (isCompleted || isLate)) return false;
      }

      // Editor filter
      if (projectFilters.editor) {
        const hasEditor = task.editors.some(e => e.id === projectFilters.editor);
        if (!hasEditor) return false;
      }

      return true;
    });
  }, [taskSummaries, projectFilters]);

  // Get videos for a project
  const getProjectVideos = (taskId: string) => {
    return videos.filter(v => v.task_id === taskId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de la production
            </p>
          </div>
          <div className="flex items-center gap-4">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            <PMQuickActions 
              onNewProject={() => setCreateProjectOpen(true)}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* KPI Cards - 8 cards: 1.Projets 2.Vidéos actives 3.En validation 4.En révision 5.Attente client 6.Confirmées 7.Éditeurs à risque 8.Questions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {/* 1. Projets actifs */}
          <PMStatCard
            title="Projets actifs"
            value={projectStats.inProgress}
            subtitle={`/ ${projectStats.total}`}
            icon={FolderOpen}
            variant="default"
            onClick={() => setActiveTab('projects')}
          />
          {/* 2. Vidéos actives */}
          <PMStatCard
            title="Vidéos actives"
            value={monthlyStats.active}
            subtitle={`/ ${monthlyStats.totalVideos}`}
            icon={Play}
            variant={monthlyStats.active > 0 ? 'default' : 'success'}
            onClick={() => monthlyStats.active > 0 && setActiveVideosDialogOpen(true)}
          />
          {/* 3. En validation */}
          <PMStatCard
            title="En validation"
            value={monthlyStats.pending}
            icon={Clock}
            variant={monthlyStats.pending > 0 ? 'warning' : 'success'}
            onClick={() => monthlyStats.pending > 0 ? setActiveTab('validation') : null}
          />
          {/* 4. En révision */}
          <PMStatCard
            title="En révision"
            value={monthlyStats.revision}
            icon={RotateCcw}
            variant={monthlyStats.revision > 0 ? 'warning' : 'success'}
            onClick={() => monthlyStats.revision > 0 && setRevisionVideosDialogOpen(true)}
          />
          {/* 5. Attente client */}
          <PMStatCard
            title="Attente client"
            value={monthlyStats.clientPending}
            icon={Eye}
            variant={monthlyStats.clientPending > 0 ? 'info' : 'success'}
            onClick={() => monthlyStats.clientPending > 0 && setClientPendingDialogOpen(true)}
          />
          {/* 6. Confirmées */}
          <PMStatCard
            title="Confirmées"
            value={monthlyStats.confirmed}
            icon={CheckCircle2}
            variant="success"
          />
          {/* 7. Éditeurs à risque */}
          <PMStatCard
            title="Éditeurs à risque"
            value={atRiskEditors}
            subtitle={`/ ${totalEditors}`}
            icon={AlertTriangle}
            variant={atRiskEditors > 0 ? 'danger' : 'success'}
            onClick={() => atRiskEditors > 0 && setAtRiskEditorsDialogOpen(true)}
          />
          {/* 8. Questions */}
          <EditorQuestionsCard
            questions={editorQuestions}
            getEditorName={getEditorName}
            tasks={taskSummaries}
            videos={videos}
          />
        </div>

        {/* Monthly Performance Progress */}
        {(() => {
          const totalCreated = videosForMonth.length;
          const totalValidated = monthlyStats.confirmed;
          const pct = totalCreated > 0 ? Math.round((totalValidated / totalCreated) * 100) : 0;
          return (
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Performance du mois</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {totalValidated}/{totalCreated} vidéos validées ({pct}%)
                  </span>
                </div>
                <Progress value={totalCreated > 0 ? (totalValidated / totalCreated) * 100 : 0} className="h-2.5" />
              </CardContent>
            </Card>
          );
        })()}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-border/50">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {[
                { value: 'projects', label: 'Projets', icon: FolderOpen, count: projectStats.total },
                { value: 'validation', label: 'Validation', icon: CheckCircle2, count: monthlyStats.pending, highlight: monthlyStats.pending > 0 },
                { value: 'performance', label: 'Performance', icon: TrendingUp },
                { value: 'editors', label: 'Éditeurs', icon: UsersIcon },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'relative px-4 py-3 rounded-none border-b-2 border-transparent',
                    'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                    'hover:bg-muted/50 transition-colors'
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge 
                      className={cn(
                        'ml-2 h-5 min-w-5 px-1.5 text-[10px]',
                        tab.highlight 
                          ? 'bg-warning/20 text-warning border-warning/30' 
                          : 'bg-muted text-muted-foreground'
                      )}
                      variant="outline"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6 mt-0">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="h-20 animate-pulse bg-muted/30" />
                ))}
              </div>
            ) : taskSummaries.length === 0 ? (
              <PMEmptyState 
                type="projects" 
                onAction={() => setCreateProjectOpen(true)}
                actionLabel="Créer un projet"
              />
            ) : (
              <>
                {/* Filters */}
                <PMProjectFilters
                  clients={uniqueClients}
                  editors={allEditors}
                  onFiltersChange={setProjectFilters}
                />

                {/* Project Rows */}
                <div className="space-y-3">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Aucun projet ne correspond à vos filtres
                    </div>
                  ) : (
                    filteredProjects.map(task => (
                      <PMProjectRow
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        client_name={task.client_name}
                        client_avatar={task.client_avatar}
                        deadline={task.deadline}
                        video_count={task.video_count}
                        videos_completed={task.videos_completed}
                        videos_late={task.videos_late}
                        videos_in_review={task.videos_in_review}
                        videos_active={task.videos_active}
                        videos={getProjectVideos(task.id)}
                        editors={task.editors}
                        getEditorName={getEditorName}
                        videoMessageCounts={videoMessageCounts}
                        onViewDetails={handleViewTaskDetails}
                        onViewVideo={handleViewVideoFromProject}
                        onRequestRevision={handleRequestRevisionFromProject}
                        onSendToClient={handleSendToClientFromProject}
                        onDeleteProject={handleDeleteProject}
                        onEditProject={handleEditProject}
                        onProjectClick={handleProjectClick}
                      />
                    ))
                  )}
                  {/* Design Projects */}
                  {designTasks.length > 0 && (
                    <>
                      {filteredProjects.length > 0 && designTasks.length > 0 && (
                        <div className="mt-4 mb-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-3">
                          <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wide flex items-center justify-center gap-2">
                            🎨 Projets Design
                          </span>
                          {(() => {
                            const totalDesigns = designTasks.reduce((sum, dt) => sum + (dt.design_count || 0), 0);
                            const completedDesigns = designTasks.reduce((sum, dt) => sum + (dt.designs_completed || 0), 0);
                            const pctDesign = totalDesigns > 0 ? Math.round((completedDesigns / totalDesigns) * 100) : 0;
                            return (
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-xs font-semibold">Performance du mois</span>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600">
                                    {completedDesigns}/{totalDesigns} designs validées ({pctDesign}%)
                                  </span>
                                </div>
                                <Progress value={totalDesigns > 0 ? (completedDesigns / totalDesigns) * 100 : 0} className="h-2" />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      {designTasks.map(dt => (
                        <PMDesignProjectRow
                          key={dt.id}
                          task={dt}
                          getDesignerName={getDesignerName}
                          onDeleteProject={(taskId, title) => {
                            setProjectToDelete({ id: taskId, title });
                            setDeleteProjectDialogOpen(true);
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-6 mt-0">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="h-60 animate-pulse bg-muted/30" />
                ))}
              </div>
            ) : pendingVideos.length === 0 ? (
              <PMEmptyState type="validation" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingVideos.map(video => (
                  <PMValidationCard
                    key={video.id}
                    video={video}
                    onValidate={() => handleValidateVideo(video)}
                    onRequestRevision={() => handleRequestRevision(video)}
                    onViewVideo={() => {
                      setVideoToPreview({
                        id: video.video_id,
                        title: video.title,
                        externalLink: video.preview_link || null,
                        filePath: video.file_path || null,
                        clientName: video.client_name || null,
                        cloudflareStreamId: video.cloudflare_stream_id || null,
                      });
                      setVideoPreviewOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Editors Tab */}
          <TabsContent value="editors" className="space-y-6 mt-0">
            <EditorManagementTab />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-0">
            {isLoading ? (
              <Card className="h-96 animate-pulse bg-muted/30" />
            ) : editorPerformance.length === 0 ? (
              <PMEmptyState type="editors" />
            ) : (
              <Card className="border-border/50">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Performance des éditeurs
                    </CardTitle>
                    <Badge variant="outline" className="text-muted-foreground">
                      {editorPerformance.length} éditeur{editorPerformance.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[250px]">Éditeur</TableHead>
                          <TableHead>Rang</TableHead>
                          <TableHead className="text-center">Ce mois</TableHead>
                          <TableHead className="text-center">Ponctualité</TableHead>
                          <TableHead className="text-center">Qualité</TableHead>
                          <TableHead className="text-center">Statut</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editorPerformance.map(editor => (
                          <TableRow 
                            key={editor.id} 
                            className="group cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleEditorClick(editor)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                      {editor.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span 
                                          className={cn(
                                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                                            isOnline(editor.id) 
                                              ? 'bg-success' 
                                              : 'bg-muted-foreground/50'
                                          )}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="text-xs">
                                        {isOnline(editor.id) ? 'En ligne' : 'Hors ligne'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{editor.name}</p>
                                    {isOnline(editor.id) && (
                                      <span className="text-[10px] text-success font-medium">EN LIGNE</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Nv. {editor.level} • {editor.xp.toLocaleString()} XP
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('capitalize text-xs', rankColors[editor.rank])}>
                                {editor.rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">{editor.videos_this_month}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Progress 
                                  value={editor.on_time_rate} 
                                  className={cn(
                                    'h-1.5 w-16',
                                    editor.on_time_rate >= 90 && '[&>div]:bg-success',
                                    editor.on_time_rate >= 75 && editor.on_time_rate < 90 && '[&>div]:bg-warning',
                                    editor.on_time_rate < 75 && '[&>div]:bg-destructive'
                                  )}
                                />
                                <span className={cn(
                                  'text-sm font-medium tabular-nums',
                                  editor.on_time_rate >= 90 ? 'text-success' :
                                  editor.on_time_rate >= 75 ? 'text-warning' :
                                  'text-destructive'
                                )}>
                                  {editor.on_time_rate}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="h-4 w-4 text-warning fill-warning" />
                                <span className="font-medium">{editor.avg_quality.toFixed(1)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  statusConfig[editor.status].color
                                )}
                              >
                                {statusConfig[editor.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir profil
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Video className="h-4 w-4 mr-2" />
                                    Voir vidéos
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Play className="h-4 w-4 mr-2" />
                                    Évaluer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals & Dialogs */}
      <EditorDetailDialog
        open={editorDetailOpen}
        onOpenChange={setEditorDetailOpen}
        editor={selectedEditorDetail}
        editorVideos={selectedEditorVideos}
        videosList={selectedEditorVideosList}
        getClientName={getClientNameFromTask}
      />

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />

      {/* Validate Dialog */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Valider la vidéo
            </DialogTitle>
            <DialogDescription>
              {selectedVideo?.title} — {selectedVideo?.task_title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Note de qualité</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={qualityRating}
                  onValueChange={setQualityRating}
                  min={1}
                  max={5}
                  step={1}
                  className="flex-1"
                />
                <div className="flex items-center gap-1.5 min-w-16 justify-end">
                  {[...Array(qualityRating[0])].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-warning fill-warning" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              className="bg-success hover:bg-success/90"
              onClick={confirmValidation}
              disabled={validateVideoMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-warning" />
              Demander une révision
            </DialogTitle>
            <DialogDescription>
              {selectedVideo?.title} — {selectedVideo?.task_title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Display existing instructions if available */}
            {selectedVideo?.description && (() => {
              const sourceMatch = selectedVideo.description.match(/📁 Fichiers source:\s*(https?:\/\/[^\s]+)/);
              const sourceLink = sourceMatch?.[1];
              const instructions = selectedVideo.description
                .replace(/\n\n📁 Fichiers source:\s*https?:\/\/[^\s]+/, '')
                .trim();
              
              if (instructions || sourceLink) {
                return (
                  <div className="p-3 bg-muted/50 rounded-lg border border-muted space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Instructions initiales du projet
                    </p>
                    {instructions && (
                      <p className="text-sm whitespace-pre-wrap">{instructions}</p>
                    )}
                    {sourceLink && (
                      <a 
                        href={sourceLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        📁 Fichiers source
                      </a>
                    )}
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="space-y-2">
              <Label htmlFor="revisionNotes">Notes de révision pour l'éditeur</Label>
              <Textarea
                id="revisionNotes"
                placeholder="Décrivez les modifications à apporter..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="default"
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
              onClick={confirmRevision}
              disabled={requestRevisionMutation.isPending || !revisionNotes.trim()}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Sheet */}
      <Sheet open={taskDetailsOpen} onOpenChange={setTaskDetailsOpen}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedTaskDetails?.task?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {selectedTaskDetails && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">
                      {selectedTaskDetails.task?.videos_completed}/{selectedTaskDetails.task?.video_count} vidéos
                    </span>
                  </div>
                  <Progress 
                    value={(selectedTaskDetails.task?.videos_completed || 0) / (selectedTaskDetails.task?.video_count || 1) * 100} 
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Vidéos ({selectedTaskDetails.videos.length})</h4>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-4">
                      {selectedTaskDetails.videos.map(video => (
                        <div 
                          key={video.id}
                          className="p-3 rounded-lg border bg-card flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              video.status === 'completed' ? 'bg-success' :
                              video.status === 'review_admin' || video.status === 'review_client' ? 'bg-warning' :
                              video.status === 'late' ? 'bg-destructive' :
                              video.status === 'active' ? 'bg-primary' :
                              'bg-muted'
                            )} />
                            <div>
                              <p className="font-medium text-sm">{video.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {video.assigned_to ? `Assigné` : 'Non assigné'}
                                {video.deadline && ` • ${format(new Date(video.deadline), 'dd MMM', { locale: fr })}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {video.status === 'new' ? 'Nouveau' :
                             video.status === 'active' ? 'Actif' :
                             video.status === 'review_admin' ? 'Review Admin' :
                             video.status === 'review_client' ? 'Client Review' :
                             video.status === 'revision_requested' ? 'Révision' :
                             video.status === 'completed' ? 'Terminé' :
                             video.status === 'late' ? 'En retard' :
                             video.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Late Videos Dialog */}
      <Dialog open={lateVideosDialogOpen} onOpenChange={setLateVideosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Vidéos en retard
            </DialogTitle>
            <DialogDescription>
              {stats.totalLateVideos} vidéo{stats.totalLateVideos > 1 ? 's' : ''} en retard au total
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 py-4">
            {lateVideosByEditor.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 className="h-12 w-12 text-success/50" />
                <p className="text-muted-foreground">Aucune vidéo en retard 🎉</p>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                {lateVideosByEditor.map(editor => (
                  <div key={editor.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-destructive/10 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-destructive/20 text-destructive text-xs">
                            {editor.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{editor.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {editor.videos.length} vidéo{editor.videos.length > 1 ? 's' : ''} en retard
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                        {editor.videos.length}
                      </Badge>
                    </div>
                    
                    <div className="divide-y">
                      {editor.videos.map(video => {
                        const daysLate = video.deadline 
                          ? Math.floor((new Date().getTime() - new Date(video.deadline).getTime()) / (1000 * 60 * 60 * 24))
                          : 0;
                        return (
                          <div key={video.id} className="p-3 flex items-center justify-between text-sm">
                            <div>
                              <p className="font-medium">{video.title}</p>
                              {video.deadline && (
                                <p className="text-xs text-muted-foreground">
                                  Deadline: {format(new Date(video.deadline), 'dd MMM yyyy', { locale: fr })}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-destructive border-destructive/30">
                              +{daysLate}j
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>


      {/* At-Risk Editors Dialog */}
      <Dialog open={atRiskEditorsDialogOpen} onOpenChange={setAtRiskEditorsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Éditeurs à risque
            </DialogTitle>
            <DialogDescription>
              Éditeurs nécessitant une attention particulière
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] py-4">
            {editorPerformance.filter(e => e.status === 'at_risk').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 className="h-12 w-12 text-success/50" />
                <p className="text-muted-foreground">Aucun éditeur à risque 🎉</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {editorPerformance
                  .filter(e => e.status === 'at_risk')
                  .map(editor => (
                    <div key={editor.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-destructive/20 text-destructive text-xs">
                              {editor.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{editor.name}</p>
                            <p className="text-xs text-muted-foreground">Niveau {editor.level}</p>
                          </div>
                        </div>
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                          À risque
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center p-2 rounded bg-background/50">
                          <p className="text-lg font-bold text-destructive">{editor.on_time_rate}%</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Ponctualité</p>
                        </div>
                        <div className="text-center p-2 rounded bg-background/50">
                          <p className="text-lg font-bold">{editor.late_videos}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Retards</p>
                        </div>
                        <div className="text-center p-2 rounded bg-background/50">
                          <p className="text-lg font-bold">{editor.active_videos}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">En cours</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Revision Videos Dialog */}
      <Dialog open={revisionVideosDialogOpen} onOpenChange={setRevisionVideosDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-warning" />
              Vidéos en révision
            </DialogTitle>
            <DialogDescription>
              Vidéos nécessitant des modifications de la part des éditeurs
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] py-4">
            {(() => {
              const revisionVideos = videos.filter(v => v.status === 'revision_requested');
              if (revisionVideos.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="h-12 w-12 text-success/50" />
                    <p className="text-muted-foreground">Aucune vidéo en révision 🎉</p>
                  </div>
                );
              }
              
              // Group by editor
              const grouped = new Map<string, { id: string; name: string; videos: typeof revisionVideos }>();
              revisionVideos.forEach(video => {
                const editorId = video.assigned_to || 'unassigned';
                const editorName = getEditorName(video.assigned_to);
                if (!grouped.has(editorId)) {
                  grouped.set(editorId, { id: editorId, name: editorName, videos: [] });
                }
                grouped.get(editorId)!.videos.push(video);
              });
              
              return (
                <div className="space-y-4 pr-4">
                  {Array.from(grouped.values()).map(editor => (
                    <div key={editor.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-warning/10 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-warning/20 text-warning text-xs">
                              {editor.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{editor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {editor.videos.length} vidéo{editor.videos.length > 1 ? 's' : ''} en révision
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-warning/20 text-warning border-warning/30">
                          {editor.videos.length}
                        </Badge>
                      </div>
                      
                      <div className="divide-y">
                        {editor.videos.map(video => {
                          const task = taskSummaries.find(t => t.id === video.task_id);
                          return (
                            <div key={video.id} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{video.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task?.client_name || 'Client'} • Révision #{(video.revision_count || 0) + 1}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-warning border-warning/30">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                En cours
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Active Videos Dialog */}
      <Dialog open={activeVideosDialogOpen} onOpenChange={setActiveVideosDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Vidéos actives
            </DialogTitle>
            <DialogDescription>
              Vidéos en cours de montage par les éditeurs
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] py-4">
            {(() => {
              const activeVideos = videos.filter(v => v.status === 'active');
              if (activeVideos.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Aucune vidéo active</p>
                  </div>
                );
              }
              
              // Group by editor
              const grouped = new Map<string, { id: string; name: string; videos: typeof activeVideos }>();
              activeVideos.forEach(video => {
                const editorId = video.assigned_to || 'unassigned';
                const editorName = getEditorName(video.assigned_to);
                if (!grouped.has(editorId)) {
                  grouped.set(editorId, { id: editorId, name: editorName, videos: [] });
                }
                grouped.get(editorId)!.videos.push(video);
              });
              
              return (
                <div className="space-y-4 pr-4">
                  {Array.from(grouped.values()).map(editor => (
                    <div key={editor.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-primary/10 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {editor.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{editor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {editor.videos.length} vidéo{editor.videos.length > 1 ? 's' : ''} en cours
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {editor.videos.length}
                        </Badge>
                      </div>
                      
                      <div className="divide-y">
                        {editor.videos.map(video => {
                          const task = taskSummaries.find(t => t.id === video.task_id);
                          return (
                            <div key={video.id} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{video.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task?.title || 'Projet'} • {task?.client_name || 'Client'}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-primary border-primary/30">
                                <Play className="h-3 w-3 mr-1" />
                                En cours
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Client Pending Videos Dialog */}
      <Dialog open={clientPendingDialogOpen} onOpenChange={setClientPendingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              Attente validation client
            </DialogTitle>
            <DialogDescription>
              Vidéos envoyées aux clients en attente de leur retour
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] py-4">
            {(() => {
              const clientPendingVideos = videos.filter(v => v.status === 'review_client');
              if (clientPendingVideos.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="h-12 w-12 text-success/50" />
                    <p className="text-muted-foreground">Aucune vidéo en attente client 🎉</p>
                  </div>
                );
              }
              
              // Group by client
              const grouped = new Map<string, { name: string; videos: typeof clientPendingVideos }>();
              clientPendingVideos.forEach(video => {
                const task = taskSummaries.find(t => t.id === video.task_id);
                const clientName = task?.client_name || 'Client inconnu';
                if (!grouped.has(clientName)) {
                  grouped.set(clientName, { name: clientName, videos: [] });
                }
                grouped.get(clientName)!.videos.push(video);
              });
              
              return (
                <div className="space-y-4 pr-4">
                  {Array.from(grouped.values()).map(client => (
                    <div key={client.name} className="border rounded-lg overflow-hidden">
                      <div className="bg-accent/10 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.videos.length} vidéo{client.videos.length > 1 ? 's' : ''} en attente
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-accent/20 text-accent border-accent/30">
                          {client.videos.length}
                        </Badge>
                      </div>
                      
                      <div className="divide-y">
                        {client.videos.map(video => {
                          const task = taskSummaries.find(t => t.id === video.task_id);
                          const editorName = getEditorName(video.assigned_to);
                          return (
                            <div key={video.id} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{video.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task?.title || 'Projet'} • {editorName}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-accent border-accent/30">
                                <Eye className="h-3 w-3 mr-1" />
                                Chez client
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer le projet
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projectToDelete?.title}" ? 
              Cette action supprimera également toutes les vidéos associées et est irréversible.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteProjectDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Client Modal */}
      <SendToClientModal
        open={sendToClientOpen}
        onOpenChange={setSendToClientOpen}
        video={videoToSend}
        onSend={(method, message) => {
          toast.success(`Vidéo envoyée via ${method === 'email' ? 'Email' : 'WhatsApp'}`);
        }}
      />

      {/* Video Preview Modal */}
      <VideoPreviewModal
        open={videoPreviewOpen}
        onOpenChange={setVideoPreviewOpen}
        videoTitle={videoToPreview?.title || ''}
        externalLink={videoToPreview?.externalLink || null}
        filePath={videoToPreview?.filePath || null}
        cloudflareStreamId={videoToPreview?.cloudflareStreamId || null}
        videoId={videoToPreview?.id || null}
        showActions={true}
        onValidate={(videoId, rating) => {
          validateVideoMutation.mutate({ videoId, rating });
          setVideoPreviewOpen(false);
        }}
        onRequestRevision={(videoId, notes, images) => {
          requestRevisionMutation.mutate({ videoId, notes, images });
          setVideoPreviewOpen(false);
        }}
        onSendToClient={(videoId) => {
          setVideoToSend({
            id: videoId,
            title: videoToPreview?.title || '',
            client_name: videoToPreview?.clientName || null,
            external_link: videoToPreview?.externalLink || null,
          });
          setSendToClientOpen(true);
        }}
        isValidating={validateVideoMutation.isPending}
        isRequestingRevision={requestRevisionMutation.isPending}
      />

      {/* Edit Project Modal */}
      {projectToEdit && (() => {
        const task = taskSummaries.find(t => t.id === projectToEdit);
        const projectVideos = videos.filter(v => v.task_id === projectToEdit);
        return (
          <EditProjectModal
            open={editProjectOpen}
            onOpenChange={setEditProjectOpen}
            projectId={projectToEdit}
            projectTitle={task?.title || ''}
            clientName={task?.client_name || null}
            clientUserId={(task as any)?.client_user_id || null}
            deadline={task?.deadline || null}
            
            description={(task as any)?.description || null}
            videos={projectVideos}
            getEditorName={getEditorName}
          />
        );
      })()}

      {/* Project Detail Modal */}
      {(() => {
        const task = selectedProjectId ? taskSummaries.find(t => t.id === selectedProjectId) : null;
        const rawTask = selectedProjectId ? tasks.find(t => t.id === selectedProjectId) : null;
        const clientProfile = task?.client_name
          ? allClients.find(c => 
              c.company_name?.toLowerCase().trim() === task.client_name?.toLowerCase().trim() ||
              (rawTask?.client_user_id && c.user_id === rawTask.client_user_id)
            )
          : null;
        return (
          <ProjectDetailModal
            open={projectDetailOpen}
            onOpenChange={setProjectDetailOpen}
            project={task ? {
              id: task.id,
              title: task.title,
              client_name: task.client_name,
              deadline: task.deadline,
              description: rawTask?.description || null,
              video_count: task.video_count,
              videos_completed: task.videos_completed,
              videos_late: task.videos_late,
              videos_in_review: task.videos_in_review,
              videos_active: task.videos_active,
              editors: task.editors,
            } : null}
            clientProfile={clientProfile ? {
              subscription_type: clientProfile.subscription_type,
              videos_per_month: clientProfile.videos_per_month,
              monthly_price: clientProfile.monthly_price,
              total_contract: clientProfile.total_contract,
              advance_received: clientProfile.advance_received,
              workflow_status: clientProfile.workflow_status,
              project_end_date: clientProfile.project_end_date,
              contact_name: clientProfile.contact_name,
              company_name: clientProfile.company_name,
              notes: clientProfile.notes,
            } : null}
            taskData={rawTask ? {
              editor_instructions: rawTask.editor_instructions,
              source_files_link: rawTask.source_files_link,
              status: rawTask.status,
              priority: rawTask.priority,
            } : null}
          />
        );
      })()}
    </DashboardLayout>
  );
}
