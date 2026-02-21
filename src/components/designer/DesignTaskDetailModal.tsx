import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditDesignTaskModal } from './EditDesignTaskModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DesignDeliveryUpload } from './DesignDeliveryUpload';
import { useDesignDeliveries } from '@/hooks/useDesignerTasks';
import { 
  Palette, 
  Calendar, 
  Clock, 
  Building2,
  FileText,
  Play,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Upload,
  ExternalLink,
  FileImage,
  Link2,
  History,
  Copy,
  Check,
  Trash2,
  Pencil
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import { useDeleteDesignTask } from '@/hooks/useDesignerTasks';
 
 // Get the base URL for review links
 const getBaseUrl = () => {
   if (typeof window !== 'undefined') {
     return window.location.origin;
   }
   return '';
 };

interface DesignTask {
  id: string;
  title: string;
  description?: string | null;
  client_name?: string | null;
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

interface DesignTaskDetailModalProps {
  task: DesignTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart?: (taskId: string) => void;
  onDeliverySuccess?: () => void;
  onDeleteSuccess?: () => void;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<any>; 
  gradient: string;
  color: string;
}> = {
  new: { 
    label: 'Nouveau', 
    icon: Sparkles, 
    gradient: 'from-blue-500 to-cyan-500',
    color: 'text-blue-500'
  },
  active: { 
    label: 'En cours', 
    icon: Play, 
    gradient: 'from-amber-500 to-orange-500',
    color: 'text-amber-500'
  },
  in_review: { 
    label: 'En validation', 
    icon: Clock, 
    gradient: 'from-purple-500 to-pink-500',
    color: 'text-purple-500'
  },
  revision_requested: { 
    label: 'Révision demandée', 
    icon: RefreshCw, 
    gradient: 'from-orange-500 to-red-500',
    color: 'text-orange-500'
  },
  completed: { 
    label: 'Terminé', 
    icon: CheckCircle, 
    gradient: 'from-emerald-500 to-teal-500',
    color: 'text-emerald-500'
  },
  late: { 
    label: 'En retard', 
    icon: AlertCircle, 
    gradient: 'from-red-500 to-rose-500',
    color: 'text-red-500'
  },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Moyenne', color: 'bg-blue-500/20 text-blue-600' },
  high: { label: 'Haute', color: 'bg-orange-500/20 text-orange-600' },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-600' },
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

export function DesignTaskDetailModal({ 
  task, 
  open, 
  onOpenChange, 
  onStart,
  onDeliverySuccess,
  onDeleteSuccess
}: DesignTaskDetailModalProps) {
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: deliveries = [], isLoading: deliveriesLoading } = useDesignDeliveries(task?.id);
  const { deleteTask, isDeleting } = useDeleteDesignTask();

  const designItems = useMemo(() => parseDesignItems(task?.description), [task?.description]);

  const groupedDesignItems = useMemo(() => {
    const groups: { type: string; items: typeof designItems }[] = [];
    let currentType = '';
    for (const item of designItems) {
      if (item.type !== currentType) {
        currentType = item.type;
        groups.push({ type: item.type, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [designItems]);

  if (!task) return null;

  const config = statusConfig[task.status] || statusConfig.new;
  const StatusIcon = config.icon;
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.medium;

  const progress = task.design_count && task.design_count > 0
    ? Math.round(((task.designs_completed || 0) / task.design_count) * 100)
    : 0;

  const canDeliver = task.status === 'active' || task.status === 'revision_requested';

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await deleteTask(task.id);
      toast.success('🗑️ Projet supprimé avec succès');
      onOpenChange(false);
      onDeleteSuccess?.();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleDeliverySuccess = () => {
    setShowDeliveryForm(false);
    onDeliverySuccess?.();
    onOpenChange(false);
  };

  const getLinkTypeIcon = (linkType: string | null) => {
    switch (linkType) {
      case 'figma': return '🎨';
      case 'drive': return '📁';
      case 'dropbox': return '📦';
      default: return '🔗';
    }
  };

  const handleCopyLink = async (delivery: typeof deliveries[0]) => {
    try {
      // Check if there's an existing active review link for this task
      const { data: existingLink } = await supabase
        .from('design_review_links')
        .select('token')
        .eq('design_task_id', task!.id)
        .eq('delivery_id', delivery.id)
        .eq('is_active', true)
        .maybeSingle();
 
      let reviewToken = existingLink?.token;
 
      // If no active link, create one
      if (!reviewToken) {
        const { data: newLink, error } = await supabase
          .from('design_review_links')
          .insert({
            design_task_id: task!.id,
            delivery_id: delivery.id,
            is_active: true,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
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
      toast.success('Lien de revue copié ! Le client pourra voir et valider le design.');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Erreur lors de la copie du lien');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50">
        {/* Header with gradient */}
        <div className={cn(
          "relative p-6 bg-gradient-to-r text-white",
          config.gradient
        )}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                <DialogTitle className="text-2xl font-bold text-white">
                  {task.title}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meta info grid */}
          <div className="grid grid-cols-2 gap-4">
            {task.client_name && (
              <motion.div 
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{task.client_name}</p>
                </div>
              </motion.div>
            )}

            {task.project_name && (
              <motion.div 
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Palette className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projet</p>
                  <p className="font-medium">{task.project_name}</p>
                </div>
              </motion.div>
            )}

            {task.deadline && (
              <motion.div 
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Calendar className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="font-medium">
                    {format(new Date(task.deadline), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </motion.div>
            )}

            <motion.div 
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="font-medium">
                  {format(new Date(task.created_at), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Priority */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-sm text-muted-foreground">Priorité:</span>
            <Badge className={priorityInfo.color}>
              {priorityInfo.label}
            </Badge>
          </motion.div>

          {/* Description */}
          {task.description && (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Description
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed p-4 rounded-xl bg-muted/30 border border-border/50">
                {task.description}
              </p>
            </motion.div>
          )}

          {/* Progress if applicable */}
          {task.design_count && task.design_count > 0 && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">{task.designs_completed || 0}/{task.design_count} designs</span>
              </div>
              {/* Detailed breakdown from description */}
              {(() => {
                const match = task.description?.match(/^\[(.+?)\]/);
                if (!match) return null;
                const parts = match[1].split('+').map(s => s.trim());
                return (
                  <div className="flex flex-wrap gap-2">
                    {parts.map((part, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-medium">
                        {part}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  className={cn("h-full bg-gradient-to-r", config.gradient)}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* Design Items Table - Flat layout like PM */}
          {designItems.length > 0 && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
            >
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                  Designs du projet
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {designItems.length} designs
                </Badge>
              </div>
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/50">
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-10">#</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Design</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-28">Statut</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-28">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designItems.map((item) => (
                      <tr key={item.index} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground">{item.index}</td>
                        <td className="py-2.5 px-3 font-medium">{item.label}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              task.status === 'completed' ? 'bg-emerald-500' :
                              task.status === 'active' ? 'bg-amber-500' :
                              task.status === 'in_review' ? 'bg-purple-500' :
                              task.status === 'revision_requested' ? 'bg-orange-500' :
                              'bg-blue-500'
                            )} />
                            <span className="text-xs">{config.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {task.deadline 
                            ? format(new Date(task.deadline), 'dd/MM/yyyy', { locale: fr })
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Deliveries History */}
          {deliveries.length > 0 && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <h4 className="font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Livraisons ({deliveries.length})
              </h4>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {deliveries.map((delivery, index) => (
                    <motion.div
                      key={delivery.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          delivery.delivery_type === 'file' ? "bg-blue-500/10" : "bg-purple-500/10"
                        )}>
                          {delivery.delivery_type === 'file' ? (
                            <FileImage className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Link2 className="h-4 w-4 text-purple-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Version {delivery.version_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(delivery.submitted_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(delivery)}
                          className="gap-1.5"
                          title="Copier le lien pour le client"
                        >
                          {copiedId === delivery.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        {delivery.delivery_type === 'link' && delivery.external_link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(delivery.external_link!, '_blank')}
                            className="gap-1.5"
                          >
                            <span>{getLinkTypeIcon(delivery.link_type)}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {delivery.delivery_type === 'file' ? 'Fichier' : 'Lien'}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}

          <Separator />

          {/* Delivery Form */}
          <AnimatePresence mode="wait">
            {showDeliveryForm && canDeliver ? (
              <DesignDeliveryUpload
                key="delivery-form"
                taskId={task.id}
                taskDescription={task.description}
                onSuccess={handleDeliverySuccess}
                onCancel={() => setShowDeliveryForm(false)}
              />
            ) : (
              <motion.div 
                key="actions"
                className="flex justify-end gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le projet "{task.title}" et toutes ses livraisons seront définitivement supprimés.
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
                
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                {task.status === 'new' && onStart && (
                  <Button 
                    onClick={() => {
                      onStart(task.id);
                      onOpenChange(false);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/25"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Démarrer le projet
                  </Button>
                )}
                {canDeliver && (
                  <Button 
                    onClick={() => setShowDeliveryForm(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/25"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Livrer le design
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>

      <EditDesignTaskModal
        task={task}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={() => {
          onDeliverySuccess?.();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
