import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface PMStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  default: {
    card: 'hover:border-primary/30',
    icon: 'bg-primary/10 text-primary',
    value: 'text-foreground',
  },
  success: {
    card: 'hover:border-success/30',
    icon: 'bg-success/10 text-success',
    value: 'text-success',
  },
  warning: {
    card: 'hover:border-warning/30',
    icon: 'bg-warning/10 text-warning',
    value: 'text-warning',
  },
  danger: {
    card: 'hover:border-destructive/30',
    icon: 'bg-destructive/10 text-destructive',
    value: 'text-destructive',
  },
  info: {
    card: 'hover:border-primary/30',
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
};

export function PMStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
  className,
}: PMStatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 cursor-pointer group',
        'border-border/50 hover:shadow-lg hover:shadow-primary/5',
        styles.card,
        className
      )}
      onClick={onClick}
    >
      {/* Gradient accent line at top */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity',
        variant === 'success' && 'bg-gradient-to-r from-success to-success/50',
        variant === 'warning' && 'bg-gradient-to-r from-warning to-warning/50',
        variant === 'danger' && 'bg-gradient-to-r from-destructive to-destructive/50',
        variant === 'info' && 'bg-gradient-to-r from-accent to-accent/50',
        variant === 'default' && 'bg-gradient-to-r from-primary to-primary/50',
      )} />
      
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className={cn('text-3xl font-bold tracking-tight', styles.value)}>
                {value}
              </p>
              {subtitle && (
                <span className="text-xl font-bold text-destructive">{subtitle}</span>
              )}
            </div>
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            styles.icon
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </Card>
  );
}
