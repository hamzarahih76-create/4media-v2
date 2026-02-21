import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Video,
  Play,
  Clock,
  CheckCircle2,
  RotateCcw,
  Star,
  TrendingUp,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorPerformance } from '@/types/video';

interface VideoItem {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assigned_to: string | null;
  is_validated: boolean;
  task_id?: string;
}

interface EditorDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: EditorPerformance | null;
  editorVideos: {
    active: number;
    in_revision: number;
    awaiting_client: number;
    validated: number;
    late: number;
  } | null;
  videosList?: VideoItem[];
  getClientName?: (taskId: string) => string;
}

const rankColors: Record<string, string> = {
  bronze: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  silver: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  platinum: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  diamond: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
};

const statusConfig = {
  active: { label: 'Actif', color: 'bg-success/20 text-success', icon: CheckCircle2 },
  warning: { label: 'Attention', color: 'bg-warning/20 text-warning', icon: AlertTriangle },
  at_risk: { label: 'À risque', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
};

type CategoryKey = 'active' | 'in_revision' | 'awaiting_client' | 'validated_month' | 'late' | 'total_validated';

function filterVideosByCategory(videos: VideoItem[], category: CategoryKey): VideoItem[] {
  switch (category) {
    case 'active':
      return videos.filter(v => ['new', 'active'].includes(v.status));
    case 'in_revision':
      return videos.filter(v => v.status === 'revision_requested');
    case 'awaiting_client':
      return videos.filter(v => v.status === 'review_client');
    case 'validated_month':
      return videos.filter(v => {
        if (v.status !== 'completed' && !v.is_validated) return false;
        // This month only - approximate
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // No completed_at on this type, so show all validated as approximation
        return true;
      });
    case 'late':
      return videos.filter(v =>
        v.status === 'late' || (v.deadline && new Date() > new Date(v.deadline) && !v.is_validated)
      );
    case 'total_validated':
      return videos.filter(v => v.status === 'completed' || v.is_validated);
    default:
      return [];
  }
}

function VideoListPanel({ 
  videos, 
  getClientName 
}: { 
  videos: VideoItem[]; 
  getClientName?: (taskId: string) => string;
}) {
  if (videos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">Aucune vidéo</p>
    );
  }
  return (
    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
      {videos.map(v => (
        <div key={v.id} className="flex items-center justify-between px-3 py-1.5 rounded bg-background/80 text-xs border border-border/40">
          <span className="font-medium truncate flex-1">{v.title}</span>
          {v.task_id && getClientName && (
            <Badge variant="outline" className="ml-2 text-[10px] shrink-0">
              {getClientName(v.task_id)}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

export function EditorDetailDialog({ 
  open, 
  onOpenChange, 
  editor,
  editorVideos,
  videosList = [],
  getClientName,
}: EditorDetailDialogProps) {
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);

  if (!editor) return null;

  const StatusIcon = statusConfig[editor.status].icon;

  const toggleCategory = (cat: CategoryKey) => {
    setExpandedCategory(prev => prev === cat ? null : cat);
  };

  const categories: { key: CategoryKey; label: string; count: number; icon: any; cardClass: string; textClass: string }[] = [
    { key: 'active', label: 'Actives', count: editorVideos?.active || 0, icon: Play, cardClass: 'bg-primary/5 border-primary/20', textClass: 'text-primary' },
    { key: 'in_revision', label: 'En révision', count: editorVideos?.in_revision || 0, icon: RotateCcw, cardClass: 'bg-warning/5 border-warning/20', textClass: 'text-warning' },
    { key: 'awaiting_client', label: 'Attente client', count: editorVideos?.awaiting_client || 0, icon: Clock, cardClass: 'bg-blue-500/5 border-blue-500/20', textClass: 'text-blue-500' },
    { key: 'validated_month', label: 'Validées (mois)', count: editor.videos_this_month, icon: CheckCircle2, cardClass: 'bg-success/5 border-success/20', textClass: 'text-success' },
    { key: 'late', label: 'En retard', count: editorVideos?.late || 0, icon: AlertTriangle, cardClass: 'bg-destructive/5 border-destructive/20', textClass: 'text-destructive' },
    { key: 'total_validated', label: 'Total validées', count: editor.validated_videos, icon: Zap, cardClass: 'bg-muted/50 border-border', textClass: 'text-muted-foreground' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setExpandedCategory(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {editor.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{editor.name}</span>
                <Badge className={cn('capitalize text-xs', rankColors[editor.rank])}>
                  {editor.rank}
                </Badge>
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                Niveau {editor.level} • {editor.xp.toLocaleString()} XP
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status banner */}
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-lg border',
            statusConfig[editor.status].color,
            'border-current/20'
          )}>
            <StatusIcon className="h-5 w-5" />
            <div>
              <p className="font-medium">Statut: {statusConfig[editor.status].label}</p>
              <p className="text-sm opacity-80">
                {editor.status === 'active' && 'Excellente performance globale'}
                {editor.status === 'warning' && 'Quelques retards récents à surveiller'}
                {editor.status === 'at_risk' && 'Performance en dessous des attentes'}
              </p>
            </div>
          </div>

          {/* Video breakdown - clickable cards */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Répartition des vidéos
              <span className="text-xs font-normal">(cliquez pour voir le détail)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => {
                const isExpanded = expandedCategory === cat.key;
                const Icon = cat.icon;
                const filteredVideos = filterVideosByCategory(videosList, cat.key);
                return (
                  <div key={cat.key}>
                    <Card
                      className={cn(
                        cat.cardClass,
                        'cursor-pointer transition-all hover:ring-2 hover:ring-primary/30',
                        isExpanded && 'ring-2 ring-primary/40'
                      )}
                      onClick={() => toggleCategory(cat.key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className={cn('flex items-center gap-2 mb-1', cat.textClass)}>
                            <Icon className="h-4 w-4" />
                            <span className="text-xs font-medium">{cat.label}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">{cat.count}</p>
                      </CardContent>
                    </Card>
                    {isExpanded && (
                      <VideoListPanel videos={filteredVideos} getClientName={getClientName} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance metrics */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Métriques de performance
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Ponctualité</span>
                  <span className={cn(
                    'text-lg font-bold',
                    editor.on_time_rate >= 90 ? 'text-success' :
                    editor.on_time_rate >= 75 ? 'text-warning' :
                    'text-destructive'
                  )}>
                    {editor.on_time_rate}%
                  </span>
                </div>
                <Progress 
                  value={editor.on_time_rate} 
                  className={cn(
                    'h-2',
                    editor.on_time_rate >= 90 && '[&>div]:bg-success',
                    editor.on_time_rate >= 75 && editor.on_time_rate < 90 && '[&>div]:bg-warning',
                    editor.on_time_rate < 75 && '[&>div]:bg-destructive'
                  )}
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Qualité moyenne</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-warning fill-warning" />
                    <span className="text-lg font-bold">{editor.avg_quality.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/5</span>
                  </div>
                </div>
                <Progress 
                  value={(editor.avg_quality / 5) * 100} 
                  className="h-2 [&>div]:bg-warning"
                />
              </div>
            </div>
          </div>

          {/* Additional stats */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{editor.streak}</p>
              <p className="text-xs text-muted-foreground">Jours de streak</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{editor.late_videos}</p>
              <p className="text-xs text-muted-foreground">Retards (total)</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{editor.active_videos}</p>
              <p className="text-xs text-muted-foreground">Charge actuelle</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
