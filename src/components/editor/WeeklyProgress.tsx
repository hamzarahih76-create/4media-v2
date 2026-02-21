import { cn } from '@/lib/utils';
import { CheckCircle2, Target } from 'lucide-react';

interface WeeklyProgressProps {
  current: number;
  target: number;
  days: {
    day: string;
    completed: number;
    target: number;
  }[];
  className?: string;
}

export function WeeklyProgress({ current, target, days, className }: WeeklyProgressProps) {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className={cn(
      'rounded-xl bg-card border border-border/50 p-5',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Objectif hebdomadaire</h3>
          <p className="text-sm text-muted-foreground">
            {current} / {target} vidéos livrées
          </p>
        </div>

        <div className={cn(
          'h-12 w-12 rounded-full flex items-center justify-center',
          isComplete 
            ? 'bg-success/10 text-success' 
            : 'bg-primary/10 text-primary'
        )}>
          {isComplete ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Target className="h-6 w-6" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-5">
        <div 
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-700',
            isComplete 
              ? 'bg-gradient-to-r from-success to-success/80' 
              : 'bg-gradient-to-r from-primary to-accent'
          )}
          style={{ width: `${progress}%` }}
        />
        {/* Milestone markers */}
        <div className="absolute inset-0 flex justify-between px-[1px]">
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className="w-[2px] h-full bg-background/50"
              style={{ marginLeft: `${milestone - 0.5}%` }}
            />
          ))}
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayProgress = day.target > 0 ? (day.completed / day.target) * 100 : 0;
          const isToday = index === new Date().getDay() - 1;
          
          return (
            <div 
              key={day.day}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors',
                isToday && 'bg-primary/5 ring-1 ring-primary/20'
              )}
            >
              <span className={cn(
                'text-xs font-medium',
                isToday ? 'text-primary' : 'text-muted-foreground'
              )}>
                {day.day}
              </span>
              
              <div className="relative h-12 w-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500',
                    dayProgress >= 100 ? 'bg-success' : 'bg-primary'
                  )}
                  style={{ height: `${Math.min(dayProgress, 100)}%` }}
                />
              </div>
              
              <span className={cn(
                'text-[10px] font-medium',
                day.completed >= day.target ? 'text-success' : 'text-muted-foreground'
              )}>
                {day.completed}/{day.target}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
