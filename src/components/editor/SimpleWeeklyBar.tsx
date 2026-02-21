import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Target } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SimpleWeeklyBarProps {
  current: number;
  target: number;
  daysInWeek?: number;
  selectedMonth: Date;
  className?: string;
}

export function SimpleWeeklyBar({ current, target, daysInWeek = 7, selectedMonth, className }: SimpleWeeklyBarProps) {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;
  const dailyTarget = Math.ceil(target / daysInWeek);
  const monthName = format(selectedMonth, 'MMMM', { locale: fr });

  return (
    <div className={cn('p-5 rounded-xl bg-card border border-border/50', className)}>
      {/* Title - Big & Clear */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center',
          isComplete ? 'bg-emerald-500/10' : 'bg-primary/10'
        )}>
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Target className="h-5 w-5 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold">Objectif de la semaine</h3>
          <p className="text-sm text-muted-foreground">
            {daysInWeek} jours – <span className="capitalize">{monthName}</span>
          </p>
        </div>
      </div>

      {/* Main Progress - Very Visible */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-4xl font-black tracking-tight',
              isComplete ? 'text-emerald-500' : 'text-foreground'
            )}>
              {current}
            </span>
            <span className="text-xl text-muted-foreground font-semibold">/ {target} vidéos</span>
          </div>
          <span className={cn(
            'text-lg font-bold',
            isComplete ? 'text-emerald-500' : progress >= 70 ? 'text-amber-500' : 'text-muted-foreground'
          )}>
            {Math.round(progress)}%
          </span>
        </div>
        
        <Progress 
          value={progress} 
          className={cn('h-3', isComplete && '[&>div]:bg-emerald-500')}
        />
      </div>
    </div>
  );
}
