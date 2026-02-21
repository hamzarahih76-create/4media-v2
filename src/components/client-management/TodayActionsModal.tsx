import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, CheckCircle2, ExternalLink, FileText, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionItem {
  id: string;
  type: 'video' | 'design' | 'script' | 'publish';
  label: string;
  client: string;
  clientUserId: string;
}

interface TodayActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingValidationItems: ActionItem[];
  unvalidatedScriptItems: ActionItem[];
  readyToPublishItems: ActionItem[];
  onNavigateToClient: (clientUserId: string) => void;
}

const typeConfig = {
  video: { badge: 'Validation vidéo', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  design: { badge: 'Validation design', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300' },
  script: { badge: 'Script à valider', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300' },
  publish: { badge: 'Prêt à publier', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
};

export function TodayActionsModal({
  open, onOpenChange,
  pendingValidationItems, unvalidatedScriptItems, readyToPublishItems,
  onNavigateToClient,
}: TodayActionsModalProps) {
  const allItems = [
    ...pendingValidationItems.map(i => ({ ...i, category: 'validation' as const, description: 'Le client doit valider cette livraison. Relancez ou vérifiez le statut.' })),
    ...unvalidatedScriptItems.map(i => ({ ...i, category: 'script' as const, description: 'Le script attend validation avant de passer au montage.' })),
    ...readyToPublishItems.map(i => ({ ...i, category: 'publish' as const, description: 'Contenu validé et prêt à être publié sur les réseaux.' })),
  ];

  const total = allItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            ⚡ À traiter aujourd'hui
          </DialogTitle>
          <DialogDescription>
            {total} action{total !== 1 ? 's' : ''} nécessitant votre attention immédiate
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-4">
          {/* Pending validations */}
          {pendingValidationItems.length > 0 && (
            <Section
              icon={<Clock className="h-4 w-4" />}
              title={`${pendingValidationItems.length} validation${pendingValidationItems.length > 1 ? 's' : ''} client en attente`}
              color="text-amber-600"
            >
              {pendingValidationItems.map(item => (
                <ActionRow
                  key={item.id}
                  item={item}
                  description="Le client doit valider cette livraison. Relancez ou vérifiez le statut."
                  onNavigate={() => { onNavigateToClient(item.clientUserId); onOpenChange(false); }}
                />
              ))}
            </Section>
          )}

          {/* Unvalidated scripts */}
          {unvalidatedScriptItems.length > 0 && (
            <Section
              icon={<FileText className="h-4 w-4" />}
              title={`${unvalidatedScriptItems.length} script${unvalidatedScriptItems.length > 1 ? 's' : ''} non validé${unvalidatedScriptItems.length > 1 ? 's' : ''}`}
              color="text-blue-600"
            >
              {unvalidatedScriptItems.map(item => (
                <ActionRow
                  key={item.id}
                  item={{ ...item, type: 'script' }}
                  description="Le script attend validation avant de passer au montage."
                  onNavigate={() => { onNavigateToClient(item.clientUserId); onOpenChange(false); }}
                />
              ))}
            </Section>
          )}

          {/* Ready to publish */}
          {readyToPublishItems.length > 0 && (
            <Section
              icon={<CheckCircle2 className="h-4 w-4" />}
              title={`${readyToPublishItems.length} vidéo${readyToPublishItems.length > 1 ? 's' : ''} prête${readyToPublishItems.length > 1 ? 's' : ''} à publier`}
              color="text-emerald-600"
            >
              {readyToPublishItems.map(item => (
                <ActionRow
                  key={item.id}
                  item={{ ...item, type: 'publish' }}
                  description="Contenu validé et prêt à être publié sur les réseaux."
                  onNavigate={() => { onNavigateToClient(item.clientUserId); onOpenChange(false); }}
                />
              ))}
            </Section>
          )}

          {total === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
              <p className="font-medium">Tout est à jour !</p>
              <p className="text-sm">Aucune action en attente pour aujourd'hui.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className={cn("flex items-center gap-2 text-sm font-semibold", color)}>
        {icon} {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ActionRow({ item, description, onNavigate }: { item: ActionItem; description: string; onNavigate: () => void }) {
  const config = typeConfig[item.type];
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm truncate">{item.label}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", config.color)}>
            {config.badge}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">Client : <span className="font-medium text-foreground">{item.client}</span></p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={onNavigate}>
        <ExternalLink className="h-3 w-3" />
        Voir
      </Button>
    </div>
  );
}
