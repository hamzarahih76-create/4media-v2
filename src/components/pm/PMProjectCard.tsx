import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Users,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskProjectSummary } from '@/types/video';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PMProjectCardProps {
  task: TaskProjectSummary;
  onViewDetails?: (taskId: string) => void;
}

export function PMProjectCard({ task, onViewDetails }: PMProjectCardProps) {
  const progressPercentage = task.video_count > 0 
    ? Math.round((task.videos_completed / task.video_count) * 100) 
    : 0;

  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.videos_completed < task.video_count;
  const hasLateVideos = task.videos_late > 0;
  const isCompleted = progressPercentage === 100;
  
  const daysUntilDeadline = task.deadline 
    ? differenceInDays(parseISO(task.deadline), new Date())
    : null;

  const getCardStyle = () => {
    if (isCompleted) return 'border-success/20 bg-gradient-to-br from-success/5 to-transparent';
    if (isOverdue || hasLateVideos) return 'border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent';
    if (daysUntilDeadline !== null && daysUntilDeadline <= 2) return 'border-warning/20 bg-gradient-to-br from-warning/5 to-transparent';
    return 'border-border/50 hover:border-primary/20';
  };

  const getProgressColor = () => {
    if (isCompleted) return '[&>div]:bg-success';
    if (hasLateVideos) return '[&>div]:bg-destructive';
    return '[&>div]:bg-primary';
  };

  return (
    <Card className={cn(
      'group transition-all duration-200 hover:shadow-lg hover:shadow-primary/5',
      getCardStyle()
    )}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {task.title}
            </h3>
            {task.client_name && (
              <p className="text-sm text-muted-foreground truncate">{task.client_name}</p>
            )}
          </div>
          
          {/* Status badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isCompleted && (
              <Badge className="bg-success/20 text-success border-success/30 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Terminé
              </Badge>
            )}
            {hasLateVideos && !isCompleted && (
              <Badge variant="outline" className="text-destructive border-destructive/30 gap-1">
                <AlertCircle className="h-3 w-3" />
                {task.videos_late}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              Progression
            </span>
            <span className="font-medium tabular-nums">
              {task.videos_completed}/{task.video_count}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className={cn('h-1.5', getProgressColor())}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'Validées', value: task.videos_completed, color: 'text-success' },
            { label: 'En revue', value: task.videos_in_review, color: 'text-warning' },
            { label: 'En cours', value: task.videos_active, color: 'text-primary' },
            { label: 'Retard', value: task.videos_late, color: task.videos_late > 0 ? 'text-destructive' : 'text-muted-foreground' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/30">
              <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className={cn(
            'flex items-center gap-2 text-sm py-2 px-3 rounded-lg',
            isOverdue 
              ? 'bg-destructive/10 text-destructive' 
              : daysUntilDeadline !== null && daysUntilDeadline <= 2
                ? 'bg-warning/10 text-warning'
                : 'bg-muted/50 text-muted-foreground'
          )}>
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {format(parseISO(task.deadline), 'dd MMMM yyyy', { locale: fr })}
            </span>
            {isOverdue && (
              <Badge className="ml-auto bg-destructive/20 text-destructive text-[10px] shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Retard
              </Badge>
            )}
            {!isOverdue && daysUntilDeadline !== null && daysUntilDeadline <= 2 && (
              <span className="ml-auto text-xs font-medium shrink-0">
                J-{daysUntilDeadline}
              </span>
            )}
          </div>
        )}

        {/* Editors */}
        {task.editors.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {task.editors.slice(0, 3).map((editor) => (
                <Avatar key={editor.id} className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-medium">
                    {editor.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.editors.length > 3 && (
                <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    +{task.editors.length - 3}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {task.editors.length} éditeur{task.editors.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Action */}
        <Button 
          variant="ghost" 
          className="w-full h-9 text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors"
          onClick={() => onViewDetails?.(task.id)}
        >
          Voir les détails
          <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
