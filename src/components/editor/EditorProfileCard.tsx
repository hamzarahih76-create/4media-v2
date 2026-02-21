import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flame, Star, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorProfileCardProps {
  editor: {
    name: string;
    avatar?: string;
    role: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    streak: number;
    rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  };
  className?: string;
}

const rankConfig = {
  bronze: { 
    label: 'Bronze', 
    color: 'from-amber-600 to-amber-800',
    bg: 'bg-amber-500/10',
    text: 'text-amber-500'
  },
  silver: { 
    label: 'Silver', 
    color: 'from-slate-400 to-slate-600',
    bg: 'bg-slate-400/10',
    text: 'text-slate-400'
  },
  gold: { 
    label: 'Gold', 
    color: 'from-yellow-400 to-yellow-600',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500'
  },
  platinum: { 
    label: 'Platinum', 
    color: 'from-cyan-400 to-cyan-600',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500'
  },
  diamond: { 
    label: 'Diamond', 
    color: 'from-violet-400 to-violet-600',
    bg: 'bg-violet-500/10',
    text: 'text-violet-500'
  },
};

export function EditorProfileCard({ editor, className }: EditorProfileCardProps) {
  const rank = rankConfig[editor.rank];
  const xpProgress = (editor.xp / editor.xpToNextLevel) * 100;

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl bg-card border border-border/50',
      'p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5',
      className
    )}>
      {/* Gradient accent top */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
        rank.color
      )} />

      <div className="flex items-start gap-5">
        {/* Avatar with level ring */}
        <div className="relative">
          <div className={cn(
            'absolute -inset-1 rounded-full bg-gradient-to-br opacity-75',
            rank.color
          )} />
          <Avatar className="relative h-16 w-16 border-2 border-background">
            <AvatarImage src={editor.avatar} alt={editor.name} />
            <AvatarFallback className="text-lg font-semibold bg-muted">
              {editor.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            'absolute -bottom-1 -right-1 h-7 w-7 rounded-full',
            'flex items-center justify-center text-xs font-bold',
            'bg-gradient-to-br shadow-lg',
            rank.color,
            'text-white'
          )}>
            {editor.level}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold truncate">{editor.name}</h3>
            <Badge variant="secondary" className={cn('text-xs', rank.bg, rank.text)}>
              <Trophy className="h-3 w-3 mr-1" />
              {rank.label}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">{editor.role}</p>

          {/* XP Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Level {editor.level}</span>
              <span className="font-medium">
                <span className="text-primary">{editor.xp.toLocaleString()}</span>
                <span className="text-muted-foreground"> / {editor.xpToNextLevel.toLocaleString()} XP</span>
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500',
                  rank.color
                )}
                style={{ width: `${xpProgress}%` }}
              />
              <div 
                className="absolute inset-y-0 left-0 rounded-full bg-white/20 animate-pulse"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-5 pt-5 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="font-semibold">{editor.streak} jours</p>
            <p className="text-xs text-muted-foreground">Série active</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold">+{Math.round(xpProgress)}%</p>
            <p className="text-xs text-muted-foreground">Vers niveau {editor.level + 1}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm ml-auto">
          <div className="flex -space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < 4 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                )}
              />
            ))}
          </div>
          <span className="text-sm font-medium">4.8</span>
        </div>
      </div>
    </div>
  );
}
