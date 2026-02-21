import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MiniProfileCardProps {
  editor: {
    name: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  };
  className?: string;
}

const rankConfig = {
  bronze: { label: 'Bronze', color: 'from-amber-600 to-amber-800' },
  silver: { label: 'Argent', color: 'from-slate-400 to-slate-500' },
  gold: { label: 'Or', color: 'from-yellow-400 to-amber-500' },
  platinum: { label: 'Platine', color: 'from-cyan-300 to-cyan-500' },
  diamond: { label: 'Diamant', color: 'from-violet-400 to-purple-600' },
};

export function MiniProfileCard({ editor, className }: MiniProfileCardProps) {
  const xpProgress = (editor.xp / editor.xpToNextLevel) * 100;
  const rank = rankConfig[editor.rank];
  const initials = editor.name.split(' ').map(n => n[0]).join('');

  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50', className)}>
      {/* Avatar with level badge */}
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${editor.name}`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className={cn(
          'absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br shadow-lg',
          rank.color
        )}>
          {editor.level}
        </div>
      </div>

      {/* Name and XP */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{editor.name}</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium bg-gradient-to-r text-white',
            rank.color
          )}>
            {rank.label}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={xpProgress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {editor.xp} / {editor.xpToNextLevel} XP
          </span>
        </div>
      </div>
    </div>
  );
}
