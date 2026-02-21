import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Video, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorWorkload {
  id: string;
  name: string;
  avatar?: string;
  active_videos: number;
  capacity: number;
  videos_completed: number;
  videos_late: number;
  videos_in_review: number;
}

interface EditorWorkloadCardProps {
  editor: EditorWorkload;
}

export function EditorWorkloadCard({ editor }: EditorWorkloadCardProps) {
  const loadPercentage = editor.capacity > 0 
    ? Math.round((editor.active_videos / editor.capacity) * 100)
    : 0;

  const isOverloaded = loadPercentage >= 100;
  const isAtRisk = loadPercentage >= 80;

  return (
    <div className="space-y-3 p-4 rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
            {editor.avatar || editor.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-medium">{editor.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {editor.active_videos}/{editor.capacity} actives
              </span>
            </div>
          </div>
        </div>
        <Badge className={cn(
          isOverloaded ? 'bg-destructive/20 text-destructive' :
          isAtRisk ? 'bg-warning/20 text-warning' :
          'bg-success/20 text-success'
        )}>
          {loadPercentage}%
        </Badge>
      </div>

      <Progress 
        value={Math.min(loadPercentage, 100)} 
        className={cn(
          'h-2',
          isOverloaded && '[&>div]:bg-destructive',
          isAtRisk && !isOverloaded && '[&>div]:bg-warning'
        )}
      />

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3 w-3" />
          {editor.videos_completed} validées
        </span>
        <span className="flex items-center gap-1 text-warning">
          <Clock className="h-3 w-3" />
          {editor.videos_in_review} en revue
        </span>
        {editor.videos_late > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3 w-3" />
            {editor.videos_late} en retard
          </span>
        )}
      </div>

      {isOverloaded && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Capacité dépassée - Risque de retard
        </p>
      )}
    </div>
  );
}
