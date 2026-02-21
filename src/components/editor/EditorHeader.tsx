import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  editor: {
    name: string;
    avatar?: string;
    totalEarnings?: number;
    averageRating: number;
    totalReviews?: number;
    memberSince: string;
  };
  className?: string;
}

// Financial level thresholds
const financialLevels = [
  { id: 'new', label: 'New', threshold: 0, maxThreshold: 5000 },
  { id: 'level1', label: 'Level 1', threshold: 10000, maxThreshold: 10000 },
  { id: 'level2', label: 'Level 2', threshold: 40000, maxThreshold: 40000 },
  { id: 'level3', label: 'Level 3', threshold: 100000, maxThreshold: 100000 },
];

function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}

function getCurrentLevel(earnings: number) {
  if (earnings >= 100000) return 3;
  if (earnings >= 40000) return 2;
  if (earnings >= 10000) return 1;
  return 0;
}

export function EditorHeader({ editor, className }: EditorHeaderProps) {
  const initials = editor.name.split(' ').map(n => n[0]).join('');
  const totalEarnings = editor.totalEarnings || 0;
  const currentLevelIndex = getCurrentLevel(totalEarnings);

  return (
    <div className={cn(
      'p-5 rounded-xl bg-card border border-border/50',
      className
    )}>
      {/* Profile section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="relative h-16 w-16 border-2 border-border">
            <AvatarImage src={editor.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editor.name}`} />
            <AvatarFallback className="text-lg font-semibold bg-muted">{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold truncate">{editor.name}</h2>
            <Badge variant="secondary" className="text-xs">
              {financialLevels[currentLevelIndex].label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Membre depuis {editor.memberSince}
          </p>
        </div>

        {/* Reviews (star rating) - Only show reviews, NOT revisions */}
        <div className="flex items-center gap-4 sm:gap-6 pt-3 sm:pt-0 sm:border-l sm:border-border/50 sm:pl-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-4 w-4',
                    i < Math.floor(editor.averageRating) 
                      ? 'text-yellow-500 fill-yellow-500' 
                      : 'text-muted-foreground/30'
                  )}
                />
              ))}
            </div>
            <span className="text-lg font-bold">{editor.averageRating.toFixed(1)}</span>
            {editor.totalReviews !== undefined && (
              <span className="text-sm text-muted-foreground">
                ({editor.totalReviews} reviews)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Financial Level Progress Timeline */}
      <div className="mt-5 pt-5 border-t border-border/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">Progression financière</span>
          <span className="text-sm font-semibold text-primary">
            {totalEarnings.toLocaleString('fr-FR')} DH gagnés
          </span>
        </div>
        
        <div className="relative">
          {/* Progress line background */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
          
          {/* Progress line filled */}
          <div 
            className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
            style={{ 
              width: `${Math.min((currentLevelIndex / (financialLevels.length - 1)) * 100, 100)}%` 
            }}
          />
          
          {/* Level steps */}
          <div className="relative flex justify-between">
            {financialLevels.map((level, index) => {
              const isCompleted = index < currentLevelIndex;
              const isCurrent = index === currentLevelIndex;
              const isFuture = index > currentLevelIndex;
              
              return (
                <div key={level.id} className="flex flex-col items-center">
                  {/* Step circle */}
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all z-10',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
                    isFuture && 'bg-muted border-border text-muted-foreground'
                  )}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index === 0 ? '★' : index
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={cn(
                    'mt-2 text-xs font-medium',
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {level.label}
                  </span>
                  
                  {/* Amount */}
                  <span className={cn(
                    'text-xs',
                    isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'
                  )}>
                    {index === 0 
                      ? `0-${formatAmount(level.maxThreshold)} DH`
                      : `${formatAmount(level.threshold)} DH`
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
