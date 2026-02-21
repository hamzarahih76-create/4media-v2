import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CreditCard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentCollectionBannerProps {
  clients: any[];
}

type PaymentStatus = 'paid' | 'partial' | 'unpaid';

function getPaymentStatus(client: any): { status: PaymentStatus; label: string; icon: string; color: string } {
  const total = Number(client.total_contract) || 0;
  const received = Number(client.advance_received) || 0;
  const remaining = total - received;

  if (total === 0) return { status: 'unpaid', label: 'Non payé', icon: '⛔', color: 'text-destructive' };
  if (remaining <= 0) return { status: 'paid', label: 'Payé', icon: '✅', color: 'text-emerald-600 dark:text-emerald-400' };
  if (received > 0) return { status: 'partial', label: 'Avance reçue', icon: '🟡', color: 'text-amber-600 dark:text-amber-400' };
  return { status: 'unpaid', label: 'Non payé', icon: '⛔', color: 'text-destructive' };
}

export function PaymentCollectionBanner({ clients }: PaymentCollectionBannerProps) {
  const navigate = useNavigate();
  const today = new Date();
  const dayOfMonth = today.getDate();

  if (dayOfMonth < 20) return null;

  const nextMonth = addMonths(today, 1);
  const nextMonthLabel = format(nextMonth, 'MMMM yyyy', { locale: fr });

  const activeClients = clients.filter((c: any) => c.account_status !== 'blocked');

  const clientsData = activeClients.map((c: any) => ({
    ...c,
    monthlyPrice: Number(c.monthly_price) || 0,
    paymentInfo: getPaymentStatus(c),
  }));

  const paidCount = clientsData.filter(c => c.paymentInfo.status === 'paid').length;

  const totalMonthly = clientsData.reduce((s, c) => s + c.monthlyPrice, 0);
  const paidTotal = clientsData.filter(c => c.paymentInfo.status === 'paid').reduce((s, c) => s + c.monthlyPrice, 0);
  const remainingTotal = totalMonthly - paidTotal;
  const progressPercent = totalMonthly > 0 ? (paidTotal / totalMonthly) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-2 border-orange-500/40 bg-gradient-to-br from-orange-50/80 via-red-50/40 to-orange-50/60 dark:from-orange-950/30 dark:via-red-950/20 dark:to-orange-950/20 shadow-lg shadow-orange-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-orange-800 dark:text-orange-300">
                  🔥 Collecte des paiements — {nextMonthLabel}
                </CardTitle>
                <p className="text-xs text-orange-700/70 dark:text-orange-400/70 mt-0.5">
                  {activeClients.length} clients actifs • {paidCount}/{activeClients.length} à jour
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                Action financière obligatoire
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/10"
                onClick={() => navigate('/payments')}
              >
                Voir les paiements à relancer
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-orange-800 dark:text-orange-300">Progression des encaissements</span>
              <span className="font-bold text-orange-700 dark:text-orange-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-orange-200/50 dark:bg-orange-900/30">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-orange-200/50 dark:border-orange-800/30 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total attendu</p>
              <p className="text-lg font-bold mt-1">{totalMonthly.toLocaleString('fr-FR')} DH</p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-emerald-200/50 dark:border-emerald-800/30 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Déjà encaissé</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{paidTotal.toLocaleString('fr-FR')} DH</p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-destructive/30 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Reste à collecter</p>
              <p className="text-lg font-bold text-destructive mt-1">{remainingTotal.toLocaleString('fr-FR')} DH</p>
            </div>
          </div>

          {/* Client list */}
          {clientsData.length > 0 && (
            <div className="rounded-xl border border-orange-200/50 dark:border-orange-800/30 overflow-hidden">
              <div className="bg-orange-100/50 dark:bg-orange-900/20 px-4 py-2 text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wider">
                Détail par client
              </div>
              <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
                {clientsData.map((client) => (
                  <div key={client.id} className="flex items-center justify-between px-4 py-2.5 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">{client.paymentInfo.icon}</span>
                      <span className="text-sm font-medium">{client.company_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{client.monthlyPrice.toLocaleString('fr-FR')} DH</span>
                      <span className={`text-xs font-semibold ${client.paymentInfo.color}`}>
                        {client.paymentInfo.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
