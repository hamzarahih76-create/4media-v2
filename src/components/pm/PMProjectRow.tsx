import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Eye,
  Plus,
  Pencil,
  Send,
  Clock,
  Trash2,
  Settings,
  MessageCircle,
  Filter,
  Link2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast, differenceInSeconds } from 'date-fns';
import { VideoConversationDialog } from './VideoConversationDialog';
import { ClientFeedbackDialog } from './ClientFeedbackDialog';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Hook for countdown timer
function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    totalSeconds: number;
  } | null>(null);

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const deadlineDate = parseISO(deadline);
      const diff = differenceInSeconds(deadlineDate, now);
      const isOverdue = diff < 0;
      const absDiff = Math.abs(diff);

      const days = Math.floor(absDiff / (60 * 60 * 24));
      const hours = Math.floor((absDiff % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((absDiff % (60 * 60)) / 60);
      const seconds = absDiff % 60;

      setTimeLeft({ days, hours, minutes, seconds, isOverdue, totalSeconds: diff });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return timeLeft;
}

function formatCountdown(timeLeft: ReturnType<typeof useCountdown>) {
  if (!timeLeft) return null;
  
  const { days, hours, minutes, seconds, isOverdue } = timeLeft;
  const prefix = isOverdue ? '-' : '';
  
  if (days > 0) {
    return `${prefix}${days}j ${hours}h ${minutes.toString().padStart(2, '0')}min ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${prefix}${hours}h ${minutes.toString().padStart(2, '0')}min ${seconds.toString().padStart(2, '0')}s`;
}

interface VideoData {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assigned_to: string | null;
  is_validated: boolean;
}

interface EditorInfo {
  id: string;
  name: string;
}

interface PMProjectRowProps {
  id: string;
  title: string;
  client_name: string | null;
  client_avatar?: string | null;
  deadline: string | null;
  description?: string | null;
  video_count: number;
  videos_completed: number;
  videos_late: number;
  videos_in_review: number;
  videos_active: number;
  videos: VideoData[];
  editors: EditorInfo[];
  getEditorName?: (userId: string | null) => string;
  videoMessageCounts?: Record<string, number>;
  onViewDetails?: (taskId: string) => void;
  onAddVideo?: (taskId: string) => void;
  onViewVideo?: (video: VideoData) => void;
  onRequestRevision?: (video: VideoData) => void;
  onSendToClient?: (video: VideoData) => void;
  onDeleteProject?: (taskId: string, title: string) => void;
  onEditProject?: (projectId: string) => void;
  onProjectClick?: (projectId: string) => void;
}

type ProjectStatus = 'completed' | 'late' | 'in_progress';

const getVideoStatusConfig = (video: VideoData) => {
  const isLate = video.deadline && isPast(parseISO(video.deadline)) && !video.is_validated;
  
  // Terminé
  if (video.is_validated || video.status === 'completed') {
    return { label: 'Terminé', color: 'bg-success text-success-foreground', dot: 'bg-success' };
  }
  // En retard
  if (isLate || video.status === 'late') {
    return { label: 'En retard', color: 'bg-destructive text-destructive-foreground', dot: 'bg-destructive' };
  }
  // Révision client
  if (video.status === 'review_client') {
    return { label: 'Révision client', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' };
  }
  // Révision demandée par Admin (l'éditeur doit corriger)
  if (video.status === 'revision_requested') {
    return { label: 'Révision demandée', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' };
  }
  // Attente de révision Admin (éditeur a soumis)
  if (video.status === 'in_review' || video.status === 'review_admin') {
    return { label: 'Attente révision Admin', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
  }
  // Active
  if (video.status === 'in_progress' || video.status === 'active') {
    return { label: 'Active', color: 'bg-warning/80 text-warning-foreground', dot: 'bg-warning' };
  }
  // Nouveau
  return { label: 'Nouveau', color: 'bg-muted text-muted-foreground', dot: 'bg-primary' };
};

const getProjectStatus = (props: PMProjectRowProps): { status: ProjectStatus; label: string; color: string } => {
  const { video_count, videos_completed, videos_late } = props;
  
  if (videos_completed === video_count && video_count > 0) {
    return { status: 'completed', label: 'Terminé', color: 'bg-success/20 text-success border-success/30' };
  }
  if (videos_late > 0) {
    return { status: 'late', label: 'En retard', color: 'bg-destructive/20 text-destructive border-destructive/30' };
  }
  return { status: 'in_progress', label: 'En cours', color: 'bg-warning/20 text-warning border-warning/30' };
};

export function PMProjectRow(props: PMProjectRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [videoStatusFilter, setVideoStatusFilter] = useState<string>('all');
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const {
    id,
    title,
    client_name,
    deadline,
    video_count,
    videos_completed,
    videos,
    editors,
    getEditorName,
    videoMessageCounts,
    onViewDetails,
    onAddVideo,
    onViewVideo,
    onRequestRevision,
    onSendToClient,
    onDeleteProject,
    onEditProject,
    onProjectClick,
  } = props;

  const progressPercentage = video_count > 0 
    ? Math.round((videos_completed / video_count) * 100) 
    : 0;

  const projectStatus = getProjectStatus(props);
  const isOverdue = deadline && isPast(parseISO(deadline)) && videos_completed < video_count;
  
  // Countdown timer
  const countdown = useCountdown(deadline);
  const countdownText = formatCountdown(countdown);

  // Create editor lookup map
  const editorMap = new Map(editors.map(e => [e.id, e.name]));

  const handleCopyProjectLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopyingLink(true);
    try {
      // Check for existing active link
      const { data: existingLink } = await supabase
        .from('video_project_review_links')
        .select('token')
        .eq('task_id', id)
        .eq('is_active', true)
        .maybeSingle();

      let token = existingLink?.token;
      if (!token) {
        const { data: newLink, error } = await supabase
          .from('video_project_review_links')
          .insert({
            task_id: id,
            is_active: true,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('token')
          .single();
        if (error) throw error;
        token = newLink.token;
      }

      const url = `${window.location.origin}/v/${token}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setLinkCopied(true);
      toast.success('Lien du projet copié !', {
        description: 'Partagez ce lien avec le client pour voir toutes les vidéos.',
      });
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      console.error('Error generating project link:', error);
      toast.error('Erreur lors de la génération du lien');
    } finally {
      setIsCopyingLink(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Collapsed Header */}
        <CollapsibleTrigger asChild>
          <div className="w-full px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors">
            {/* Expand Icon */}
            <div className="shrink-0">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Project Info */}
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {/* Title & Client */}
              <div className="md:col-span-2 min-w-0 flex items-center gap-3">
                {/* Client Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  {props.client_avatar && <AvatarImage src={props.client_avatar} alt={client_name || ''} />}
                  <AvatarFallback className="text-xs bg-muted">
                    {(client_name || 'P').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 
                    className="font-semibold truncate hover:text-primary cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onProjectClick?.(id);
                    }}
                  >
                    {title}
                  </h3>
                  {client_name && (
                    <p className="text-sm text-muted-foreground truncate">{client_name}</p>
                  )}
                </div>
              </div>

              {/* Deadline + Countdown */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={cn(
                    isOverdue && 'text-destructive font-medium'
                  )}>
                    {deadline 
                      ? format(parseISO(deadline), 'dd MMM yyyy', { locale: fr })
                      : 'Non défini'
                    }
                  </span>
                </div>
                {countdownText && videos_completed < video_count && (
                  <div className={cn(
                    'flex items-center gap-1.5 text-xs font-mono tabular-nums',
                    countdown?.isOverdue ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>⏳ {countdownText}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium tabular-nums">
                    {videos_completed}/{video_count}
                  </span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className={cn(
                    'h-2',
                    progressPercentage === 100 && '[&>div]:bg-success',
                    props.videos_late > 0 && '[&>div]:bg-destructive'
                  )}
                />
              </div>

              {/* Status Badge + Link + Edit + Delete */}
              <div className="flex items-center justify-end gap-2">
                <Badge variant="outline" className={projectStatus.color}>
                  {projectStatus.label}
                </Badge>
                {/* Copy project link */}
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                        onClick={handleCopyProjectLink}
                        disabled={isCopyingLink}
                      >
                        {isCopyingLink ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : linkCopied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{linkCopied ? 'Lien copié !' : 'Copier le lien client du projet'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {onEditProject && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject(id);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Modifier le projet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onDeleteProject && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(id, title);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Supprimer le projet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="border-t px-4 py-4 bg-muted/10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Vidéos du projet
                </h4>
                {/* Status Filter */}
                <Select value={videoStatusFilter} onValueChange={setVideoStatusFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="review_admin">Attente révision</SelectItem>
                    <SelectItem value="review_client">Révision client</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                {onAddVideo && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onAddVideo(id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                )}
                {onViewDetails && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewDetails(id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </Button>
                )}
              </div>
            </div>

            {videos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune vidéo dans ce projet
              </p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Vidéo</TableHead>
                      <TableHead className="w-28">Statut</TableHead>
                      <TableHead className="w-36">Éditeur</TableHead>
                      <TableHead className="w-28">Deadline</TableHead>
                      <TableHead className="w-16 text-center">Chat Admin</TableHead>
                      <TableHead className="w-16 text-center">Chat Client</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos
                      .filter((video) => {
                        if (videoStatusFilter === 'all') return true;
                        if (videoStatusFilter === 'new') return video.status === 'new';
                        if (videoStatusFilter === 'review_admin') return video.status === 'in_review' || video.status === 'review_admin';
                        if (videoStatusFilter === 'review_client') return video.status === 'review_client';
                        if (videoStatusFilter === 'completed') return video.is_validated || video.status === 'completed';
                        return true;
                      })
                      .sort((a, b) => {
                        // Natural sort: extract numbers from titles for proper ordering (1, 2, 10 instead of 1, 10, 2)
                        const numA = parseInt(a.title.match(/\d+/)?.[0] || '0', 10);
                        const numB = parseInt(b.title.match(/\d+/)?.[0] || '0', 10);
                        if (numA !== numB) return numA - numB;
                        return a.title.localeCompare(b.title);
                      })
                      .map((video, index) => {
                      const statusConfig = getVideoStatusConfig(video);
                      const videoIsLate = video.deadline && isPast(parseISO(video.deadline)) && !video.is_validated;
                      const editorName = getEditorName 
                        ? getEditorName(video.assigned_to)
                        : (video.assigned_to ? editorMap.get(video.assigned_to) || `Éditeur ${video.assigned_to.substring(0, 6)}` : null);

                      return (
                        <TableRow key={video.id} className="group">
                          <TableCell className="text-muted-foreground font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {video.title}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn('h-2 w-2 rounded-full', statusConfig.dot)} />
                              <span className="text-sm">{statusConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {editorName ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {editorName.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{editorName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Non assigné</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {video.deadline ? (
                              <div className="flex items-center gap-1">
                                <span className={cn(
                                  'text-sm',
                                  videoIsLate && 'text-destructive font-medium'
                                )}>
                                  {format(parseISO(video.deadline), 'dd MMM', { locale: fr })}
                                </span>
                                {videoIsLate && (
                                  <span className="text-destructive">🔴</span>
                                )}
                                {video.is_validated && (
                                  <span className="text-success">✅</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {/* Chat Admin column */}
                          <TableCell className="text-center">
                            <VideoConversationDialog
                              videoId={video.id}
                              videoTitle={video.title}
                              editorName={editorName || undefined}
                              initialMessageCount={videoMessageCounts?.[video.id] || 0}
                            />
                          </TableCell>
                          {/* Chat Client column */}
                          <TableCell className="text-center">
                            <ClientFeedbackDialog
                              videoId={video.id}
                              taskId={id}
                              videoTitle={video.title}
                              clientName={client_name || undefined}
                            />
                          </TableCell>
                          <TableCell>
                            <TooltipProvider delayDuration={0}>
                              <div className="flex items-center justify-end gap-1">
                                {/* View Video */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => onViewVideo?.(video)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Voir la vidéo</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
