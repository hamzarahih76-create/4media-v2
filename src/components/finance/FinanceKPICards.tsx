import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  Receipt,
  PiggyBank
} from 'lucide-react';
import type { FinanceSummary } from '@/hooks/useFinanceData';

interface FinanceKPICardsProps {
  summary: FinanceSummary;
}

const kpiConfig = [
  { 
    key: 'revenueMonth' as const, 
    label: "CA du mois", 
    icon: DollarSign, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  { 
    key: 'collectedMonth' as const, 
    label: "Encaissé ce mois", 
    icon: Wallet, 
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  { 
    key: 'remainingToCollect' as const, 
    label: "Restant à encaisser", 
    icon: ArrowDownRight, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  { 
    key: 'expensesMonth' as const, 
    label: "Charges du mois", 
    icon: Receipt, 
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  { 
    key: 'profitMonth' as const, 
    label: "Profit net du mois", 
    icon: PiggyBank, 
    color: 'text-success',
    bgColor: 'bg-success/10',
    dynamic: true,
  },
];

export function FinanceKPICards({ summary }: FinanceKPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpiConfig.map((kpi) => {
        const value = summary[kpi.key];
        const isNegative = kpi.dynamic && value < 0;
        const displayColor = isNegative ? 'text-destructive' : kpi.color;
        const displayBg = isNegative ? 'bg-destructive/10' : kpi.bgColor;
        const Icon = kpi.icon;

        return (
          <Card key={kpi.key} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${displayBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${displayColor}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
              <p className={`text-lg font-bold ${displayColor}`}>
                {value.toLocaleString('fr-FR')} DH
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
