import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Users,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskProjectSummary } from '@/types/video';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskProjectCardProps {
  task: TaskProjectSummary;
  onViewDetails?: (taskId: string) => void;
}

export function TaskProjectCard({ task, onViewDetails }: TaskProjectCardProps) {
  const progressPercentage = task.video_count > 0 
    ? Math.round((task.videos_completed / task.video_count) * 100) 
    : 0;

  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.videos_completed < task.video_count;
  const hasLateVideos = task.videos_late > 0;
  const hasPendingReviews = task.videos_in_review > 0;

  const getStatusColor = () => {
    if (isOverdue || hasLateVideos) return 'border-destructive/30 bg-destructive/5';
    if (hasPendingReviews) return 'border-warning/30 bg-warning/5';
    if (progressPercentage === 100) return 'border-success/30 bg-success/5';
    return 'border-border/50';
  };

  return (
    <Card className={cn('transition-colors', getStatusColor())}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            {task.client_name && (
              <p className="text-sm text-muted-foreground">{task.client_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasLateVideos && (
              <Badge variant="outline" className="text-destructive border-destructive/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                {task.videos_late} late
              </Badge>
            )}
            {hasPendingReviews && (
              <Badge variant="outline" className="text-warning border-warning/30">
                <Eye className="h-3 w-3 mr-1" />
                {task.videos_in_review} en revue
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Video className="h-4 w-4" />
              Progression
            </span>
            <span className="font-medium">
              {task.videos_completed}/{task.video_count} vidéos
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className={cn(
              'h-2',
              progressPercentage === 100 && '[&>div]:bg-success',
              hasLateVideos && '[&>div]:bg-destructive'
            )}
          />
        </div>

        {/* Video Status Breakdown */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-success">{task.videos_completed}</p>
            <p className="text-xs text-muted-foreground">Validées</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-warning">{task.videos_in_review}</p>
            <p className="text-xs text-muted-foreground">En revue</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{task.videos_active}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className={cn('text-lg font-bold', task.videos_late > 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {task.videos_late}
            </p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </div>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className={cn(
            'flex items-center gap-2 text-sm p-2 rounded-lg',
            isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted/50 text-muted-foreground'
          )}>
            <Clock className="h-4 w-4" />
            <span>
              Deadline: {format(parseISO(task.deadline), 'dd MMM yyyy', { locale: fr })}
            </span>
            {isOverdue && (
              <Badge className="ml-auto bg-destructive/20 text-destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                En retard
              </Badge>
            )}
          </div>
        )}

        {/* Editors Assigned */}
        {task.editors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              Éditeurs assignés
            </p>
            <div className="flex flex-wrap gap-2">
              {task.editors.map((editor) => (
                <Badge 
                  key={editor.id} 
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <span>{editor.name}</span>
                  <span className="text-xs opacity-70">
                    ({editor.videos_completed}/{editor.videos_assigned})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* View Details Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onViewDetails?.(task.id)}
        >
          Voir les détails
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
