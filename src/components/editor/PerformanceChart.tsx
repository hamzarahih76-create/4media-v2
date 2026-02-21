import { useMemo, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, Video, Banknote, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoData {
  id: string;
  completed_at: string | null;
  is_validated?: boolean;
  status: string;
}

interface PerformanceChartProps {
  videos: VideoData[];
  basePayPerVideo?: number;
  currency?: string;
  selectedMonth: Date;
}

type ViewMode = 'daily' | 'cumulative';
type TimeRange = '7d' | '30d' | 'month';

export function PerformanceChart({ 
  videos, 
  basePayPerVideo = 100, 
  currency = 'DH',
  selectedMonth 
}: PerformanceChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const today = new Date();
    if (timeRange === '7d') {
      return {
        start: subDays(today, 6),
        end: today,
      };
    } else if (timeRange === '30d') {
      return {
        start: subDays(today, 29),
        end: today,
      };
    } else {
      return {
        start: startOfMonth(selectedMonth),
        end: endOfMonth(selectedMonth),
      };
    }
  }, [timeRange, selectedMonth]);

  // Get validated videos only
  const validatedVideos = useMemo(() => {
    return videos.filter(v => 
      v.status === 'completed' || v.is_validated
    );
  }, [videos]);

  // Generate chart data
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    let cumulativeVideos = 0;
    let cumulativeEarnings = 0;

    return days.map(day => {
      const dayVideos = validatedVideos.filter(v => {
        const validationDate = v.completed_at;
        if (!validationDate) return false;
        return isSameDay(new Date(validationDate), day);
      });

      const dailyVideos = dayVideos.length;
      const dailyEarnings = dailyVideos * basePayPerVideo;
      
      cumulativeVideos += dailyVideos;
      cumulativeEarnings += dailyEarnings;

      return {
        date: format(day, 'dd/MM', { locale: fr }),
        fullDate: format(day, 'EEEE d MMMM', { locale: fr }),
        dailyVideos,
        dailyEarnings,
        cumulativeVideos,
        cumulativeEarnings,
      };
    });
  }, [validatedVideos, dateRange, basePayPerVideo]);

  // Summary stats
  const stats = useMemo(() => {
    const totalVideos = chartData[chartData.length - 1]?.cumulativeVideos || 0;
    const totalEarnings = chartData[chartData.length - 1]?.cumulativeEarnings || 0;
    const daysWithData = chartData.filter(d => d.dailyVideos > 0).length;
    const avgPerDay = daysWithData > 0 ? (totalEarnings / daysWithData) : 0;

    return {
      totalVideos,
      totalEarnings,
      avgPerDay,
      daysWithData,
    };
  }, [chartData]);

  const chartConfig = {
    earnings: {
      label: "Gains",
      color: "hsl(var(--primary))",
    },
    videos: {
      label: "Vidéos",
      color: "hsl(142, 76%, 36%)",
    },
  };

  const timeRangeLabel = {
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    'month': format(selectedMonth, 'MMMM yyyy', { locale: fr }),
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Performance Financière</h3>
            <p className="text-xs text-muted-foreground">Évolution de vos gains</p>
          </div>
        </div>

      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-chart-2" />
            <span className="text-xs text-muted-foreground">Total gagné</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{stats.totalEarnings.toLocaleString()} {currency}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Video className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Vidéos</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{stats.totalVideos}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-chart-4" />
            <span className="text-xs text-muted-foreground">Moy./jour</span>
          </div>
          <p className="text-lg sm:text-xl font-bold">{Math.round(stats.avgPerDay)} {currency}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[250px] sm:h-[300px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toLocaleString()}${currency.toLowerCase()}`}
              width={65}
              ticks={[0, 2500, 5000, 10000]}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium capitalize mb-2">{data.fullDate}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {viewMode === 'cumulative' ? 'Total cumulé' : 'Gains du jour'}
                        </span>
                        <span className="font-semibold text-primary">
                          {(viewMode === 'cumulative' ? data.cumulativeEarnings : data.dailyEarnings).toLocaleString()} {currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {viewMode === 'cumulative' ? 'Vidéos totales' : 'Vidéos du jour'}
                        </span>
                        <span className="font-semibold">
                          {viewMode === 'cumulative' ? data.cumulativeVideos : data.dailyVideos}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={viewMode === 'cumulative' ? 'cumulativeEarnings' : 'dailyEarnings'}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorEarnings)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Motivational message */}
      {stats.totalVideos > 0 && (
        <div className="text-center text-sm text-muted-foreground py-2 border-t border-border/30">
          <span className="text-primary font-medium">+{stats.totalVideos} vidéos</span> validées = 
          <span className="text-chart-2 font-medium"> +{stats.totalEarnings.toLocaleString()} {currency}</span> gagnés 🚀
        </div>
      )}

      {stats.totalVideos === 0 && (
        <div className="text-center text-sm text-muted-foreground py-4 border-t border-border/30">
          Aucune vidéo validée sur cette période. Commencez à travailler pour voir votre courbe monter ! 📈
        </div>
      )}
    </div>
  );
}
