import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DeliveryUpload } from './DeliveryUpload';
import { DeliveryVersionList } from './DeliveryVersionList';
import { AskQuestionSection } from './AskQuestionSection';
import { ClientConversationSection } from './ClientConversationSection';
import { 
  Clock, 
  User, 
  Folder,
  Calendar,
  AlertTriangle,
  Play,
  Square,
  Building2,
  UserPlus,
  CheckCircle2,
  Eye,
  FileText,
  MessageSquare,
  ImageIcon,
  PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { WorkflowTask } from '@/types/workflow';

interface TaskWorkflowPanelProps {
  task: WorkflowTask | null;
  videoId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart?: (taskId: string) => void;
  onFinish?: (taskId: string) => void;
  currentUserId?: string;
  allowedDuration?: number;
  revisionCount?: number;
  clientColors?: { primary?: string; secondary?: string; accent?: string } | null;
  // Project-level info from task
  videoCount?: number | null;
  copywriterId?: string | null;
  clientUserId?: string | null;
  editorInstructions?: string | null;
}

const statusConfig = {
  new: { label: 'Nouveau', color: 'bg-slate-500/10 text-slate-500 border-slate-500/30' },
  active: { label: 'Active', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  late: { label: 'En retard', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  review_admin: { label: 'Review Admin', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  review_client: { label: 'Chez le client', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  revision_requested: { label: 'Révision', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  cancelled: { label: 'Annulé', color: 'bg-muted text-muted-foreground border-border' },
};

const clientTypeConfig = {
  b2b: { label: 'B2B', color: 'bg-sky-500/10 text-sky-600 border-sky-500/30', icon: Building2 },
  b2c: { label: 'B2C', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: UserPlus },
  international: { label: 'International', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30', icon: Building2 },
};

// Format countdown time (shows negative when late)
function formatCountdownTime(secondsRemaining: number): string {
  const isNegative = secondsRemaining < 0;
  const absSeconds = Math.abs(secondsRemaining);
  const hrs = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  
  const prefix = isNegative ? '-' : '';
  
  return `${prefix}${hrs}h ${mins.toString().padStart(2, '0')}min ${secs.toString().padStart(2, '0')}s`;
}

export function TaskWorkflowPanel({ 
  task, 
  videoId,
  open, 
  onOpenChange, 
  onStart, 
  onFinish, 
  currentUserId,
  allowedDuration = 5 * 60 * 60,
  revisionCount = 0,
  clientColors = null,
  videoCount = null,
  copywriterId = null,
  clientUserId = null,
  editorInstructions = null,
}: TaskWorkflowPanelProps) {
  // Fetch client rushes - show only rushes tagged to current editor or untagged
  const { data: clientRushes = [] } = useQuery({
    queryKey: ['client-rushes', clientUserId, currentUserId],
    queryFn: async () => {
      if (!clientUserId) return [];
      const { data, error } = await supabase
        .from('client_rushes')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter: show rushes that are untagged (no editor_id) or tagged to the current editor
      return (data || []).filter((r: any) => !r.editor_id || r.editor_id === currentUserId);
    },
    enabled: !!clientUserId,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(allowedDuration);
  const [revisionNotes, setRevisionNotes] = useState<string | null>(null);
  const [revisionImages, setRevisionImages] = useState<string[]>([]);
  const [revisionSource, setRevisionSource] = useState<'admin' | 'client'>('admin');
  const [copywriterName, setCopywriterName] = useState<string | null>(null);

  // Fetch copywriter name
  useEffect(() => {
    const fetchCopywriter = async () => {
      if (!copywriterId) {
        setCopywriterName(null);
        return;
      }
      const { data } = await supabase
        .from('team_members')
        .select('full_name, email')
        .eq('user_id', copywriterId)
        .maybeSingle();
      setCopywriterName(data?.full_name || data?.email || null);
    };
    fetchCopywriter();
  }, [copywriterId]);

  const [fetchedClientColors, setFetchedClientColors] = useState<{ primary?: string; secondary?: string; accent?: string } | null>(null);

  // Fetch client colors based on client_name
  useEffect(() => {
    const fetchColors = async () => {
      if (!task?.client_name) {
        setFetchedClientColors(null);
        return;
      }
      const { data } = await supabase
        .from('client_profiles')
        .select('primary_color, secondary_color, accent_color')
        .eq('company_name', task.client_name)
        .maybeSingle();
      if (data) {
        setFetchedClientColors({
          primary: data.primary_color || undefined,
          secondary: data.secondary_color || undefined,
          accent: data.accent_color || undefined,
        });
      } else {
        setFetchedClientColors(null);
      }
    };
    fetchColors();
  }, [task?.client_name]);

  const resolvedColors = clientColors || fetchedClientColors;

  // Countdown timer - starts automatically when active
  useEffect(() => {
    if (task?.started_at && ['in_progress', 'active', 'revision_requested'].includes(task.status)) {
      const calculateRemaining = () => {
        const elapsed = Math.floor((Date.now() - new Date(task.started_at!).getTime()) / 1000);
        return allowedDuration - elapsed;
      };
      
      setSecondsRemaining(calculateRemaining());
      
      const interval = setInterval(() => {
        setSecondsRemaining(calculateRemaining());
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setSecondsRemaining(allowedDuration);
    }
  }, [task?.id, task?.started_at, task?.status, allowedDuration]);

  // Fetch latest revision notes when task is in revision_requested status
  useEffect(() => {
    const fetchRevisionNotes = async () => {
      if (!task || task.status !== 'revision_requested') {
        setRevisionNotes(null);
        setRevisionImages([]);
        setRevisionSource('admin');
        return;
      }

      try {
        if (videoId) {
          // Fetch from video_feedback - check both admin and client feedback
          const { data } = await supabase
            .from('video_feedback')
            .select('revision_notes, revision_images, reviewed_by')
            .eq('video_id', videoId)
            .eq('decision', 'revision_requested')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          setRevisionNotes(data?.revision_notes || null);
          setRevisionImages((data?.revision_images as string[]) || []);
          // If reviewed_by is null or looks like a client name, it's from client
          // Admin reviews typically have user email as reviewed_by
          const isFromClient = !data?.reviewed_by || !data.reviewed_by.includes('@');
          setRevisionSource(isFromClient ? 'client' : 'admin');
        } else {
          // Fetch from client_feedback
          const { data } = await supabase
            .from('client_feedback')
            .select('revision_notes, revision_images, reviewed_by')
            .eq('task_id', task.id)
            .eq('decision', 'revision_requested')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          setRevisionNotes(data?.revision_notes || null);
          setRevisionImages((data?.revision_images as string[]) || []);
          // If reviewed_by is null or looks like a client name, it's from client
          const isFromClient = !data?.reviewed_by || !data.reviewed_by.includes('@');
          setRevisionSource(isFromClient ? 'client' : 'admin');
        }
      } catch (error) {
        console.error('Error fetching revision notes:', error);
      }
    };

    fetchRevisionNotes();
  }, [task?.id, task?.status, videoId]);

  // Start work: NEW → ACTIVE (timer starts automatically)
  const handleStart = useCallback(() => {
    if (task) onStart?.(task.id);
  }, [task, onStart]);

  // Finish: ACTIVE → IN_REVIEW (submit video)
  const handleFinish = useCallback(() => {
    if (task) onFinish?.(task.id);
  }, [task, onFinish]);

  if (!task) return null;

  const status = statusConfig[task.status];
  const clientType = task.client_type ? clientTypeConfig[task.client_type] : null;
  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'completed';
  const isNew = task.status === 'new';
  const isActive = ['active', 'late'].includes(task.status);
  const canUpload = ['active', 'late', 'revision_requested'].includes(task.status);
  const isInReview = task.status === 'review_admin' || task.status === 'review_client' || task.status === 'revision_requested';
  const isCompleted = task.status === 'completed';
  const isRevisionRequested = task.status === 'revision_requested';
  const isCreatedByCurrentUser = task.created_by === currentUserId;
  const isLate = secondsRemaining < 0 || task.status === 'late';
  const isB2C = task.client_type === 'b2c';

  const handleDeliveryCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader className="text-left">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <SheetTitle className="text-lg leading-tight">
                {task.project_name || task.title}
              </SheetTitle>
               <SheetDescription className="mt-1 flex items-center gap-2">
                 <span className="font-medium text-foreground">{task.title}</span>
                 {task.client_name && (
                   <>
                     <span className="text-muted-foreground">•</span>
                     <span className="flex items-center gap-1">
                       <User className="h-3.5 w-3.5" />
                       {task.client_name}
                     </span>
                   </>
                 )}
               </SheetDescription>
               {/* Client Visual Identity Colors */}
               {resolvedColors && (
                 <div className="flex items-center gap-2 mt-2">
                   <span className="text-xs text-muted-foreground">Identité :</span>
                   {[resolvedColors.primary, resolvedColors.secondary, resolvedColors.accent]
                     .filter(Boolean)
                     .map((color, i) => (
                       <div 
                         key={i} 
                         className="h-4 w-4 rounded-full border border-border" 
                         style={{ backgroundColor: color }}
                       />
                     ))}
                 </div>
               )}
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              <Badge 
                variant="outline" 
                className={cn('shrink-0', status.color)}
              >
                {status.label}
              </Badge>
              {clientType && (
                <Badge 
                  variant="outline" 
                  className={cn('shrink-0 text-xs', clientType.color)}
                >
                  {clientType.label}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Source indicator */}
        {isCreatedByCurrentUser && (
          <div className="mb-4 p-2 bg-emerald-500/10 rounded-lg text-sm flex items-center gap-2 text-emerald-600">
            <UserPlus className="h-4 w-4" />
            <span className="font-medium">Ma tâche</span>
            {isB2C && <span className="text-xs text-emerald-500">(B2C)</span>}
          </div>
        )}

        {/* Status Flow Visual */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">Workflow</p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn(
              'px-2 py-1 rounded font-medium',
              isNew ? 'bg-slate-500/20 text-slate-600' : 'bg-slate-500/10 text-slate-400'
            )}>Nouveau</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn(
              'px-2 py-1 rounded font-medium',
              isActive ? 'bg-primary/20 text-primary' : 'bg-slate-500/10 text-slate-400'
            )}>Active</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn(
              'px-2 py-1 rounded font-medium',
              isInReview ? 'bg-purple-500/20 text-purple-600' : 'bg-slate-500/10 text-slate-400'
            )}>
              {isRevisionRequested && revisionCount > 0 
                ? `Révision ${revisionCount}` 
                : 'In Review'}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={cn(
              'px-2 py-1 rounded font-medium',
              isCompleted ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-500/10 text-slate-400'
            )}>Completed</span>
          </div>
        </div>

        {/* NEW Task - Start Work Section */}
        {isNew && (
          <div className="mb-4 p-5 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Play className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">Prêt à commencer ?</p>
                <p className="text-sm text-muted-foreground">
                  ⚠️ Le timer de {Math.floor(allowedDuration / 3600)}h démarrera automatiquement
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Ne commencez que si vous êtes prêt à terminer dans le temps imparti
                </p>
              </div>
              <Button onClick={handleStart} size="lg" className="w-full gap-2 text-base">
                <Play className="h-5 w-5" />
                Commencer le travail
              </Button>
            </div>
          </div>
        )}

        {/* Countdown Timer Section - Automatic, no pause/stop */}
        {!isNew && !isCompleted && (
          <div className={cn(
            'rounded-xl p-4 mb-4',
            isActive && !isLate && 'bg-primary/10 border-2 border-primary/30',
            isActive && isLate && 'bg-destructive/10 border-2 border-destructive/30',
            !isActive && 'bg-muted/50 border border-border'
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'relative h-12 w-12 rounded-full flex items-center justify-center',
                  isActive && !isLate && 'bg-primary/20',
                  isActive && isLate && 'bg-destructive/20',
                  !isActive && 'bg-muted'
                )}>
                  {isLate ? (
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  ) : (
                    <Clock className={cn(
                      'h-6 w-6',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  )}
                  {isActive && (
                    <span className={cn(
                      'absolute top-0 right-0 h-3 w-3 rounded-full animate-pulse',
                      isLate ? 'bg-destructive' : 'bg-primary'
                    )} />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {isLate ? 'En retard depuis' : 'Temps restant'}
                  </p>
                  <p className={cn(
                    'font-mono text-2xl font-black tracking-tight',
                    isActive && !isLate && 'text-primary',
                    isActive && isLate && 'text-destructive',
                    !isActive && 'text-foreground'
                  )}>
                    {formatCountdownTime(secondsRemaining)}
                  </p>
                </div>
              </div>

              {/* Late warning */}
              {isLate && (
                <Badge variant="destructive" className="animate-pulse">
                  LATE
                </Badge>
              )}
            </div>

            {/* Finish button - Only when active, submits for review */}
            {isActive && (
              <Button 
                onClick={handleFinish} 
                className="w-full mt-4 gap-2"
              >
                <Square className="h-4 w-4" />
                Terminer et soumettre pour revue
              </Button>
            )}
          </div>
        )}

        {/* Task details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {task.project_name && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Projet:</span>
              <span className="font-medium truncate">{task.project_name}</span>
            </div>
          )}

          {task.deadline && (
            <div className={cn(
              'flex items-center gap-2 text-sm col-span-2',
              isOverdue && 'text-destructive'
            )}>
              <Calendar className="h-4 w-4" />
              <span className={isOverdue ? 'text-destructive' : 'text-muted-foreground'}>
                {isOverdue ? 'En retard:' : 'Deadline:'}
              </span>
              <span className="font-medium">
                {format(parseISO(task.deadline), 'd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          )}
        </div>

        {/* Project Info Section - Dynamic from DB */}
        <div className="mb-4 p-4 bg-muted/30 border border-border rounded-lg space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Informations du projet
          </h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {videoCount && videoCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Vidéos :</span>
                <span className="font-semibold">{videoCount}</span>
              </div>
            )}
            
            {copywriterName && (
              <div className="flex items-center gap-2 col-span-2">
                <PenTool className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Copywriter :</span>
                <span className="font-medium">{copywriterName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions - from task-level editorInstructions or video description */}
        {(() => {
          // Use task-level fields first, fallback to parsing description for legacy data
          const resolvedInstructions = editorInstructions || (() => {
            if (!task.description) return '';
            let text = task.description
              .replace(/\n*📁\s*Fichiers?\s*source\s*:?\s*https?:\/\/[^\s]+\n*/gi, '')
              .trim();
            if (/^https?:\/\/[^\s]+$/i.test(text)) return '';
            return text;
          })();

          return (resolvedInstructions || clientRushes.length > 0) ? (
            <div className="mb-4 space-y-3">
              {resolvedInstructions && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <p className="text-sm font-semibold text-amber-600">⚠️ Instructions importantes</p>
                    <Eye className="h-4 w-4 text-amber-500 ml-auto" />
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 p-3 rounded border-l-4 border-amber-500">
                    <p className="text-sm whitespace-pre-wrap">{resolvedInstructions}</p>
                  </div>
                  <p className="text-xs text-amber-600/70 mt-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Lisez attentivement avant de commencer
                  </p>
                </div>
              )}
              
              {clientRushes.length > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="h-4 w-4 text-orange-500" />
                    <p className="text-sm font-semibold text-orange-600">🎬 Rushs du client ({clientRushes.length})</p>
                  </div>
                  <div className="space-y-1.5">
                    {clientRushes.map((rush: any) => (
                      <a
                        key={rush.id}
                        href={rush.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{rush.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">↗</span>
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fichiers bruts du client — cliquez pour ouvrir
                  </p>
                </div>
              )}
            </div>
          ) : null;
        })()}

        <Separator className="my-4" />

        {/* Workflow Steps */}
        <div className="space-y-4">
          {/* Step 1: Upload (only if work started) */}
          {canUpload && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                Uploader la vidéo
              </h3>
              <p className="text-xs text-muted-foreground ml-7">
                Uploadez un fichier ou ajoutez un lien (Google Drive, Frame.io...)
              </p>
              <DeliveryUpload 
                taskId={task.id}
                videoId={videoId}
                onDeliveryCreated={handleDeliveryCreated}
              />
            </div>
          )}

          {/* Step 2: Versions & Submit for review (only if work started) */}
          {!isNew && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                Versions & Validation client
              </h3>
              <p className="text-xs text-muted-foreground ml-7">
                Cliquez sur "Envoyer" pour générer un lien de revue client
              </p>
              <DeliveryVersionList 
                key={`versions-${refreshKey}`}
                taskId={task.id}
                videoId={videoId}
              />
            </div>
          )}

          {/* Status messages */}
          {isCompleted && (
            <div className="text-center py-4 text-emerald-500 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
              <p className="text-lg font-bold">✓ Tâche terminée et validée</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
