import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Palette, Users, TrendingUp, Package } from 'lucide-react';
import type { ClientFinancial, TeamMemberFinancial } from '@/hooks/useFinanceData';

interface Props {
  clientName: string | null;
  clientFinancials: ClientFinancial[];
  teamMembers: TeamMemberFinancial[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DesignProductionDetailModal({ clientName, clientFinancials, teamMembers, open, onOpenChange }: Props) {
  if (!clientName) return null;

  const clientData = clientFinancials.find(c => c.companyName === clientName);

  // Find all designers who worked on this client
  const designersOnClient = teamMembers
    .filter(m => m.role === 'designer')
    .map(m => {
      const detail = m.details.find(d => d.clientName === clientName);
      if (!detail || detail.count === 0) return null;
      return { name: m.fullName, count: detail.count, earned: detail.earned };
    })
    .filter(Boolean) as { name: string; count: number; earned: number }[];

  // Design expected from client pack
  const expected = clientData?.costBreakdown.designsExpected;
  const totalDesignsExpected = expected
    ? expected.miniatures + expected.posts + expected.logos + expected.carousels
    : 0;

  const designsValidated = clientData?.costBreakdown.designCount ?? designersOnClient.reduce((s, d) => s + d.count, 0);
  const designsRemaining = Math.max(0, totalDesignsExpected - designsValidated);
  const progressPct = totalDesignsExpected > 0 ? Math.round((designsValidated / totalDesignsExpected) * 100) : 0;

  const totalDesignCost = clientData?.costBreakdown.designCost ?? designersOnClient.reduce((s, d) => s + d.earned, 0);

  // Design types breakdown
  const designTypes = clientData?.costBreakdown.designTypes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-emerald-600" />
            {clientName} — Design
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 📦 Pack Design prévu */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Pack Design prévu
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                <p className="text-2xl font-bold">{totalDesignsExpected}</p>
                <p className="text-[11px] text-muted-foreground">Prévus / mois</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 text-center">
                <p className="text-2xl font-bold text-success">{designsValidated}</p>
                <p className="text-[11px] text-muted-foreground">Validés</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold">{designsRemaining}</p>
                <p className="text-[11px] text-muted-foreground">Restants</p>
              </div>
            </div>

            {/* Detail by type */}
            {expected && totalDesignsExpected > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {expected.posts > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {designTypes?.posts ?? 0}/{expected.posts} Posts
                  </Badge>
                )}
                {expected.miniatures > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {designTypes?.miniatures ?? 0}/{expected.miniatures} Miniatures
                  </Badge>
                )}
                {expected.logos > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {designTypes?.logos ?? 0}/{expected.logos} Logos
                  </Badge>
                )}
                {expected.carousels > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {designTypes?.carousels ?? 0}/{expected.carousels} Carrousels
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 📈 Progression */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold">Progression</span>
              <span className="text-xs font-bold text-emerald-600">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
          </div>

          <Separator />

          {/* 👤 Détail par designer */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Designers sur ce client
            </h4>
            {designersOnClient.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun designer n'a travaillé sur ce client</p>
            ) : (
              <div className="space-y-2">
                {designersOnClient.map((d) => (
                  <div key={d.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.count} design{d.count > 1 ? 's' : ''} validé{d.count > 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-success">{d.earned.toLocaleString('fr-FR')} DH</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* 💰 Coût total design */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Résumé financier design
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <p className="text-[11px] text-muted-foreground">Coût total design</p>
                <p className="font-bold">{totalDesignCost.toLocaleString('fr-FR')} DH</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-[11px] text-muted-foreground">Designs validés</p>
                <p className="font-bold">{designsValidated} / {totalDesignsExpected}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
