import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Video,
  Clock,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Zap,
  Eye,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PendingVideoValidation } from '@/types/video';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface PMValidationCardProps {
  video: PendingVideoValidation;
  onValidate: () => void;
  onRequestRevision: () => void;
  onViewVideo: () => void;
}

export function PMValidationCard({ video, onValidate, onRequestRevision, onViewVideo }: PMValidationCardProps) {
  const submittedAgo = formatDistanceToNow(new Date(video.submitted_at), { 
    addSuffix: true, 
    locale: fr 
  });
  
  const hasRevisions = video.revision_count > 0;
  const hasPreview = video.preview_link || video.file_path || video.cloudflare_stream_id;

  const handlePreview = () => {
    if (hasPreview) {
      onViewVideo();
    } else {
      toast.error('Aucun lien de prévisualisation disponible', {
        description: 'L\'éditeur n\'a pas encore fourni de lien pour cette vidéo.'
      });
    }
  };

  return (
    <Card className={cn(
      'group transition-all duration-200 hover:shadow-lg',
      video.is_urgent && 'border-warning/30 bg-gradient-to-br from-warning/5 to-transparent',
      !video.is_on_time && 'border-destructive/30'
    )}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{video.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{video.editor_name || 'Éditeur'}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {video.is_urgent && (
                  <Badge className="bg-warning/20 text-warning border-warning/30 gap-1 text-[10px]">
                    <Zap className="h-3 w-3" />
                    Urgent
                  </Badge>
                )}
                {!video.is_on_time && (
                  <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Retard
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Project & Delivery Info */}
        <div className="space-y-2">
          {/* Project Name */}
          <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs">
            <span className="text-muted-foreground">Projet: </span>
            <span className="font-medium text-foreground">{video.task_title}</span>
          </div>
          
          {/* Client & Delivery Time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {video.client_name && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium text-foreground">{video.client_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Livré {submittedAgo}</span>
            </div>
          </div>
        </div>

        {/* Editor & Revision Info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-muted">
                {video.editor_name?.substring(0, 2).toUpperCase() || 'ED'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-24">{video.editor_name || 'Éditeur'}</span>
          </div>
          {hasRevisions && (
            <Badge variant="secondary" className="text-[10px] h-5">
              <RotateCcw className="h-3 w-3 mr-1" />
              V{video.revision_count + 1}
            </Badge>
          )}
        </div>

        {/* Preview Button */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-10 gap-2 transition-all",
            hasPreview 
              ? "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary" 
              : "opacity-50"
          )}
          onClick={handlePreview}
        >
          {hasPreview ? (
            <>
              <Play className="h-4 w-4" />
              Voir la vidéo
              <ExternalLink className="h-3 w-3 ml-auto" />
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Aucun lien disponible
            </>
          )}
        </Button>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={onRequestRevision}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Révision
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 bg-success hover:bg-success/90"
            onClick={onValidate}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Valider
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
