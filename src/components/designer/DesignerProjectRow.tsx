import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Palette,
  Play,
  Upload,
  Pencil,
  Trash2,
  History,
  ExternalLink,
  FileImage,
  Link2,
  Copy,
  Check,
  Timer,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO, differenceInSeconds } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDesignDeliveries, useDeleteDesignTask } from '@/hooks/useDesignerTasks';
import { DesignDeliveryUpload } from './DesignDeliveryUpload';
import { EditDesignTaskModal } from './EditDesignTaskModal';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

function parseDesignItems(description: string | null | undefined): { type: string; label: string; index: number }[] {
  if (!description) return [];
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return [];
  const entries = match[1].split('+').map(s => s.trim());
  const typeOrder = ['Miniature', 'Post', 'Carrousel'];
  const grouped: Record<string, number> = {};

  for (const entry of entries) {
    const carouselMatch = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
    if (carouselMatch) {
      grouped['Carrousel'] = (grouped['Carrousel'] || 0) + parseInt(carouselMatch[1]);
      continue;
    }
    const simpleMatch = entry.match(/(\d+)x\s*(Post|Miniature)/i);
    if (simpleMatch) {
      const type = simpleMatch[2].charAt(0).toUpperCase() + simpleMatch[2].slice(1).toLowerCase();
      grouped[type] = (grouped[type] || 0) + parseInt(simpleMatch[1]);
    }
  }

  const items: { type: string; label: string; index: number }[] = [];
  let globalIndex = 0;
  for (const type of typeOrder) {
    const count = grouped[type] || 0;
    for (let i = 0; i < count; i++) {
      globalIndex++;
      items.push({ type, label: `${type} ${i + 1}`, index: globalIndex });
    }
  }
  return items;
}

function calculatePriceFromDescription(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return null;
  const entries = match[1].split('+').map(s => s.trim());
  let total = 0;
  for (const entry of entries) {
    const carouselMatch = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
    if (carouselMatch) {
      const count = parseInt(carouselMatch[1]);
      const pages = parseInt(carouselMatch[2]);
      total += (pages / 2) * 40 * count;
    } else {
      const simpleMatch = entry.match(/(\d+)x\s*(Post|Miniature)/i);
      if (simpleMatch) {
        total += parseInt(simpleMatch[1]) * 40;
      }
    }
  }
  return total > 0 ? total : null;
}



function useCountdownTimer(deadline: string | null | undefined) {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const isOverdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);

  let text = '';
  if (days > 0) text += `${days}j `;
  text += `${hours}h ${mins.toString().padStart(2, '0')}min`;

  return { text: isOverdue ? `-${text}` : text, isOverdue };
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  new: { label: 'Nouveau', dot: 'bg-blue-500' },
  active: { label: 'En cours', dot: 'bg-amber-500' },
  in_review: { label: 'En validation', dot: 'bg-purple-500' },
  revision_requested: { label: 'Révision', dot: 'bg-orange-500' },
  completed: { label: 'Terminé', dot: 'bg-emerald-500' },
  late: { label: 'En retard', dot: 'bg-destructive' },
};

interface DesignTask {
  id: string;
  title: string;
  description?: string | null;
  client_name?: string | null;
  client_user_id?: string | null;
  project_name?: string | null;
  deadline?: string | null;
  status: string;
  priority: string;
  reward_level?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  design_count?: number | null;
  designs_completed?: number | null;
}

interface DesignerProjectRowProps {
  task: DesignTask;
  onStart?: (taskId: string) => void;
  onDeliverySuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function DesignerProjectRow({ task, onStart, onDeliverySuccess, onDeleteSuccess }: DesignerProjectRowProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryItemIndex, setDeliveryItemIndex] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatItemLabel, setChatItemLabel] = useState<string | null>(null);
  const [itemFeedback, setItemFeedback] = useState<any[]>([]);
  const [unreadChatItems, setUnreadChatItems] = useState<Set<string>>(new Set());
  const [isCopyingProjectLink, setIsCopyingProjectLink] = useState(false);
  const [projectLinkCopied, setProjectLinkCopied] = useState(false);

  const { data: deliveries = [] } = useDesignDeliveries(isOpen ? task.id : undefined);
  const { deleteTask, isDeleting } = useDeleteDesignTask();

  // Fetch client avatar
  const { data: clientAvatar } = useQuery({
    queryKey: ['client-avatar', task.client_user_id],
    queryFn: async () => {
      if (!task.client_user_id) return null;
      const { data } = await supabase
        .from('client_profiles')
        .select('avatar_url, logo_url, contact_name, company_name')
        .eq('user_id', task.client_user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!task.client_user_id,
    staleTime: 5 * 60 * 1000,
  });

  const designItems = useMemo(() => parseDesignItems(task.description), [task.description]);
  const totalItems = task.design_count || designItems.length;
  const completed = task.designs_completed || 0;
  const progressPercentage = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
  const price = calculatePriceFromDescription(task.description);

  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && task.status !== 'completed';
  const countdown = useCountdownTimer(task.deadline);

  const config = statusConfig[task.status] || statusConfig.new;
  const canDeliver = task.status === 'active' || task.status === 'revision_requested' || task.status === 'in_review';

  // Track which items have already been delivered
  const deliveredItemLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const d of deliveries) {
      if (d.notes) {
        const match = d.notes.match(/\[(.+?)\]/);
        if (match) labels.add(match[1]);
      }
    }
    return labels;
  }, [deliveries]);

  // Track which items have a revision request (client asked for changes)
  const [revisionItemLabels, setRevisionItemLabels] = useState<Set<string>>(new Set());
  const [approvedItemLabels, setApprovedItemLabels] = useState<Set<string>>(new Set());

  const [feedbackVersion, setFeedbackVersion] = useState(0);

  useEffect(() => {
    const checkRevisions = async () => {
      // Fetch deliveries and feedback directly to avoid dependency on isOpen
      const { data: allDeliveries } = await supabase
        .from('design_deliveries')
        .select('id, notes, submitted_at')
        .eq('design_task_id', task.id);

      const { data: allFeedback } = await supabase
        .from('design_feedback')
        .select('delivery_id, decision')
        .eq('design_task_id', task.id);

      if (!allDeliveries || allDeliveries.length === 0) {
        setRevisionItemLabels(new Set());
        setApprovedItemLabels(new Set());
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

      const revLabels = new Set<string>();
      const appLabels = new Set<string>();
      for (const [label, latestDelivery] of latestByLabel) {
        const decision = feedbackByDelivery.get(latestDelivery.id);
        if (decision === 'approved') {
          appLabels.add(label);
        } else if (decision === 'revision' || decision === 'revision_requested') {
          revLabels.add(label);
        }
      }
      setRevisionItemLabels(revLabels);
      setApprovedItemLabels(appLabels);
    };
    checkRevisions();
  }, [task.id, feedbackVersion]);

  // Realtime: auto-refresh when client submits feedback
  useEffect(() => {
    const channel = supabase
      .channel(`design-realtime-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_feedback',
          filter: `design_task_id=eq.${task.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['design-deliveries', task.id] });
          queryClient.invalidateQueries({ queryKey: ['designer-tasks'] });
          setFeedbackVersion(v => v + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_deliveries',
          filter: `design_task_id=eq.${task.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['design-deliveries', task.id] });
          queryClient.invalidateQueries({ queryKey: ['designer-tasks'] });
          setFeedbackVersion(v => v + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id, queryClient]);

  // Check for unread client feedback per item
  useEffect(() => {
    if (!isOpen || deliveries.length === 0) return;
    const checkUnread = async () => {
      const { data: allFeedback } = await supabase
        .from('design_feedback')
        .select('delivery_id')
        .eq('design_task_id', task.id);
      
      if (!allFeedback || allFeedback.length === 0) return;
      
      const feedbackDeliveryIds = new Set(allFeedback.map(f => f.delivery_id));
      const unread = new Set<string>();
      for (const d of deliveries) {
        if (d.notes && feedbackDeliveryIds.has(d.id)) {
          const match = d.notes.match(/\[(.+?)\]/);
          if (match) unread.add(match[1]);
        }
      }
      setUnreadChatItems(unread);
    };
    checkUnread();
  }, [isOpen, deliveries, task.id]);

  const handleDeleteTask = async () => {
    try {
      await deleteTask(task.id);
      toast.success('🗑️ Projet supprimé');
      onDeleteSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleCopyLink = async (delivery: any) => {
    try {
      const { data: existingLink } = await supabase
        .from('design_review_links')
        .select('token')
        .eq('design_task_id', task.id)
        .eq('delivery_id', delivery.id)
        .eq('is_active', true)
        .maybeSingle();

      let reviewToken = existingLink?.token;
      if (!reviewToken) {
        const { data: newLink, error } = await supabase
          .from('design_review_links')
          .insert({
            design_task_id: task.id,
            delivery_id: delivery.id,
            is_active: true,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('token')
          .single();
        if (error) throw error;
        reviewToken = newLink.token;
      }

      const reviewUrl = `${getBaseUrl()}/design-delivery/${reviewToken}`;
      try {
        await navigator.clipboard.writeText(reviewUrl);
      } catch {
        // Fallback for non-secure contexts (mobile, etc.)
        const textArea = document.createElement('textarea');
        textArea.value = reviewUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(delivery.id);
      toast.success('Lien de revue copié !');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Copy link error:', error);
      toast.error('Erreur lors de la copie du lien');
    }
  };

  const getLinkTypeIcon = (linkType: string | null) => {
    switch (linkType) {
      case 'figma': return '🎨';
      case 'drive': return '📁';
      case 'dropbox': return '📦';
      default: return '🔗';
    }
  };

  const handleCopyProjectLink = async () => {
    setIsCopyingProjectLink(true);
    try {
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

      const url = `${getBaseUrl()}/p/${token}`;
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
      setProjectLinkCopied(true);
      toast.success('Lien du projet copié !', {
        description: 'Partagez ce lien avec le client pour une vue globale.',
      });
      setTimeout(() => setProjectLinkCopied(false), 2000);
    } catch (error) {
      console.error('Copy project link error:', error);
      toast.error('Erreur lors de la copie du lien');
    } finally {
      setIsCopyingProjectLink(false);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg bg-card overflow-hidden">
          {/* Header Row */}
          <CollapsibleTrigger asChild>
            <div className="w-full px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="shrink-0">
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Title & Client */}
                <div className="min-w-0 flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={clientAvatar?.avatar_url || clientAvatar?.logo_url || ''} />
                    <AvatarFallback className="bg-accent/10 text-accent text-xs">
                      {(task.client_name || task.title || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{task.title}</h3>
                    {task.client_name && (
                      <p className="text-sm text-muted-foreground truncate">{task.client_name}</p>
                    )}
                  </div>
                </div>

                {/* Price + Countdown */}
                <div className="flex flex-col items-center gap-0.5">
                  {price !== null && (
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {price} DH
                    </span>
                  )}
                  {countdown && task.status !== 'completed' && (
                    <div className={cn(
                      'flex items-center gap-1.5 text-xs font-mono',
                      countdown.isOverdue ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      <Timer className="h-3 w-3" />
                      {countdown.text}
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
                      progressPercentage === 100 && '[&>div]:bg-emerald-500',
                      isOverdue && '[&>div]:bg-destructive'
                    )}
                  />
                </div>

                {/* Status */}
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="outline" className={cn(
                    task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' :
                    isOverdue ? 'bg-destructive/20 text-destructive border-destructive/30' :
                    'bg-amber-500/20 text-amber-600 border-amber-500/30'
                  )}>
                    {config.label}
                  </Badge>

                  {task.status === 'new' && onStart && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onStart(task.id); }}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Démarrer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Expanded Content */}
          <CollapsibleContent>
            <div className="border-t px-4 py-4 bg-muted/10 space-y-4">
              {/* Design items table */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
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
                <div className="flex items-center gap-2">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline" size="sm"
                          className="gap-1.5"
                          onClick={handleCopyProjectLink}
                          disabled={isCopyingProjectLink}
                        >
                          {isCopyingProjectLink ? <Loader2 className="h-4 w-4 animate-spin" /> :
                           projectLinkCopied ? <Check className="h-4 w-4 text-emerald-500" /> :
                           <Link2 className="h-4 w-4" />}
                          Lien projet
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Copier le lien global du projet pour le client</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {canDeliver && (
                    <Button
                      size="sm"
                      onClick={() => setShowDeliveryForm(!showDeliveryForm)}
                      className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
                    >
                      <Upload className="h-4 w-4" />
                      Livrer
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setShowEditModal(true)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le projet "{task.title}" et toutes ses livraisons seront supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteTask}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                        <TableHead className="w-28">Deadline</TableHead>
                        <TableHead className="w-44 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {designItems.map((item) => (
                        <TableRow key={`item-${item.index}`}>
                          <TableCell className="text-muted-foreground font-medium">
                            {item.index}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-2">
                              {item.type === 'Miniature' && '🖼️'}
                              {item.type === 'Post' && '📱'}
                              {item.type === 'Carrousel' && '🎠'}
                              {item.label}
                            </span>
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
                            {task.deadline ? (
                              <span className={cn('text-sm', isOverdue && 'text-destructive font-medium')}>
                                {format(parseISO(task.deadline), 'dd MMM', { locale: fr })}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  setChatItemLabel(item.label);
                                  // Clear unread badge for this item
                                  setUnreadChatItems(prev => {
                                    const next = new Set(prev);
                                    next.delete(item.label);
                                    return next;
                                  });
                                  const { data } = await supabase
                                    .from('design_feedback')
                                    .select('*')
                                    .eq('design_task_id', task.id)
                                    .order('reviewed_at', { ascending: false });
                                  const itemDeliveryIds = deliveries
                                    .filter(d => d.notes?.includes(`[${item.label}]`))
                                    .map(d => d.id);
                                  const filtered = (data || []).filter(
                                    (f: any) => itemDeliveryIds.includes(f.delivery_id) && (!f.reviewed_by || f.reviewed_by === 'Client')
                                  );
                                  setItemFeedback(filtered);
                                }}
                                className="gap-1 text-xs h-7 text-muted-foreground hover:text-foreground relative"
                              >
                                <MessageCircle className="h-3 w-3" />
                                Chat
                                {unreadChatItems.has(item.label) && (
                                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                                    +1
                                  </span>
                                )}
                              </Button>
                              {deliveredItemLabels.has(item.label) ? (
                                <div className="flex items-center gap-1">
                                  {revisionItemLabels.has(item.label) ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setDeliveryItemIndex(item.index);
                                        setShowDeliveryForm(true);
                                      }}
                                      className="gap-1 text-xs h-7 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      Re-livrer
                                    </Button>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Livré
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      const itemDelivery = deliveries.find(d => d.notes?.includes(`[${item.label}]`));
                                      if (itemDelivery) {
                                        await handleCopyLink(itemDelivery);
                                      } else {
                                        toast.error('Aucune livraison trouvée');
                                      }
                                    }}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : canDeliver ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setDeliveryItemIndex(item.index);
                                    setShowDeliveryForm(true);
                                  }}
                                  className="gap-1 text-xs h-7 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <Upload className="h-3 w-3" />
                                  Livrer
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Delivery Form removed from inline - now in Dialog below */}

            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Delivery Dialog - single item */}
      <Dialog open={showDeliveryForm} onOpenChange={(open) => {
        setShowDeliveryForm(open);
        if (!open) setDeliveryItemIndex(null);
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-500" />
              {deliveryItemIndex !== null
                ? `Livrer : ${designItems.find(d => d.index === deliveryItemIndex)?.label ?? ''}`
                : 'Livrer les designs'}
            </DialogTitle>
          </DialogHeader>
          {showDeliveryForm && canDeliver && (
            <DesignDeliveryUpload
              taskId={task.id}
              taskDescription={task.description}
              specificItemLabel={deliveryItemIndex !== null ? designItems.find(d => d.index === deliveryItemIndex)?.label ?? null : null}
              onSuccess={() => {
                setShowDeliveryForm(false);
                setDeliveryItemIndex(null);
                queryClient.invalidateQueries({ queryKey: ['design-deliveries', task.id] });
                onDeliverySuccess?.();
              }}
              onCancel={() => { setShowDeliveryForm(false); setDeliveryItemIndex(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Client Dialog - per item feedback */}
      <Dialog open={!!chatItemLabel} onOpenChange={(open) => {
        if (!open) { setChatItemLabel(null); setItemFeedback([]); }
      }}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              Chat Client — {chatItemLabel}
            </DialogTitle>
          </DialogHeader>
          {itemFeedback.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Aucun retour client pour {chatItemLabel}
            </div>
          ) : (
            <div className="space-y-3">
              {itemFeedback.map((fb: any) => (
                <div key={fb.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant={fb.decision === 'approved' ? 'default' : 'destructive'} className="text-xs">
                      {fb.decision === 'approved' ? '✅ Approuvé' : fb.decision === 'revision_requested' ? '🔄 Modification' : fb.decision}
                    </Badge>
                    {fb.rating && (
                      <span className="text-xs text-muted-foreground">
                        {'⭐'.repeat(fb.rating)}
                      </span>
                    )}
                  </div>
                  {fb.feedback_text && (
                    <p className="text-sm">{fb.feedback_text}</p>
                  )}
                  {fb.revision_notes && (
                    <p className="text-sm text-muted-foreground italic">{fb.revision_notes}</p>
                  )}
                  {fb.revision_audio_path && (
                    <div className="mt-2">
                      <audio
                        controls
                        className="w-full h-8"
                        src={fb.revision_audio_path.startsWith('http') ? fb.revision_audio_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${fb.revision_audio_path}`}
                      />
                    </div>
                  )}
                  {fb.revision_images && fb.revision_images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-1">
                      {fb.revision_images.map((img: string, i: number) => (
                        <img
                          key={i}
                          src={img.startsWith('http') ? img : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${img}`}
                          alt="Feedback"
                          className="h-16 w-16 object-cover rounded border cursor-pointer"
                          onClick={() => window.open(img.startsWith('http') ? img : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${img}`, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(fb.reviewed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditDesignTaskModal
        task={task}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={() => {
          onDeliverySuccess?.();
        }}
      />
    </>
  );
}
