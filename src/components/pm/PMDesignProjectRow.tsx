import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Clock,
  Trash2,
  Settings,
  Palette,
  MessageCircle,
  Link2,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast, differenceInSeconds } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DesignClientFeedbackDialog } from './DesignClientFeedbackDialog';
// Parse description like "[2x Post + 1x Miniature + 1x Carrousel 4p]" into individual items
function parseDesignItems(description: string | null): { type: string; label: string; index: number }[] {
  if (!description) return [];
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return [];

  const entries = match[1].split('+').map(s => s.trim());
  const items: { type: string; label: string; index: number }[] = [];

  // Priority order: Miniature, Post, Carrousel
  const typeOrder = ['Miniature', 'Post', 'Carrousel'];
  const grouped: Record<string, number> = {};

  for (const entry of entries) {
    const carouselMatch = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
    if (carouselMatch) {
      const count = parseInt(carouselMatch[1]);
      grouped['Carrousel'] = (grouped['Carrousel'] || 0) + count;
      continue;
    }
    const simpleMatch = entry.match(/(\d+)x\s*(Post|Miniature)/i);
    if (simpleMatch) {
      const count = parseInt(simpleMatch[1]);
      const type = simpleMatch[2].charAt(0).toUpperCase() + simpleMatch[2].slice(1).toLowerCase();
      grouped[type] = (grouped[type] || 0) + count;
    }
  }

  let globalIndex = 0;
  for (const type of typeOrder) {
    const count = grouped[type] || 0;
    for (let i = 0; i < count; i++) {
      globalIndex++;
      items.push({
        type,
        label: `${type} ${i + 1}`,
        index: globalIndex,
      });
    }
  }

  return items;
}

// Countdown hook
function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number; hours: number; minutes: number; seconds: number;
    isOverdue: boolean;
  } | null>(null);

  useEffect(() => {
    if (!deadline) { setTimeLeft(null); return; }
    const calc = () => {
      const diff = differenceInSeconds(parseISO(deadline), new Date());
      const isOverdue = diff < 0;
      const abs = Math.abs(diff);
      setTimeLeft({
        days: Math.floor(abs / 86400),
        hours: Math.floor((abs % 86400) / 3600),
        minutes: Math.floor((abs % 3600) / 60),
        seconds: abs % 60,
        isOverdue,
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return timeLeft;
}

function formatCountdown(tl: ReturnType<typeof useCountdown>) {
  if (!tl) return null;
  const { days, hours, minutes, seconds, isOverdue } = tl;
  const p = isOverdue ? '-' : '';
  if (days > 0) return `${p}${days}j ${hours}h ${minutes.toString().padStart(2, '0')}min ${seconds.toString().padStart(2, '0')}s`;
  return `${p}${hours}h ${minutes.toString().padStart(2, '0')}min ${seconds.toString().padStart(2, '0')}s`;
}

const getDesignStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return { label: 'Terminé', dot: 'bg-success' };
    case 'in_review':
      return { label: 'En validation', dot: 'bg-purple-500' };
    case 'revision_requested':
      return { label: 'Révision', dot: 'bg-orange-500' };
    case 'active':
      return { label: 'En cours', dot: 'bg-warning' };
    case 'late':
      return { label: 'En retard', dot: 'bg-destructive' };
    default:
      return { label: 'Nouveau', dot: 'bg-primary' };
  }
};

interface DesignTaskData {
  id: string;
  title: string;
  description: string | null;
  client_name: string | null;
  status: string;
  deadline: string | null;
  assigned_to: string | null;
  design_count: number | null;
  designs_completed: number | null;
  created_at: string;
}

interface PMDesignProjectRowProps {
  task: DesignTaskData;
  getDesignerName: (userId: string | null) => string;
  onDeleteProject?: (taskId: string, title: string) => void;
  onEditProject?: (taskId: string) => void;
}

export function PMDesignProjectRow({
  task,
  getDesignerName,
  onDeleteProject,
  onEditProject,
}: PMDesignProjectRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [approvedItemLabels, setApprovedItemLabels] = useState<Set<string>>(new Set());
  const [revisionItemLabels, setRevisionItemLabels] = useState<Set<string>>(new Set());
  const [deliveredItemLabels, setDeliveredItemLabels] = useState<Set<string>>(new Set());

  // Fetch per-item status from deliveries + feedback
  useEffect(() => {
    const checkItemStatuses = async () => {
      const { data: allDeliveries } = await supabase
        .from('design_deliveries')
        .select('id, notes, submitted_at')
        .eq('design_task_id', task.id)
        .order('submitted_at', { ascending: false });

      const { data: allFeedback } = await supabase
        .from('design_feedback')
        .select('delivery_id, decision')
        .eq('design_task_id', task.id);

      if (!allDeliveries || allDeliveries.length === 0) {
        setApprovedItemLabels(new Set());
        setRevisionItemLabels(new Set());
        setDeliveredItemLabels(new Set());
        return;
      }

      const feedbackByDelivery = new Map<string, string>();
      if (allFeedback) {
        for (const f of allFeedback) {
          feedbackByDelivery.set(f.delivery_id, f.decision);
        }
      }

      // Group deliveries by item label, find latest per label
      const latestByLabel = new Map<string, typeof allDeliveries[0]>();
      for (const d of allDeliveries) {
        if (d.notes) {
          const match = d.notes.match(/\[(.+?)\]/);
          if (match) {
            const existing = latestByLabel.get(match[1]);
            if (!existing || new Date(d.submitted_at) > new Date(existing.submitted_at)) {
              latestByLabel.set(match[1], d);
            }
          }
        }
      }

      const appLabels = new Set<string>();
      const revLabels = new Set<string>();
      const delLabels = new Set<string>();
      for (const [label, latestDelivery] of latestByLabel) {
        delLabels.add(label);
        const decision = feedbackByDelivery.get(latestDelivery.id);
        if (decision === 'approved') {
          appLabels.add(label);
        } else if (decision === 'revision' || decision === 'revision_requested') {
          revLabels.add(label);
        }
      }
      setApprovedItemLabels(appLabels);
      setRevisionItemLabels(revLabels);
      setDeliveredItemLabels(delLabels);
    };
    checkItemStatuses();
  }, [task.id]);

  const handleCopyProjectLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopyingLink(true);
    try {
      // Check for existing active link
      const { data: existingLink } = await supabase
        .from('design_project_review_links')
        .select('token')
        .eq('design_task_id', task.id)
        .eq('is_active', true)
        .maybeSingle();

      let token = existingLink?.token;
      if (!token) {
        const { data: newLink, error } = await supabase
          .from('design_project_review_links')
          .insert({
            design_task_id: task.id,
            is_active: true,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('token')
          .single();
        if (error) throw error;
        token = newLink.token;
      }

      const url = `${window.location.origin}/p/${token}`;
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
        description: 'Partagez ce lien avec le client pour une vue globale du projet.',
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Copy link error:', error);
      toast.error('Erreur lors de la copie du lien');
    } finally {
      setIsCopyingLink(false);
    }
  };

  const designItems = useMemo(() => parseDesignItems(task.description), [task.description]);
  const totalItems = task.design_count || designItems.length;
  const completed = task.designs_completed || 0;
  const progressPercentage = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'completed';
  const countdown = useCountdown(task.deadline);
  const countdownText = formatCountdown(countdown);

  const projectStatus = (() => {
    if (task.status === 'completed') return { label: 'Terminé', color: 'bg-success/20 text-success border-success/30' };
    if (isOverdue) return { label: 'En retard', color: 'bg-destructive/20 text-destructive border-destructive/30' };
    return { label: 'En cours', color: 'bg-warning/20 text-warning border-warning/30' };
  })();

  const statusConfig = getDesignStatusConfig(task.status);
  const designerName = getDesignerName(task.assigned_to);


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="w-full px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="shrink-0">
              {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {/* Title & Client */}
              <div className="md:col-span-2 min-w-0">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-emerald-500 shrink-0" />
                  <h3 className="font-semibold truncate">{task.title}</h3>
                </div>
                {task.client_name && (
                  <p className="text-sm text-muted-foreground truncate ml-6">{task.client_name}</p>
                )}
              </div>

              {/* Deadline + Countdown */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={cn(isOverdue && 'text-destructive font-medium')}>
                    {task.deadline
                      ? format(parseISO(task.deadline), 'dd MMM yyyy', { locale: fr })
                      : 'Non défini'}
                  </span>
                </div>
                {countdownText && task.status !== 'completed' && (
                  <div className={cn(
                    'flex items-center gap-1.5 text-xs font-mono tabular-nums',
                    countdown?.isOverdue ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>⏳ {countdownText}</span>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium tabular-nums">{completed}/{totalItems}</span>
                </div>
                <Progress
                  value={progressPercentage}
                  className={cn(
                    'h-2',
                    progressPercentage === 100 && '[&>div]:bg-success',
                    isOverdue && '[&>div]:bg-destructive'
                  )}
                />
              </div>

              {/* Status + Actions */}
              <div className="flex items-center justify-end gap-2">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                        onClick={handleCopyProjectLink}
                        disabled={isCopyingLink}
                      >
                        {isCopyingLink ? <Loader2 className="h-4 w-4 animate-spin" /> :
                         linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> :
                         <Link2 className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copier le lien projet (client)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant="outline" className={projectStatus.color}>
                  {projectStatus.label}
                </Badge>
                {onEditProject && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); onEditProject(task.id); }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Modifier</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {onDeleteProject && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); onDeleteProject(task.id, task.title); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Supprimer</p></TooltipContent>
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
                  Designs du projet
                </h4>
                {designItems.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {designItems.length} design{designItems.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {designItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun design détecté dans la description du projet
              </p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Design</TableHead>
                      <TableHead className="w-28">Statut</TableHead>
                      <TableHead className="w-36">Designer</TableHead>
                      <TableHead className="w-28">Deadline</TableHead>
                      <TableHead className="w-16 text-center">Chat Admin</TableHead>
                      <TableHead className="w-16 text-center">Chat Client</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {designItems.map((item) => (
                      <TableRow key={`item-${item.index}`} className="group">
                        <TableCell className="text-muted-foreground font-medium">
                          {item.index}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.label}
                        </TableCell>
                        <TableCell>
                          {approvedItemLabels.has(item.label) ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-sm text-emerald-600 font-medium">Validé ✅</span>
                            </div>
                          ) : deliveredItemLabels.has(item.label) ? (
                            revisionItemLabels.has(item.label) ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-orange-500" />
                                <span className="text-sm text-orange-600 font-medium">Modification client</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-sm text-blue-600 font-medium">Livré au client</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-amber-500" />
                              <span className="text-sm">En attente</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {designerName !== 'Non assigné' ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs">
                                  {designerName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{designerName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Non assigné</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.deadline ? (
                            <div className="flex items-center gap-1">
                              <span className={cn('text-sm', isOverdue && 'text-destructive font-medium')}>
                                {format(parseISO(task.deadline), 'dd MMM', { locale: fr })}
                              </span>
                              {isOverdue && <span className="text-destructive">🔴</span>}
                              {task.status === 'completed' && <span className="text-success">✅</span>}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {/* Chat Admin */}
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        {/* Chat Client */}
                        <TableCell className="text-center">
                          <DesignClientFeedbackDialog
                            designTaskId={task.id}
                            designTitle={`${task.title} - ${item.label}`}
                            clientName={task.client_name || undefined}
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider delayDuration={0}>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Voir le design</p></TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
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
