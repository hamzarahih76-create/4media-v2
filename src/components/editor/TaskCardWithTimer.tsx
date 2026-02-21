import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Square, CheckCircle2, AlertCircle, Pause } from 'lucide-react';

interface TaskCardWithTimerProps {
  task: {
    id: string;
    title: string;
    client: string;
    project: string;
    status: 'pending' | 'in_progress' | 'review' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    deadline: string;
    rewardLevel: 'standard' | 'high' | 'premium';
    startedAt?: Date;
  };
  onStart?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  className?: string;
}

const statusConfig = {
  pending: { 
    label: 'À faire', 
    color: 'bg-muted text-muted-foreground',
    icon: Clock,
  },
  in_progress: { 
    label: 'En cours', 
    color: 'bg-primary/10 text-primary',
    icon: Play,
  },
  review: { 
    label: 'En review', 
    color: 'bg-amber-500/10 text-amber-500',
    icon: AlertCircle,
  },
  completed: { 
    label: 'Terminé', 
    color: 'bg-emerald-500/10 text-emerald-500',
    icon: CheckCircle2,
  },
};

const priorityConfig = {
  low: { label: 'Normal', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  medium: { label: 'Normal', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  high: { label: 'Prioritaire', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  urgent: { label: 'Urgent', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const rewardConfig = {
  standard: { label: 'Standard', color: 'text-muted-foreground' },
  high: { label: 'Récompense élevée', color: 'text-amber-500' },
  premium: { label: 'Premium', color: 'text-purple-500' },
};

function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}min`;
  }
  return `${mins}min ${secs.toString().padStart(2, '0')}s`;
}

export function TaskCardWithTimer({ task, onStart, onPause, onComplete, className }: TaskCardWithTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(task.status === 'in_progress');

  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const reward = rewardConfig[task.rewardLevel];
  const StatusIcon = status.icon;

  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && task.status === 'in_progress') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, task.status]);

  // Initialize elapsed time from startedAt
  useEffect(() => {
    if (task.startedAt && task.status === 'in_progress') {
      const elapsed = Math.floor((Date.now() - new Date(task.startedAt).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
      setIsRunning(true);
    }
  }, [task.startedAt, task.status]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setElapsedSeconds(0);
    onStart?.();
  }, [onStart]);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    onComplete?.();
  }, [onComplete]);

  return (
    <div className={cn(
      'group relative overflow-hidden rounded-xl bg-card border transition-all duration-300',
      'hover:shadow-md hover:border-border',
      isOverdue ? 'border-destructive/50' : 'border-border/50',
      task.status === 'in_progress' && 'ring-2 ring-primary/20',
      className
    )}>
      {/* Priority indicator */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1',
        task.priority === 'urgent' && 'bg-destructive',
        task.priority === 'high' && 'bg-amber-500',
        task.priority === 'medium' && 'bg-blue-500',
        task.priority === 'low' && 'bg-slate-500',
      )} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {task.title}
            </h4>
            <p className="text-sm text-muted-foreground truncate">
              {task.client} • {task.project}
            </p>
          </div>

          <Badge variant="outline" className={cn('shrink-0 text-xs', status.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        {/* Timer display when in progress */}
        {task.status === 'in_progress' && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                </div>
                <span className="text-sm text-muted-foreground">En cours depuis</span>
              </div>
              <span className="text-lg font-mono font-semibold text-primary">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge variant="outline" className={cn('text-xs', priority.color)}>
            {priority.label}
          </Badge>

          <div className={cn(
            'flex items-center gap-1 text-xs',
            isOverdue ? 'text-destructive' : 'text-muted-foreground'
          )}>
            <Clock className="h-3 w-3" />
            <span>{new Date(task.deadline).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'short' 
            })}</span>
            {isOverdue && <span className="font-medium">(En retard)</span>}
          </div>

          <span className={cn('text-xs font-medium ml-auto', reward.color)}>
            {reward.label}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          {task.status === 'pending' && onStart && (
            <Button 
              size="sm" 
              onClick={handleStart}
              className="h-9 gap-2"
            >
              <Play className="h-4 w-4" />
              Commencer
            </Button>
          )}
          {task.status === 'in_progress' && (
            <>
              {onPause && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onPause}
                  className="h-9 gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              {onComplete && (
                <Button 
                  size="sm"
                  onClick={handleComplete}
                  className="h-9 gap-2"
                >
                  <Square className="h-4 w-4" />
                  Terminer
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
