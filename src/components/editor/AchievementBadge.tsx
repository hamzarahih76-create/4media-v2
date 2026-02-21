import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AchievementBadgeProps {
  icon: LucideIcon;
  title: string;
  description: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  className?: string;
}

const rarityConfig = {
  common: {
    border: 'border-slate-400',
    bg: 'bg-slate-500/10',
    glow: '',
    label: 'Commun',
    labelBg: 'bg-slate-500/20 text-slate-400',
  },
  rare: {
    border: 'border-blue-400',
    bg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/20',
    label: 'Rare',
    labelBg: 'bg-blue-500/20 text-blue-400',
  },
  epic: {
    border: 'border-purple-400',
    bg: 'bg-purple-500/10',
    glow: 'shadow-purple-500/30',
    label: 'Épique',
    labelBg: 'bg-purple-500/20 text-purple-400',
  },
  legendary: {
    border: 'border-yellow-400',
    bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
    glow: 'shadow-yellow-500/40',
    label: 'Légendaire',
    labelBg: 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-400',
  },
};

export function AchievementBadge({ 
  icon: Icon, 
  title, 
  description, 
  unlocked, 
  rarity,
  unlockedAt,
  className 
}: AchievementBadgeProps) {
  const config = rarityConfig[rarity];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'relative group cursor-pointer',
            className
          )}>
            <div className={cn(
              'h-16 w-16 rounded-2xl border-2 flex items-center justify-center',
              'transition-all duration-300',
              unlocked ? [
                config.border,
                config.bg,
                'shadow-lg',
                config.glow,
                'hover:scale-110',
              ] : [
                'border-border/50',
                'bg-muted/30',
                'opacity-40',
                'grayscale',
              ]
            )}>
              <Icon className={cn(
                'h-7 w-7 transition-transform duration-300',
                unlocked ? 'text-foreground group-hover:scale-110' : 'text-muted-foreground'
              )} />
            </div>

            {unlocked && rarity === 'legendary' && (
              <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-br from-yellow-400/20 to-orange-400/20" />
            )}

            {!unlocked && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">?</span>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{title}</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', config.labelBg)}>
                {config.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
            {unlocked && unlockedAt && (
              <p className="text-[10px] text-muted-foreground/70">
                Débloqué le {unlockedAt}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
