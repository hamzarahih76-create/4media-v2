import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Video, Users, TrendingUp, Package, DollarSign } from 'lucide-react';
import type { ClientFinancial, TeamMemberFinancial } from '@/hooks/useFinanceData';

interface Props {
  clientName: string | null;
  clientFinancials: ClientFinancial[];
  teamMembers: TeamMemberFinancial[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientProductionDetailModal({ clientName, clientFinancials, teamMembers, open, onOpenChange }: Props) {
  if (!clientName) return null;

  // Find matching client financial data
  const clientData = clientFinancials.find(c => c.companyName === clientName);

  // Find all editors/designers who worked on this client
  const editorsOnClient = teamMembers
    .filter(m => m.role === 'editor')
    .map(m => {
      const detail = m.details.find(d => d.clientName === clientName);
      if (!detail || detail.count === 0) return null;
      return { name: m.fullName, count: detail.count, rate: m.ratePerVideo, earned: detail.earned };
    })
    .filter(Boolean) as { name: string; count: number; rate: number; earned: number }[];

  const designersOnClient = teamMembers
    .filter(m => m.role === 'designer')
    .map(m => {
      const detail = m.details.find(d => d.clientName === clientName);
      if (!detail || detail.count === 0) return null;
      return { name: m.fullName, count: detail.count, earned: detail.earned };
    })
    .filter(Boolean) as { name: string; count: number; earned: number }[];

  const videosExpected = clientData?.costBreakdown.videosExpected ?? 0;
  const videosDelivered = clientData?.costBreakdown.videoCount ?? editorsOnClient.reduce((s, e) => s + e.count, 0);
  const videosRemaining = Math.max(0, videosExpected - videosDelivered);

  const totalPaidEditors = editorsOnClient.reduce((s, e) => s + e.earned, 0);
  const totalPaidDesigners = designersOnClient.reduce((s, d) => s + d.earned, 0);
  const totalProductionCost = clientData?.costBreakdown.totalCost ?? (totalPaidEditors + totalPaidDesigners);
  const clientRevenue = clientData?.monthlyPrice ?? 0;
  const netProfit = clientRevenue - totalProductionCost;
  const margin = clientRevenue > 0 ? Math.round((netProfit / clientRevenue) * 100) : 0;

  const marginColor = margin >= 50 ? 'text-success' : margin >= 20 ? 'text-warning' : 'text-destructive';
  const marginBg = margin >= 50 ? 'bg-success/10' : margin >= 20 ? 'bg-warning/10' : 'bg-destructive/10';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 📊 Résumé du client */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Résumé vidéos
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-center">
                <p className="text-2xl font-bold">{videosExpected}</p>
                <p className="text-[11px] text-muted-foreground">Prévues / mois</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 text-center">
                <p className="text-2xl font-bold text-success">{videosDelivered}</p>
                <p className="text-[11px] text-muted-foreground">Livrées</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold">{videosRemaining}</p>
                <p className="text-[11px] text-muted-foreground">Restantes</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 👨‍💻 Détail par éditeur */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Détail par éditeur
            </h4>
            {editorsOnClient.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun éditeur n'a travaillé sur ce client</p>
            ) : (
              <div className="space-y-2">
                {editorsOnClient.map((e) => (
                  <div key={e.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.count} vidéo{e.count > 1 ? 's' : ''} × {e.rate.toLocaleString('fr-FR')} DH
                      </p>
                    </div>
                    <p className="text-sm font-bold text-success">{e.earned.toLocaleString('fr-FR')} DH</p>
                  </div>
                ))}
              </div>
            )}

            {designersOnClient.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Designers</p>
                {designersOnClient.map((d) => (
                  <div key={d.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.count} design{d.count > 1 ? 's' : ''}</p>
                    </div>
                    <p className="text-sm font-bold text-success">{d.earned.toLocaleString('fr-FR')} DH</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* 💰 Résumé financier */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Résumé financier
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-[11px] text-muted-foreground">Payé aux éditeurs</p>
                <p className="font-bold">{totalPaidEditors.toLocaleString('fr-FR')} DH</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-[11px] text-muted-foreground">Coût production total</p>
                <p className="font-bold">{totalProductionCost.toLocaleString('fr-FR')} DH</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <p className="text-[11px] text-muted-foreground">CA mensuel client</p>
                </div>
                <p className="font-bold">{clientRevenue.toLocaleString('fr-FR')} DH</p>
              </div>
              <div className={`p-3 rounded-xl ${marginBg}`}>
                <p className="text-[11px] text-muted-foreground">Profit net</p>
                <p className={`font-bold ${marginColor}`}>
                  {netProfit.toLocaleString('fr-FR')} DH
                  <Badge variant="outline" className={`ml-2 text-[10px] ${marginColor}`}>
                    {margin}%
                  </Badge>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
