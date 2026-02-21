import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Building2, Eye, Plus, Video, Palette, PenTool, Image, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import type { ClientFinancial } from '@/hooks/useFinanceData';
import { AddPaymentModal } from './AddPaymentModal';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface Expense {
  id: string;
  category: string;
  label: string;
  amount: number;
  notes: string | null;
  month: string;
  expense_type?: string;
}

interface ClientFinanceTableProps {
  clients: ClientFinancial[];
  expenses: Expense[];
  onPaymentAdded: () => void;
}

const statusConfig = {
  on_track: { label: 'done', className: 'bg-success/15 text-success border-success/30' },
  late: { label: 'En retard', className: 'bg-warning/15 text-warning border-warning/30' },
  critical: { label: 'Critique', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export function ClientFinanceTable({ clients, expenses, onPaymentAdded }: ClientFinanceTableProps) {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientFinancial | null>(null);
  const [addPaymentClient, setAddPaymentClient] = useState<ClientFinancial | null>(null);

  const filtered = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Calculate total charges (ADS + daily + fixed expenses)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const activeClientCount = clients.length;
  const chargesSharePerClient = activeClientCount > 0 ? Math.round(totalExpenses / activeClientCount) : 0;

  const totalContract = clients.reduce((s, c) => s + c.totalContract, 0);
  const totalPaid = clients.reduce((s, c) => s + c.totalPaid, 0);
  const totalCosts = clients.reduce((s, c) => s + c.costBreakdown.totalCost, 0);
  const totalChargesShare = chargesSharePerClient * activeClientCount;
  const totalProfit = clients.reduce((s, c) => s + (c.totalPaid - c.costBreakdown.totalCost - chargesSharePerClient), 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Suivi financier clients</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{clients.length} clients</p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Pack</TableHead>
                  <TableHead className="text-right">Contrat</TableHead>
                  <TableHead className="text-right">Encaissé</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1"><Video className="h-3.5 w-3.5" /> Vidéos</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1"><Image className="h-3.5 w-3.5" /> Designs</div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1"><PenTool className="h-3.5 w-3.5" /> Scripts</div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1"><PieChart className="h-3.5 w-3.5" /> Part charges</div>
                  </TableHead>
                  <TableHead className="text-right">Coûts</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-center">Marge</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => {
                  const cb = client.costBreakdown;
                  const adjustedProfit = client.totalPaid - cb.totalCost - chargesSharePerClient;
                  const adjustedMargin = client.totalPaid > 0 ? Math.round((adjustedProfit / client.totalPaid) * 100) : 0;
                  const isPositive = adjustedProfit >= 0;
                  const st = statusConfig[client.status];

                  // Design expected parts
                  const de = cb.designsExpected;
                  const designParts = [
                    de.thumbnails > 0 && `${de.thumbnails} mini`,
                    de.posts > 0 && `${de.posts} post`,
                    de.logos > 0 && `${de.logos} logo`,
                    de.carousels > 0 && `${de.carousels} carousel`,
                    de.miniatures > 0 && `${de.miniatures} miniature`,
                  ].filter(Boolean);
                  const totalExpectedDesigns = de.thumbnails + de.posts + de.logos + de.carousels + de.miniatures;
                  const expectedDesignCost = totalExpectedDesigns * 40;

                  return (
                    <TableRow key={client.userId} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{client.companyName}</p>
                            {client.contactName && (
                              <p className="text-xs text-muted-foreground truncate">{client.contactName}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs capitalize">
                          {client.subscriptionType || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {client.totalContract.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-success">
                        {client.totalPaid.toLocaleString('fr-FR')}
                      </TableCell>

                      {/* Videos: show expected pack */}
                      <TableCell className="text-center">
                        {cb.videosExpected > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex flex-col items-center text-sm cursor-default leading-tight">
                                <span className="font-medium">
                                  {cb.videoCount > 0
                                    ? <>{cb.videoCount}<span className="text-muted-foreground">/{cb.videosExpected}</span></>
                                    : <span>{cb.videosExpected}</span>
                                  }
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  × {cb.videoRate} = {(cb.videosExpected * cb.videoRate).toLocaleString('fr-FR')}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pack: {cb.videosExpected} vidéos/mois × {cb.videoRate} DH</p>
                              <p>Livrées: {cb.videoCount} → {cb.videoCost.toLocaleString('fr-FR')} DH</p>
                              <p className="font-semibold">Coût prévu: {(cb.videosExpected * cb.videoRate).toLocaleString('fr-FR')} DH</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Designs: show expected pack breakdown */}
                      <TableCell className="text-center">
                        {designParts.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex flex-col items-center text-sm cursor-default leading-tight">
                                <span className="text-xs text-muted-foreground">
                                  {designParts.join(' + ')}
                                </span>
                                <span className="text-xs font-semibold">= {expectedDesignCost.toLocaleString('fr-FR')}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-0.5">
                                <p className="font-semibold mb-1">Pack design/mois :</p>
                                {de.thumbnails > 0 && <p>{de.thumbnails} miniature(s) × 40 = {de.thumbnails * 40} DH</p>}
                                {de.posts > 0 && <p>{de.posts} post(s) × 40 = {de.posts * 40} DH</p>}
                                {de.logos > 0 && <p>{de.logos} logo(s) × 40 = {de.logos * 40} DH</p>}
                                {de.carousels > 0 && <p>{de.carousels} carousel(s) × 40 = {de.carousels * 40} DH</p>}
                                {de.miniatures > 0 && <p>{de.miniatures} miniature(s) × 40 = {de.miniatures * 40} DH</p>}
                                <p className="font-semibold pt-1 border-t">Livré: {cb.designCount} | Coût réel: {cb.designCost.toLocaleString('fr-FR')} DH</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Scripts / Copywriter */}
                      <TableCell className="text-center">
                        {cb.copywritingCost > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex flex-col items-center text-sm cursor-default leading-tight">
                                <span className="font-medium">{cb.copywritingCost.toLocaleString('fr-FR')}</span>
                                <span className="text-xs text-muted-foreground">
                                  {cb.copywriterMonthlyRate.toLocaleString('fr-FR')} ÷ {cb.copywriterClientCount}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold">{cb.copywriterName}</p>
                              <p>Salaire mensuel: {cb.copywriterMonthlyRate.toLocaleString('fr-FR')} DH</p>
                              <p>Assigné à {cb.copywriterClientCount} client(s)</p>
                              <p className="font-semibold mt-1">{cb.copywriterMonthlyRate.toLocaleString('fr-FR')} ÷ {cb.copywriterClientCount} = {cb.copywritingCost.toLocaleString('fr-FR')} DH</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Part des charges totales */}
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex flex-col items-end text-sm cursor-default leading-tight">
                              <span className="font-semibold text-chart-4">{chargesSharePerClient.toLocaleString('fr-FR')}</span>
                              <span className="text-xs text-muted-foreground">
                                {totalExpenses.toLocaleString('fr-FR')} ÷ {activeClientCount}
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Part des charges totales</p>
                            <p>Total charges du mois: {totalExpenses.toLocaleString('fr-FR')} DH</p>
                            <p>Clients actifs: {activeClientCount}</p>
                            <p className="font-semibold mt-1">{totalExpenses.toLocaleString('fr-FR')} ÷ {activeClientCount} = {chargesSharePerClient.toLocaleString('fr-FR')} DH</p>
                            <p className="text-xs text-muted-foreground mt-1">ADS + Quotidiennes + Fixes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Total cost */}
                      <TableCell className="text-right text-sm font-semibold text-warning">
                        {cb.totalCost.toLocaleString('fr-FR')}
                      </TableCell>

                      {/* Net profit = Encaissé - (Coûts production + Part charges) */}
                      <TableCell className={`text-right text-sm font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-end gap-1 cursor-default">
                              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                              {adjustedProfit.toLocaleString('fr-FR')}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Encaissé: {client.totalPaid.toLocaleString('fr-FR')} DH</p>
                            <p>- Coûts production: {cb.totalCost.toLocaleString('fr-FR')} DH</p>
                            <p>- Part charges: {chargesSharePerClient.toLocaleString('fr-FR')} DH</p>
                            <p className="font-semibold mt-1">= {adjustedProfit.toLocaleString('fr-FR')} DH</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Margin */}
                      <TableCell className="text-center">
                        <Badge className={
                          adjustedMargin >= 50
                            ? 'bg-success/15 text-success border-success/30'
                            : adjustedMargin >= 20
                              ? 'bg-warning/15 text-warning border-warning/30'
                              : 'bg-destructive/15 text-destructive border-destructive/30'
                        }>
                          {adjustedMargin}%
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge className={st.className}>{st.label}</Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedClient(client)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => setAddPaymentClient(client)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                      Aucun client trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Client detail modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClient?.companyName} — Historique financier</DialogTitle>
          </DialogHeader>
          {selectedClient && (() => {
            const scb = selectedClient.costBreakdown;
            const sde = scb.designsExpected;
            const modalProfit = selectedClient.totalPaid - scb.totalCost - chargesSharePerClient;
            const modalMargin = selectedClient.totalPaid > 0 ? Math.round((modalProfit / selectedClient.totalPaid) * 100) : 0;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total contrat</p>
                    <p className="font-bold">{selectedClient.totalContract.toLocaleString('fr-FR')} DH</p>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10">
                    <p className="text-xs text-muted-foreground">Total encaissé</p>
                    <p className="font-bold text-success">{selectedClient.totalPaid.toLocaleString('fr-FR')} DH</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <p className="text-xs text-muted-foreground">Restant</p>
                    <p className="font-bold text-destructive">{selectedClient.remaining.toLocaleString('fr-FR')} DH</p>
                  </div>
                  <div className={`p-3 rounded-lg ${modalProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <p className="text-xs text-muted-foreground">Profit net (marge {modalMargin}%)</p>
                    <p className={`font-bold ${modalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {modalProfit.toLocaleString('fr-FR')} DH
                    </p>
                  </div>
                </div>

                {/* Cost breakdown in modal */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Détail des coûts de production</h4>
                  <div className="space-y-1.5">
                    {scb.videosExpected > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2"><Video className="h-3.5 w-3.5 text-primary" /><span className="text-sm">Montage vidéo</span></div>
                        <span className="text-sm font-semibold">{scb.videosExpected} × {scb.videoRate} = {(scb.videosExpected * scb.videoRate).toLocaleString('fr-FR')} DH</span>
                      </div>
                    )}
                    {sde.thumbnails > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2"><Image className="h-3.5 w-3.5 text-chart-2" /><span className="text-sm">Miniatures</span></div>
                        <span className="text-sm font-semibold">{sde.thumbnails} × 40 = {(sde.thumbnails * 40).toLocaleString('fr-FR')} DH</span>
                      </div>
                    )}
                    {sde.posts > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2"><Palette className="h-3.5 w-3.5 text-chart-3" /><span className="text-sm">Posts</span></div>
                        <span className="text-sm font-semibold">{sde.posts} × 40 = {(sde.posts * 40).toLocaleString('fr-FR')} DH</span>
                      </div>
                    )}
                    {sde.logos > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2"><PenTool className="h-3.5 w-3.5 text-accent-foreground" /><span className="text-sm">Logos</span></div>
                        <span className="text-sm font-semibold">{sde.logos} × 40 = {(sde.logos * 40).toLocaleString('fr-FR')} DH</span>
                      </div>
                    )}
                    {scb.copywritingCost > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2"><PenTool className="h-3.5 w-3.5 text-accent-foreground" /><span className="text-sm">Copywriting ({scb.copywriterName})</span></div>
                        <span className="text-sm font-semibold">{scb.copywriterMonthlyRate.toLocaleString('fr-FR')} ÷ {scb.copywriterClientCount} = {scb.copywritingCost.toLocaleString('fr-FR')} DH</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
                      <span className="text-sm font-bold">Total coûts production</span>
                      <span className="text-sm font-bold text-warning">{scb.totalCost.toLocaleString('fr-FR')} DH</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-chart-4/10 border border-chart-4/20">
                      <span className="text-sm font-bold">Part des charges totales</span>
                      <span className="text-sm font-bold text-chart-4">{chargesSharePerClient.toLocaleString('fr-FR')} DH</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="text-sm font-bold">Profit = Encaissé − Production − Charges</span>
                      <span className={`text-sm font-bold ${modalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{modalProfit.toLocaleString('fr-FR')} DH</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Historique des paiements</h4>
                  {selectedClient.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedClient.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{Number(p.amount).toLocaleString('fr-FR')} DH</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(p.paymentDate).toLocaleDateString('fr-FR')} · {p.paymentMethod}
                            </p>
                          </div>
                          {p.notes && <p className="text-xs text-muted-foreground max-w-[150px] truncate">{p.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {addPaymentClient && (
        <AddPaymentModal
          client={addPaymentClient}
          open={!!addPaymentClient}
          onClose={() => setAddPaymentClient(null)}
          onSuccess={onPaymentAdded}
        />
      )}
    </>
  );
}
