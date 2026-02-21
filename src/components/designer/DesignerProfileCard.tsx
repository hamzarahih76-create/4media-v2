import { motion } from 'framer-motion';
import { Star, Sparkles, TrendingUp, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const financialLevels = [
  { id: 'new', label: 'New', threshold: 0, maxThreshold: 15000 },
  { id: 'level1', label: 'Level 1', threshold: 15000, maxThreshold: 15000 },
  { id: 'level2', label: 'Level 2', threshold: 45000, maxThreshold: 45000 },
  { id: 'level3', label: 'Level 3', threshold: 120000, maxThreshold: 120000 },
  { id: 'top', label: 'Top Level', threshold: 500000, maxThreshold: 500000 },
];

function formatAmount(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}

function getCurrentLevel(earnings: number) {
  if (earnings >= 500000) return 4;
  if (earnings >= 120000) return 3;
  if (earnings >= 45000) return 2;
  if (earnings >= 15000) return 1;
  return 0;
}

interface DesignerProfileCardProps {
  name: string;
  avatarUrl: string | null;
  rating: number;
  totalDesigns: number;
  level?: number;
  totalEarnings?: number;
}

export function DesignerProfileCard({ 
  name, 
  avatarUrl, 
  rating, 
  totalDesigns,
  level = 1,
  totalEarnings = 0
}: DesignerProfileCardProps) {
  const currentLevelIndex = getCurrentLevel(totalEarnings);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Gradient background with glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-500/10 to-cyan-400/5" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-teal-400/15 rounded-full blur-2xl" />
      
      {/* Glass card */}
      <div className="relative backdrop-blur-xl bg-card/80 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-6">
          {/* Avatar with ring */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-md opacity-50" />
            <Avatar className="h-24 w-24 ring-4 ring-emerald-500/30 relative">
              <AvatarImage src={avatarUrl || ''} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-bold">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Level badge */}
            <motion.div 
              className="absolute -bottom-1 -right-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              Niv. {level}
            </motion.div>
          </motion.div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {name}
              </h2>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-5 w-5 text-emerald-500" />
              </motion.div>
            </div>
            <p className="text-muted-foreground mb-3">Designer · 4Media</p>
            
            <div className="flex items-center gap-4">
              {/* Rating badge */}
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 px-3 py-1"
              >
                <Star className="h-3.5 w-3.5 mr-1.5 fill-amber-500 text-amber-500" />
                {rating.toFixed(1)}/5
              </Badge>
              
              {/* Designs count */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-foreground">{totalDesigns}</span>
                <span>designs livrés</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Level Progress Timeline */}
        <div className="mt-5 pt-5 border-t border-emerald-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Progression financière</span>
            <span className="text-sm font-semibold text-emerald-500">
              {totalEarnings.toLocaleString('fr-FR')} DH gagnés
            </span>
          </div>
          
          <div className="relative">
            {/* Progress line background */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
            
            {/* Progress line filled */}
            <div 
              className="absolute top-4 left-0 h-0.5 bg-emerald-500 transition-all duration-500"
              style={{ 
                width: `${Math.min((currentLevelIndex / (financialLevels.length - 1)) * 100, 100)}%` 
              }}
            />
            
            {/* Level steps */}
            <div className="relative flex justify-between">
              {financialLevels.map((lvl, index) => {
                const isCompleted = index < currentLevelIndex;
                const isCurrent = index === currentLevelIndex;
                const isFuture = index > currentLevelIndex;
                
                return (
                  <div key={lvl.id} className="flex flex-col items-center">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all z-10',
                      isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                      isCurrent && 'bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-500/20',
                      isFuture && 'bg-muted border-border text-muted-foreground'
                    )}>
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index === 0 ? '★' : index
                      )}
                    </div>
                    
                    <span className={cn(
                      'mt-2 text-xs font-medium',
                      (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {lvl.label}
                    </span>
                    
                    <span className={cn(
                      'text-xs',
                      isCurrent ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'
                    )}>
                      {index === 0 
                        ? `0 DH`
                        : `${formatAmount(lvl.threshold)} DH`
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
