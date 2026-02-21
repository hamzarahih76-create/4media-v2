import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Clock,
  Sparkles,
  Timer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DesignTask {
  id: string;
  title: string;
  description?: string | null;
  client_name?: string | null;
  deadline?: string | null;
  status: string;
}

function calculatePriceFromDescription(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return null;
  const entries = match[1].split('+').map(s => s.trim());
  let total = 0;
  for (const entry of entries) {
    const carouselMatch = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
    if (carouselMatch) {
      const count = parseInt(carouselMatch[1]);
      const pages = parseInt(carouselMatch[2]);
      total += (pages / 2) * 40 * count;
    } else {
      const simpleMatch = entry.match(/(\d+)x\s*(Post|Miniature)/i);
      if (simpleMatch) {
        total += parseInt(simpleMatch[1]) * 40;
      }
    }
  }
  return total > 0 ? total : null;
}

interface DesignerTaskCardProps {
  task: DesignTask;
  onStart?: (taskId: string) => void;
  onClick?: (task: DesignTask) => void;
  index?: number;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<any>; 
  gradient: string;
  bgGlow: string;
}> = {
  new: { label: 'Nouveau', icon: Sparkles, gradient: 'from-blue-500 to-cyan-500', bgGlow: 'group-hover:shadow-blue-500/20' },
  active: { label: 'En cours', icon: Play, gradient: 'from-amber-500 to-orange-500', bgGlow: 'group-hover:shadow-amber-500/20' },
  in_review: { label: 'En validation', icon: Clock, gradient: 'from-purple-500 to-pink-500', bgGlow: 'group-hover:shadow-purple-500/20' },
  revision_requested: { label: 'Révision', icon: RefreshCw, gradient: 'from-orange-500 to-red-500', bgGlow: 'group-hover:shadow-orange-500/20' },
  completed: { label: 'Terminé', icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500', bgGlow: 'group-hover:shadow-emerald-500/20' },
  late: { label: 'En retard', icon: AlertCircle, gradient: 'from-red-500 to-rose-500', bgGlow: 'group-hover:shadow-red-500/20' },
};

function useCountdown(deadline: string | null | undefined, active: boolean) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline || !active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline, active]);

  if (!deadline) return null;

  const diff = new Date(deadline).getTime() - now;
  const isOverdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const secs = Math.floor((abs % 60000) / 1000);

  let text = '';
  if (days > 0) text += `${days}j `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${mins}min ${secs}s`;

  return { text: isOverdue ? `-${text}` : text, isOverdue };
}

export function DesignerTaskCard({ task, onStart, onClick, index = 0 }: DesignerTaskCardProps) {
  const config = statusConfig[task.status] || statusConfig.new;
  const StatusIcon = config.icon;
  const showCountdown = task.status !== 'completed';
  const countdown = useCountdown(task.deadline, showCountdown);
  const price = calculatePriceFromDescription(task.description);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={() => onClick?.(task)}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm cursor-pointer",
        "hover:border-emerald-500/30 hover:shadow-xl transition-all duration-300",
        config.bgGlow
      )}
    >
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
        config.gradient
      )} />
      
      <div className="grid grid-cols-3 items-center px-5 py-4 gap-4">
        {/* Left: title + client */}
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {task.title}
          </h3>
          {task.client_name && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Palette className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{task.client_name}</span>
            </p>
          )}
        </div>

        {/* Center: price + countdown */}
        <div className="flex flex-col items-center gap-0.5">
          {price !== null && (
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {price} DH
            </span>
          )}
          {countdown && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-mono font-medium",
              countdown.isOverdue ? "text-destructive" : "text-muted-foreground"
            )}>
              <Timer className="h-3.5 w-3.5" />
              {countdown.text}
            </div>
          )}
        </div>

        {/* Right: status + action */}
        <div className="flex items-center justify-end gap-3">
          <Badge 
            className={cn(
              "bg-gradient-to-r text-white border-0 shadow-md",
              config.gradient
            )}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>

          {task.status === 'new' && onStart && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStart(task.id);
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/25"
            >
              <Play className="h-4 w-4 mr-1.5" />
              Démarrer
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
