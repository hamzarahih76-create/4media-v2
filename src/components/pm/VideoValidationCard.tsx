import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PendingVideoValidation } from '@/types/video';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VideoValidationCardProps {
  video: PendingVideoValidation;
  onValidate: (video: PendingVideoValidation) => void;
  onRequestRevision?: (video: PendingVideoValidation) => void;
  onPreview?: (video: PendingVideoValidation) => void;
}

export function VideoValidationCard({ 
  video, 
  onValidate,
  onRequestRevision,
  onPreview 
}: VideoValidationCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        !video.is_on_time && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center',
          video.is_on_time ? 'bg-success/10' : 'bg-destructive/10'
        )}>
          {video.is_on_time ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{video.title}</p>
            {video.is_urgent && (
              <Badge className="bg-destructive/20 text-destructive">
                Urgent
              </Badge>
            )}
            {video.revision_count > 0 && (
              <Badge variant="outline" className="text-warning border-warning/30">
                <RotateCcw className="h-3 w-3 mr-1" />
                v{video.revision_count + 1}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {video.editor_name} • {video.task_title}
            {video.client_name && ` • ${video.client_name}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className={cn(
            video.is_on_time ? 'text-success' : 'text-destructive'
          )}>
            {video.is_on_time ? 'À temps' : 'En retard'}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 justify-end">
            <Clock className="h-3 w-3" />
            {format(parseISO(video.submitted_at), 'HH:mm', { locale: fr })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {onPreview && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onPreview(video)}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {onRequestRevision && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onRequestRevision(video)}
              className="text-warning border-warning/30 hover:bg-warning/10"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => onValidate(video)}
            className="gradient-primary text-white"
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
