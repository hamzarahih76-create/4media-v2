import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EditorStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  accentColor?: 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
}

const accentColors = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    gradient: 'from-primary/20 to-transparent',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    gradient: 'from-success/20 to-transparent',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    gradient: 'from-warning/20 to-transparent',
  },
  accent: {
    bg: 'bg-accent/10',
    text: 'text-accent',
    gradient: 'from-accent/20 to-transparent',
  },
};

export function EditorStatCard({ 
  title, 
  value, 
  subtitle,
  icon, 
  trend, 
  accentColor = 'primary',
  className 
}: EditorStatCardProps) {
  const colors = accentColors[accentColor];

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl bg-card border border-border/50',
      'p-5 transition-all duration-300 hover:shadow-md hover:border-border',
      'group',
      className
    )}>
      {/* Subtle gradient background */}
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-50',
        'bg-gradient-radial',
        colors.gradient
      )} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center',
            'transition-transform duration-300 group-hover:scale-110',
            colors.bg
          )}>
            <div className={colors.text}>{icon}</div>
          </div>

          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend.value > 0 && 'bg-success/10 text-success',
              trend.value < 0 && 'bg-destructive/10 text-destructive',
              trend.value === 0 && 'bg-muted text-muted-foreground'
            )}>
              {trend.value > 0 && <TrendingUp className="h-3 w-3" />}
              {trend.value < 0 && <TrendingDown className="h-3 w-3" />}
              {trend.value === 0 && <Minus className="h-3 w-3" />}
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
          )}
        </div>
      </div>
    </div>
  );
}
