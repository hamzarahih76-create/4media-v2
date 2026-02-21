import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight, UserPlus, Building2, AlertTriangle, UserCheck, Users, Hourglass, Calendar, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminChatDialog, ClientChatDialog } from './EditorChatDialogs';

interface TaskCardProps {
  task: {
    id: string;
    videoId?: string; // The video ID for fetching conversation counts
    title: string;
    client: string;
    project: string;
    status: 'new' | 'active' | 'late' | 'review_admin' | 'review_client' | 'revision_requested' | 'completed';
    deadline: string;
    rewardLevel: 'standard' | 'high' | 'premium';
    clientType?: 'b2b' | 'b2c' | 'international';
    source?: 'assigned' | 'created';
    startedAt?: Date | null;
    allowedDuration?: number; // in seconds (default 5 hours = 18000)
  };
  onOpenWorkflow?: () => void;
  className?: string;
}

const clientTypeConfig = {
  b2b: { label: 'B2B', color: 'bg-sky-500/10 text-sky-600 border-sky-500/30', icon: Building2 },
  b2c: { label: 'B2C', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: UserPlus },
  international: { label: 'International', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30', icon: Building2 },
};

const statusConfig = {
  new: { label: 'Nouveau', color: 'bg-muted text-muted-foreground border-muted-foreground/30' },
  active: { label: 'Active', color: 'bg-primary/10 text-primary border-primary/30' },
  late: { label: 'En retard', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  review_admin: { label: 'Review Admin', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: UserCheck },
  review_client: { label: 'Chez le client', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Users },
  revision_requested: { label: 'Révision', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
};

const packageConfig = {
  standard: { label: 'Standard', color: 'bg-muted text-muted-foreground' },
  high: { label: 'Premium', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  premium: { label: 'Premium', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

// Format countdown time (shows negative when late)
function formatCountdownTime(secondsRemaining: number): string {
  const isNegative = secondsRemaining < 0;
  const absSeconds = Math.abs(secondsRemaining);
  const hrs = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  
  const prefix = isNegative ? '-' : '';
  
  if (hrs > 0) {
    return `${prefix}${hrs}h ${mins.toString().padStart(2, '0')}min`;
  }
  return `${prefix}${mins}min ${secs.toString().padStart(2, '0')}s`;
}

// Format allocated time (for new tasks)
function formatAllocatedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}min`;
  } else if (hrs > 0) {
    return `${hrs}h 00min`;
  }
  return `${mins}min`;
}

// Format deadline countdown (days, hours, minutes, seconds - always show seconds)
function formatDeadlineCountdown(secondsRemaining: number): string {
  const isNegative = secondsRemaining < 0;
  const absSeconds = Math.abs(secondsRemaining);
  
  const days = Math.floor(absSeconds / (24 * 3600));
  const hrs = Math.floor((absSeconds % (24 * 3600)) / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  
  const prefix = isNegative ? '-' : '';
  
  if (days > 0) {
    return `${prefix}${days}j ${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}min ${secs.toString().padStart(2, '0')}s`;
  }
  if (hrs > 0) {
    return `${prefix}${hrs}h ${mins.toString().padStart(2, '0')}min ${secs.toString().padStart(2, '0')}s`;
  }
  return `${prefix}${mins}min ${secs.toString().padStart(2, '0')}s`;
}

export function TaskCard({ task, onOpenWorkflow, className }: TaskCardProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [deadlineSecondsRemaining, setDeadlineSecondsRemaining] = useState(0);
  const [adminMessageCount, setAdminMessageCount] = useState(0);
  const [clientMessageCount, setClientMessageCount] = useState(0);
  const [adminChatOpen, setAdminChatOpen] = useState(false);
  const [clientChatOpen, setClientChatOpen] = useState(false);
  
  const clientType = task.clientType ? clientTypeConfig[task.clientType] : null;
  const statusInfo = statusConfig[task.status];
  const packageType = packageConfig[task.rewardLevel];
  const isNew = task.status === 'new';
  const isActive = task.status === 'active' || task.status === 'revision_requested';
  const isLateStatus = task.status === 'late';
  const isCreatedByEditor = task.source === 'created';
  const allowedDuration = task.allowedDuration || 5 * 60 * 60; // 5 hours default

  // Fetch conversation counts
  useEffect(() => {
    const videoId = task.videoId || task.id;

    const fetchConversationCounts = async () => {
      // Fetch admin messages (from video_conversations where sender_type is 'admin')
      const { count: adminCount } = await supabase
        .from('video_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', videoId)
        .eq('sender_type', 'admin');

      // Fetch admin revision feedback (from video_feedback where reviewed_by contains @)
      const { data: feedbackData } = await supabase
        .from('video_feedback')
        .select('reviewed_by')
        .eq('video_id', videoId)
        .eq('decision', 'revision_requested');
      
      const adminFeedbackCount = feedbackData?.filter(fb => fb.reviewed_by && fb.reviewed_by.includes('@')).length || 0;

      setAdminMessageCount((adminCount || 0) + adminFeedbackCount);

      // Fetch client messages (from video_feedback where reviewed_by does NOT contain @)
      const { data: clientFeedback } = await supabase
        .from('video_feedback')
        .select('reviewed_by, feedback_text')
        .eq('video_id', videoId);
      
      const clientFeedbackCount = clientFeedback?.filter(fb => 
        !fb.reviewed_by || !fb.reviewed_by.includes('@')
      ).length || 0;

      setClientMessageCount(clientFeedbackCount);
    };

    fetchConversationCounts();

    // Subscribe to realtime updates for conversations
    const conversationChannel = supabase
      .channel(`editor-conv-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_conversations',
          filter: `video_id=eq.${videoId}`,
        },
        () => fetchConversationCounts()
      )
      .subscribe();

    // Subscribe to realtime updates for feedback
    const feedbackChannel = supabase
      .channel(`editor-feedback-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_feedback',
          filter: `video_id=eq.${videoId}`,
        },
        () => fetchConversationCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(feedbackChannel);
    };
  }, [task.id, task.videoId]);
  
  // Countdown timer logic - starts automatically when Active
  useEffect(() => {
    if ((isActive || isLateStatus) && task.startedAt) {
      const calculateRemaining = () => {
        const elapsed = Math.floor((Date.now() - new Date(task.startedAt!).getTime()) / 1000);
        return allowedDuration - elapsed;
      };
      
      setSecondsRemaining(calculateRemaining());
      
      const interval = setInterval(() => {
        setSecondsRemaining(calculateRemaining());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActive, isLateStatus, task.startedAt, allowedDuration]);

  // Deadline countdown timer - always runs if deadline exists
  useEffect(() => {
    if (task.deadline) {
      const calculateDeadlineRemaining = () => {
        const deadlineTime = new Date(task.deadline).getTime();
        const now = Date.now();
        return Math.floor((deadlineTime - now) / 1000);
      };
      
      setDeadlineSecondsRemaining(calculateDeadlineRemaining());
      
      const interval = setInterval(() => {
        setDeadlineSecondsRemaining(calculateDeadlineRemaining());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [task.deadline]);

  const isLate = secondsRemaining < 0;
  const isDeadlinePassed = deadlineSecondsRemaining < 0;

  // Get indicator color based on status
  const getIndicatorColor = () => {
    if (isNew) return 'bg-muted-foreground/30';
    if (isLateStatus || isLate) return 'bg-destructive';
    if (task.status === 'revision_requested') return 'bg-orange-500';
    if (task.status === 'active') return 'bg-primary';
    if (task.status === 'review_admin') return 'bg-amber-500';
    if (task.status === 'review_client') return 'bg-purple-500';
    if (task.status === 'completed') return 'bg-emerald-500';
    return 'bg-muted-foreground/30';
  };

  return (
    <div 
      className={cn(
        'group relative overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-200 cursor-pointer',
        'hover:border-border hover:shadow-sm',
        isNew && 'border-dashed border-muted-foreground/30 bg-muted/30',
        isActive && !isLate && 'ring-1 ring-primary/30 border-primary/30',
        (isActive && isLate) || isLateStatus && 'ring-1 ring-destructive/50 border-destructive/50 bg-destructive/5',
        task.status === 'review_admin' && 'border-amber-500/30',
        task.status === 'review_client' && 'border-purple-500/30',
        task.status === 'revision_requested' && 'border-orange-500/30',
        className
      )}
      onClick={onOpenWorkflow}
    >
      {/* Status indicator line */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', getIndicatorColor())} />

      <div className="p-3 pl-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Title + Client + Source indicator */}
          <div className="flex-1 min-w-0 max-w-[200px]">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-sm truncate">
                {task.title}
              </h4>
              {isNew && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-muted-foreground/30 shrink-0">
                  Nouveau
                </Badge>
              )}
              {(isLateStatus || (isActive && isLate)) && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/30 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                </Badge>
              )}
              {task.status === 'revision_requested' && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-500/10 text-orange-600 border-orange-500/30 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {task.project && task.client ? (
                <>
                  <span className="font-medium text-foreground/80">{task.project}</span>
                  <span className="mx-1">•</span>
                  <span>{task.client}</span>
                </>
              ) : task.client ? (
                task.client
              ) : task.project ? (
                task.project
              ) : (
                'Client'
              )}
            </p>
          </div>

          {/* Center: Deadline countdown + Temps alloué */}
          <div className="flex items-center gap-4 shrink-0">
            {task.deadline && (
              <div className={cn(
                'flex items-center gap-2 text-xs',
                isDeadlinePassed && 'text-destructive'
              )}>
                <Calendar className={cn('h-3.5 w-3.5', isDeadlinePassed ? 'text-destructive' : 'text-muted-foreground')} />
                <span className={cn('font-medium', isDeadlinePassed ? 'text-destructive' : 'text-foreground')}>
                  {new Date(task.deadline).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short'
                  })}
                </span>
                <div className="flex items-center gap-1">
                  <Clock className={cn('h-3.5 w-3.5', isDeadlinePassed ? 'text-destructive' : 'text-muted-foreground')} />
                  <span className={cn(
                    'font-mono text-xs',
                    isDeadlinePassed ? 'text-destructive font-medium' : 'text-foreground'
                  )}>
                    {formatDeadlineCountdown(deadlineSecondsRemaining)}
                  </span>
                </div>
              </div>
            )}

            {/* Allocated time for new tasks */}
            {isNew && allowedDuration && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hourglass className="h-3.5 w-3.5" />
                <span className="font-mono font-medium text-foreground">
                  {formatAllocatedTime(allowedDuration)}
                </span>
              </div>
            )}

            {/* Timer when active */}
            {(isActive || isLateStatus) && task.startedAt && (
              <div className={cn(
                'flex items-center gap-1.5 text-xs',
                isLate && 'text-destructive'
              )}>
                <div className="relative">
                  <Clock className={cn('h-3.5 w-3.5', isLate ? 'text-destructive' : 'text-primary')} />
                  <span className={cn(
                    'absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full animate-pulse',
                    isLate ? 'bg-destructive' : 'bg-primary'
                  )} />
                </div>
                <span className={cn(
                  'font-mono font-medium',
                  isLate ? 'text-destructive' : 'text-primary'
                )}>
                  {formatCountdownTime(secondsRemaining)}
                </span>
              </div>
            )}
          </div>

          {/* Badges: Client Type + Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {!isNew && task.status !== 'active' && task.status !== 'late' && (
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            )}
          </div>

          {/* Chat indicators - clickable */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Chat Admin */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAdminChatOpen(true);
              }}
              className="flex flex-col items-center hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            >
              <span className="text-[9px] text-muted-foreground leading-tight">Chat</span>
              <span className="text-[9px] text-muted-foreground leading-tight">Admin</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                {adminMessageCount > 0 && (
                  <span className="flex items-center justify-center h-3.5 min-w-[14px] px-0.5 text-[9px] font-medium bg-primary text-primary-foreground rounded-full">
                    {adminMessageCount}
                  </span>
                )}
              </div>
            </button>
            
            {/* Chat Client */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setClientChatOpen(true);
              }}
              className="flex flex-col items-center hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            >
              <span className="text-[9px] text-muted-foreground leading-tight">Chat</span>
              <span className="text-[9px] text-muted-foreground leading-tight">Client</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                {clientMessageCount > 0 && (
                  <span className="flex items-center justify-center h-3.5 min-w-[14px] px-0.5 text-[9px] font-medium bg-emerald-500 text-white rounded-full">
                    {clientMessageCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Right: Arrow */}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </div>
      {/* Chat Dialogs */}
      <AdminChatDialog
        open={adminChatOpen}
        onOpenChange={setAdminChatOpen}
        videoId={task.videoId || task.id}
        videoTitle={task.title}
        projectName={task.project}
        clientName={task.client}
      />
      <ClientChatDialog
        open={clientChatOpen}
        onOpenChange={setClientChatOpen}
        videoId={task.videoId || task.id}
        videoTitle={task.title}
        clientName={task.client}
      />
    </div>
  );
}
