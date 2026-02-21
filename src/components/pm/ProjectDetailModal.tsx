import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  User,
  Video,
  FileText,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    title: string;
    client_name: string | null;
    deadline: string | null;
    description: string | null;
    video_count: number;
    videos_completed: number;
    videos_late: number;
    videos_in_review: number;
    videos_active: number;
    editors: { id: string; name: string; videos_assigned: number; videos_completed: number }[];
  } | null;
  clientProfile: {
    subscription_type: string | null;
    videos_per_month: number | null;
    monthly_price: number | null;
    total_contract: number | null;
    advance_received: number | null;
    workflow_status: string | null;
    project_end_date: string | null;
    contact_name: string | null;
    company_name: string | null;
    notes: string | null;
  } | null;
  taskData: {
    editor_instructions: string | null;
    source_files_link: string | null;
    status: string;
    priority: string;
  } | null;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-muted text-muted-foreground' },
  active: { label: 'En cours', color: 'bg-warning/20 text-warning' },
  in_progress: { label: 'En cours', color: 'bg-warning/20 text-warning' },
  completed: { label: 'Terminé', color: 'bg-success/20 text-success' },
  cancelled: { label: 'Annulé', color: 'bg-destructive/20 text-destructive' },
};

const packLabels: Record<string, string> = {
  starter: 'Pack Starter',
  pro: 'Pack Pro',
  premium: 'Pack Premium',
  enterprise: 'Pack Enterprise',
  custom: 'Pack Personnalisé',
};

export function ProjectDetailModal({ open, onOpenChange, project, clientProfile, taskData }: ProjectDetailModalProps) {
  if (!project) return null;

  const progressPct = project.video_count > 0
    ? Math.round((project.videos_completed / project.video_count) * 100)
    : 0;

  const isOverdue = project.deadline && isPast(parseISO(project.deadline)) && project.videos_completed < project.video_count;

  const packName = clientProfile?.subscription_type
    ? packLabels[clientProfile.subscription_type] || clientProfile.subscription_type
    : 'Non défini';

  // Payment status
  const totalContract = clientProfile?.total_contract || 0;
  const advanceReceived = clientProfile?.advance_received || 0;
  const remaining = totalContract - advanceReceived;
  const paymentPct = totalContract > 0 ? Math.round((advanceReceived / totalContract) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{project.title}</DialogTitle>
          {project.client_name && (
            <p className="text-sm text-muted-foreground">{project.client_name}</p>
          )}
        </DialogHeader>

        <div className="space-y-5">
          {/* Status & Pack */}
          <div className="flex flex-wrap gap-2">
            {taskData && (
              <Badge variant="outline" className={statusLabels[taskData.status]?.color || 'bg-muted text-muted-foreground'}>
                {statusLabels[taskData.status]?.label || taskData.status}
              </Badge>
            )}
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              <Package className="h-3 w-3 mr-1" />
              {packName}
            </Badge>
            {taskData?.priority === 'high' && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                Priorité haute
              </Badge>
            )}
          </div>

          <Separator />

          {/* Videos Progress */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Video className="h-4 w-4 text-primary" />
              Progression des vidéos
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Complétées</span>
                <span className="font-semibold">{project.videos_completed} / {project.video_count}</span>
              </div>
              <Progress
                value={progressPct}
                className={cn(
                  'h-2.5',
                  progressPct === 100 && '[&>div]:bg-success',
                  project.videos_late > 0 && '[&>div]:bg-destructive'
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2 text-center">
                <p className="text-xs text-muted-foreground">Actives</p>
                <p className="text-lg font-bold">{project.videos_active}</p>
              </div>
              <div className="rounded-lg border p-2 text-center border-warning/30">
                <p className="text-xs text-warning">En révision</p>
                <p className="text-lg font-bold">{project.videos_in_review}</p>
              </div>
              <div className="rounded-lg border p-2 text-center border-destructive/30">
                <p className="text-xs text-destructive">En retard</p>
                <p className="text-lg font-bold">{project.videos_late}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deadline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Deadline</span>
            </div>
            <span className={cn('text-sm font-medium', isOverdue && 'text-destructive')}>
              {project.deadline
                ? format(parseISO(project.deadline), 'dd MMMM yyyy', { locale: fr })
                : 'Non définie'}
              {isOverdue && (
                <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-destructive" />
              )}
            </span>
          </div>

          {/* Editors */}
          {project.editors.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" />
                  Éditeur{project.editors.length > 1 ? 's' : ''} assigné{project.editors.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-2">
                  {project.editors.map(editor => (
                    <div key={editor.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {editor.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{editor.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {editor.videos_completed}/{editor.videos_assigned} vidéos
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Instructions */}
          {taskData?.editor_instructions && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  Instructions importantes
                </div>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">
                  {taskData.editor_instructions}
                </p>
              </div>
            </>
          )}

          {/* Payment */}
          {totalContract > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" />
                  État du paiement
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reçu</span>
                    <span className="font-semibold">{advanceReceived.toLocaleString('fr-MA')} MAD / {totalContract.toLocaleString('fr-MA')} MAD</span>
                  </div>
                  <Progress
                    value={paymentPct}
                    className={cn(
                      'h-2',
                      paymentPct >= 100 ? '[&>div]:bg-success' : paymentPct > 0 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                    )}
                  />
                  {remaining > 0 && (
                    <p className="text-xs text-warning flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Reste à payer : {remaining.toLocaleString('fr-MA')} MAD
                    </p>
                  )}
                  {remaining <= 0 && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Paiement complet
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
