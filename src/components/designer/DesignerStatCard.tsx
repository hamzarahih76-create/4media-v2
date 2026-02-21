import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesignerStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  delay?: number;
}

const variantStyles = {
  default: {
    icon: 'bg-muted/50 text-muted-foreground',
    glow: '',
  },
  primary: {
    icon: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-500',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  success: {
    icon: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-500',
    glow: 'group-hover:shadow-green-500/20',
  },
  warning: {
    icon: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500',
    glow: 'group-hover:shadow-amber-500/20',
  },
};

export function DesignerStatCard({ 
  icon: Icon, 
  label, 
  value, 
  suffix,
  subtitle,
  variant = 'default',
  delay = 0 
}: DesignerStatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4",
        "hover:border-emerald-500/30 hover:shadow-lg transition-all duration-300",
        styles.glow
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-300" />
      
      <div className="relative flex items-center gap-4">
        <motion.div 
          className={cn("p-2.5 rounded-xl", styles.icon)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
        
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <motion.span 
              className="text-2xl font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
            >
              {value}
            </motion.span>
            {suffix && (
              <span className="text-sm text-muted-foreground">{suffix}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
