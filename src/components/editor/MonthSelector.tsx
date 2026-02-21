import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  className?: string;
}

export function MonthSelector({ selectedMonth, onMonthChange, className }: MonthSelectorProps) {
  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, now);
  
  const handlePreviousMonth = () => {
    onMonthChange(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    // Don't allow selecting future months
    if (nextMonth <= endOfMonth(now)) {
      onMonthChange(nextMonth);
    }
  };

  const handleCurrentMonth = () => {
    onMonthChange(startOfMonth(now));
  };

  const canGoNext = addMonths(selectedMonth, 1) <= endOfMonth(now);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousMonth}
          className="rounded-none h-9 px-2 hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2 px-4 min-w-[160px] justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold capitalize">
            {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className="rounded-none h-9 px-2 hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentMonth}
          className="text-xs"
        >
          Mois actuel
        </Button>
      )}
    </div>
  );
}

// Helper functions for month filtering
export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function isWithinMonth(dateToCheck: Date | string, monthDate: Date): boolean {
  const date = typeof dateToCheck === 'string' ? new Date(dateToCheck) : dateToCheck;
  const { start, end } = getMonthRange(monthDate);
  return date >= start && date <= end;
}