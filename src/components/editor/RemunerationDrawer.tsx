import { useState } from 'react';
import { Banknote, TrendingUp, TrendingDown, Video, Gift, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

interface BonusTier {
  videos: number;
  bonus: number;
}

interface MonthlyData {
  month: string;
  monthShort: string;
  videos: number;
  base: number;
  bonus: number;
  total: number;
}

interface RemunerationDrawerProps {
  currentVideos: number;
  tiers: BonusTier[];
  basePayPerVideo?: number;
  currency?: string;
  selectedMonth: Date;
}

// Mock historical data - replace with real data later
function generateMockHistory(selectedMonth: Date, currentVideos: number, tiers: BonusTier[], basePayPerVideo: number, monthsCount: number = 6): MonthlyData[] {
  const months: MonthlyData[] = [];
  
  for (let i = monthsCount - 1; i >= 0; i--) {
    const date = subMonths(selectedMonth, i);
    const isCurrentMonth = i === 0;
    const videos = isCurrentMonth ? currentVideos : Math.floor(Math.random() * 60) + 20;
    const base = videos * basePayPerVideo;
    const currentTier = [...tiers].sort((a, b) => a.videos - b.videos).filter(t => videos >= t.videos).pop();
    const bonus = currentTier?.bonus || 0;
    
    months.push({
      month: format(date, 'MMMM yyyy', { locale: fr }),
      monthShort: format(date, 'MMM', { locale: fr }),
      videos,
      base,
      bonus,
      total: base + bonus
    });
  }
  
  return months;
}

export function RemunerationDrawer({ 
  currentVideos, 
  tiers, 
  basePayPerVideo = 100,
  currency = 'DH',
  selectedMonth 
}: RemunerationDrawerProps) {
  const [open, setOpen] = useState(false);
  const [historyMonths, setHistoryMonths] = useState<6 | 12>(6);
  
  const sortedTiers = [...tiers].sort((a, b) => a.videos - b.videos);
  const currentTier = sortedTiers.filter(t => currentVideos >= t.videos).pop();
  const currentBonus = currentTier?.bonus || 0;
  const basePay = currentVideos * basePayPerVideo;
  const totalPay = basePay + currentBonus;
  const monthName = format(selectedMonth, 'MMMM yyyy', { locale: fr });
  
  const historyData = generateMockHistory(selectedMonth, currentVideos, tiers, basePayPerVideo, historyMonths);
  
  // Calculate trend
  const lastMonth = historyData[historyData.length - 2];
  const thisMonth = historyData[historyData.length - 1];
  const trend = lastMonth ? ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100 : 0;
  const isPositive = trend >= 0;

  const chartConfig = {
    base: {
      label: "Base",
      color: "hsl(var(--primary))",
    },
    bonus: {
      label: "Bonus",
      color: "hsl(142, 76%, 36%)",
    },
  };

  // Mini chart data for preview (last 4 months)
  const miniChartData = historyData.slice(-4);
  const maxTotal = Math.max(...miniChartData.map(d => d.total), 1);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Compact view with mini graph */}
        <button className="w-full text-left bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:bg-card/80 transition-all group">
          <div className="flex items-center gap-4">
            {/* Mini chart */}
            <div className="flex items-end gap-1 h-12 px-2">
              {miniChartData.map((month, index) => {
                const height = (month.total / maxTotal) * 100;
                const isCurrentMonth = index === miniChartData.length - 1;
                return (
                  <div key={month.month} className="flex flex-col items-center gap-1">
                    <div 
                      className={cn(
                        "w-4 rounded-t transition-all",
                        isCurrentMonth ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{month.monthShort}</span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">Total gagné</span>
              <div className="text-xl font-bold">{totalPay.toLocaleString()} {currency}</div>
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        </button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-500" />
            Évolution des revenus
          </SheetTitle>
        </SheetHeader>
        
        {/* Current month summary */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-600 uppercase tracking-wide">Ce mois</span>
            <div className={cn(
              'flex items-center gap-1 text-sm font-semibold',
              isPositive ? 'text-emerald-500' : 'text-red-500'
            )}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{trend.toFixed(0)}%
            </div>
          </div>
          <div className="text-4xl font-black">{totalPay.toLocaleString()} {currency}</div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{currentVideos} vidéos × {basePayPerVideo} {currency}</span>
            {currentBonus > 0 && (
              <span className="text-emerald-500 font-semibold">+ {currentBonus} {currency} bonus</span>
            )}
          </div>
        </div>
        
        {/* Chart */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Historique des {historyMonths} derniers mois</h4>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/50">
              <button
                onClick={() => setHistoryMonths(6)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  historyMonths === 6 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                6 mois
              </button>
              <button
                onClick={() => setHistoryMonths(12)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  historyMonths === 12 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                12 mois
              </button>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthShort" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value, name) => [`${Number(value).toLocaleString()} ${currency}`, name === 'base' ? 'Base' : 'Bonus']}
              />
              <Bar dataKey="base" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bonus" stackId="a" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        
        {/* Monthly breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Détail par mois</h4>
          <div className="space-y-2">
            {[...historyData].reverse().map((month, index) => (
              <div 
                key={month.month}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all',
                  index === 0 
                    ? 'bg-emerald-500/5 border-emerald-500/30' 
                    : 'bg-muted/30 border-border/50'
                )}
              >
                <div>
                  <p className={cn(
                    'font-medium capitalize',
                    index === 0 && 'text-emerald-600'
                  )}>
                    {month.month}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {month.videos} vidéos
                    {month.bonus > 0 && ` • +${month.bonus} ${currency} bonus`}
                  </p>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  index === 0 && 'text-emerald-500'
                )}>
                  {month.total.toLocaleString()} {currency}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bonus tiers reminder */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-500" />
            Paliers de bonus
          </h4>
          <div className="space-y-1">
            {sortedTiers.map(tier => (
              <div key={tier.videos} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tier.videos} vidéos</span>
                <span className="font-semibold text-amber-500">+{tier.bonus} {currency}</span>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
