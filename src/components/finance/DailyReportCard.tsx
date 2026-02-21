import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FinanceSummary } from '@/hooks/useFinanceData';

interface DailyReportCardProps {
  summary: FinanceSummary;
}

export function DailyReportCard({ summary }: DailyReportCardProps) {
  const dailyProfit = summary.dailyCollected - summary.dailyExpenses;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Rapport du jour — {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-chart-2" />
            <p className="text-xs text-muted-foreground">CA estimé/jour</p>
            <p className="font-bold">{Math.round(summary.dailyRevenue).toLocaleString('fr-FR')} DH</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-success/10">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground">Encaissé aujourd'hui</p>
            <p className="font-bold text-success">{summary.dailyCollected.toLocaleString('fr-FR')} DH</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-warning/10">
            <TrendingDown className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground">Dépenses/jour</p>
            <p className="font-bold text-warning">{Math.round(summary.dailyExpenses).toLocaleString('fr-FR')} DH</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${dailyProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
            <TrendingUp className={`h-4 w-4 mx-auto mb-1 ${dailyProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
            <p className="text-xs text-muted-foreground">Profit du jour</p>
            <p className={`font-bold ${dailyProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {Math.round(dailyProfit).toLocaleString('fr-FR')} DH
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
