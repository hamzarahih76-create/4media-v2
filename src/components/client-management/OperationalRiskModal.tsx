import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CalendarDays, ExternalLink, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskItem {
  id: string;
  type: 'not_started' | 'stale_script' | 'missing_rush';
  label: string;
  client: string;
  clientUserId: string;
}

interface OperationalRiskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notStartedEditorItems: RiskItem[];
  staleScriptItems: RiskItem[];
  missingRushItems: RiskItem[];
  onNavigateToClient: (clientUserId: string) => void;
}

const riskConfig: Record<string, { severity: 'high' | 'medium' | 'low'; icon: React.ReactNode; badgeColor: string; description: string; action: string }> = {
  not_started: {
    severity: 'high',
    icon: <XCircle className="h-4 w-4" />,
    badgeColor: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300',
    description: "L'éditeur assigné n'a pas encore commencé le travail sur ce projet.",
    action: 'Contacter l\'éditeur ou réassigner le projet',
  },
  stale_script: {
    severity: 'medium',
    icon: <AlertTriangle className="h-4 w-4" />,
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300',
    description: 'Le script est en attente depuis plus de 3 jours sans validation.',
    action: 'Relancer le copywriter ou valider le script',
  },
  missing_rush: {
    severity: 'low',
    icon: <CalendarDays className="h-4 w-4" />,
    badgeColor: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300',
    description: 'Ce client a des projets actifs mais aucune date de tournage planifiée.',
    action: 'Planifier une date de tournage avec le client',
  },
};

const severityBadge: Record<string, { label: string; className: string }> = {
  high: { label: '🔴 Élevé', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  medium: { label: '🟠 Moyen', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300' },
  low: { label: '🟡 Faible', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300' },
};

export function OperationalRiskModal({
  open, onOpenChange,
  notStartedEditorItems, staleScriptItems, missingRushItems,
  onNavigateToClient,
}: OperationalRiskModalProps) {
  const total = notStartedEditorItems.length + staleScriptItems.length + missingRushItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            🔥 Risque opérationnel
          </DialogTitle>
          <DialogDescription>
            {total} risque{total !== 1 ? 's' : ''} détecté{total !== 1 ? 's' : ''} nécessitant une intervention
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-4">
          {/* Not started editors - HIGH */}
          {notStartedEditorItems.length > 0 && (
            <RiskSection
              icon={<XCircle className="h-4 w-4" />}
              title={`${notStartedEditorItems.length} éditeur${notStartedEditorItems.length > 1 ? 's' : ''} n'a${notStartedEditorItems.length > 1 ? '/ont' : ''} pas commencé`}
              color="text-red-600"
            >
              {notStartedEditorItems.map(item => (
                <RiskRow
                  key={item.id}
                  item={item}
                  config={riskConfig.not_started}
                  onNavigate={() => { onNavigateToClient(item.clientUserId); onOpenChange(false); }}
                />
              ))}
            </RiskSection>
          )}

          {/* Stale scripts - MEDIUM */}
          {staleScriptItems.length > 0 && (
            <RiskSection
              icon={<Clock className="h-4 w-4" />}
              title={`${staleScriptItems.length} script${staleScriptItems.length > 1 ? 's' : ''} bloqué${staleScriptItems.length > 1 ? 's' : ''} (+3 jours)`}
              color="text-orange-600"
            >
              {staleScriptItems.map(item => (
                <RiskRow
                  key={item.id}
                  item={item}
                  config={riskConfig.stale_script}
                  onNavigate={() => { onNavigateToClient(item.clientUserId); onOpenChange(false); }}
                />
              ))}
            </RiskSection>
          )}

          {/* Missing rushes - LOW */}
          {missingRushItems.length > 0 && (
            <RiskSection
              icon={<CalendarDays className="h-4 w-4" />}
              title={`${missingRushItems.length} client${missingRushItems.length > 1 ? 's' : ''} sans date de tournage`}
              color="text-yellow-600"
            >
              {missingRushItems.map(item => (
                <RiskRow
                  key={item.id}
                  item={item}
                  config={riskConfig.missing_rush}
                  onNavigate={() => { onNavigateToClient(item.clientUserId); onOpenChange(false); }}
                />
              ))}
            </RiskSection>
          )}

          {total === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
              <p className="font-medium">Aucun risque détecté !</p>
              <p className="text-sm">Tous les projets sont sur les rails.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RiskSection({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className={cn("flex items-center gap-2 text-sm font-semibold", color)}>
        {icon} {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RiskRow({ item, config, onNavigate }: { item: RiskItem; config: typeof riskConfig[string]; onNavigate: () => void }) {
  const sev = severityBadge[config.severity];
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm truncate">{item.label}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", sev.className)}>
            {sev.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">Client : <span className="font-medium text-foreground">{item.client || item.label}</span></p>
        <p className="text-xs text-muted-foreground mb-1">{config.description}</p>
        <p className="text-xs font-medium text-primary">💡 {config.action}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={onNavigate}>
        <ExternalLink className="h-3 w-3" />
        Voir
      </Button>
    </div>
  );
}
