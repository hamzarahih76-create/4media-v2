import { Banknote, CheckCircle2, Gift, Sparkles, Lock, Unlock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BonusTier {
  videos: number;
  bonus: number;
}

interface MonthlyBonusCardProps {
  currentVideos: number;
  tiers: BonusTier[];
  basePayPerVideo?: number;
  currency?: string;
  selectedMonth: Date;
  className?: string;
}

export function MonthlyBonusCard({ 
  currentVideos, 
  tiers, 
  basePayPerVideo = 100,
  currency = 'DH',
  selectedMonth,
  className 
}: MonthlyBonusCardProps) {
  const sortedTiers = [...tiers].sort((a, b) => a.videos - b.videos);
  const maxVideos = sortedTiers[sortedTiers.length - 1]?.videos || 80;
  const monthName = format(selectedMonth, 'MMMM yyyy', { locale: fr });
  
  // Calculate current bonus (highest tier reached)
  const currentTier = sortedTiers.filter(t => currentVideos >= t.videos).pop();
  const currentBonus = currentTier?.bonus || 0;
  
  // Calculate payments
  const basePay = currentVideos * basePayPerVideo;
  const totalPay = basePay + currentBonus;
  
  // Progress calculation
  const progress = Math.min((currentVideos / maxVideos) * 100, 100);
  const isMaxReached = currentVideos >= maxVideos;

  // Next milestone
  const nextTier = sortedTiers.find(t => currentVideos < t.videos);
  const videosToNextTier = nextTier ? nextTier.videos - currentVideos : 0;

  return (
    <div className={cn(
      'p-5 rounded-xl bg-card border border-border/50',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center',
            isMaxReached ? 'bg-emerald-500/10' : 'bg-emerald-500/10'
          )}>
            {isMaxReached ? (
              <Award className="h-5 w-5 text-emerald-500" />
            ) : (
              <Banknote className="h-5 w-5 text-emerald-500" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold">Rémunération mensuelle</h3>
            <p className="text-sm text-muted-foreground capitalize">{monthName}</p>
          </div>
        </div>
        <span className={cn(
          'text-lg font-bold',
          isMaxReached ? 'text-emerald-500' : 'text-foreground'
        )}>
          {currentVideos} vidéos
        </span>
      </div>

      {/* TOTAL GAGNÉ - Main Focus (Very Big) */}
      <div className="flex flex-col items-center justify-center py-6 mb-5 rounded-xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-emerald-600/5 border border-emerald-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Gift className={cn(
            'h-6 w-6 text-emerald-500',
            currentBonus > 0 && 'animate-pulse'
          )} />
          <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">
            Total gagné
          </span>
        </div>
        <span className={cn(
          'text-5xl font-black tracking-tight transition-all duration-500',
          isMaxReached ? 'text-emerald-500' : 'text-foreground'
        )}>
          {totalPay.toLocaleString()} {currency}
        </span>
        
        {/* Calculation breakdown */}
        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <span className="font-medium">{currentVideos} × {basePayPerVideo} {currency}</span>
          <span>=</span>
          <span className="font-semibold text-foreground">{basePay.toLocaleString()} {currency}</span>
          {currentBonus > 0 && (
            <>
              <span>+</span>
              <span className="font-bold text-emerald-500">{currentBonus.toLocaleString()} {currency}</span>
            </>
          )}
        </div>
      </div>

      {/* Bonus Unlocked Banner */}
      {currentBonus > 0 && currentTier && (
        <div className="flex items-center justify-center gap-3 py-3 mb-5 rounded-lg bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          <div className="text-center">
            <p className="text-lg font-black text-amber-500 uppercase tracking-wide">
              Bonus débloqué : +{currentBonus.toLocaleString()} {currency}
            </p>
            <p className="text-xs text-amber-600/80">
              Palier {currentTier.videos} vidéos atteint !
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
        </div>
      )}

      {/* Next milestone hint */}
      {nextTier && (
        <div className="text-center mb-4 text-sm">
          <span className="text-muted-foreground">Plus que </span>
          <span className="font-bold text-primary">{videosToNextTier} vidéos</span>
          <span className="text-muted-foreground"> pour débloquer </span>
          <span className="font-bold text-amber-500">+{nextTier.bonus} {currency}</span>
        </div>
      )}

      {/* Progress bar with milestones */}
      <div className="relative mb-3">
        <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all duration-700 ease-out rounded-full',
              isMaxReached 
                ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500' 
                : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Milestone markers on the bar */}
        {sortedTiers.map((tier, index) => {
          const position = (tier.videos / maxVideos) * 100;
          const isReached = currentVideos >= tier.videos;
          const isMaxTier = index === sortedTiers.length - 1;
          
          return (
            <div
              key={tier.videos}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div className={cn(
                'rounded-full border-2 transition-all duration-500',
                isMaxTier ? 'w-5 h-5' : 'w-4 h-4',
                isReached 
                  ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                  : 'bg-muted-foreground/20 border-muted-foreground/30',
                isReached && 'animate-bounce'
              )}>
                {isReached && (
                  <CheckCircle2 className={cn(
                    'text-white',
                    isMaxTier ? 'h-4 w-4 -mt-0.5' : 'h-3 w-3 -mt-0.5'
                  )} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Milestone labels */}
      <div className="relative h-20 mt-3">
        {/* Start point (0) */}
        <div className="absolute left-0 flex flex-col items-center">
          <span className="text-sm font-bold text-muted-foreground">0</span>
        </div>
        
        {sortedTiers.map((tier, index) => {
          const position = (tier.videos / maxVideos) * 100;
          const isReached = currentVideos >= tier.videos;
          const isMaxTier = index === sortedTiers.length - 1;
          
          return (
            <div
              key={tier.videos}
              className="absolute flex flex-col items-center transition-all duration-500"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              {/* Lock/Unlock icon */}
              <div className={cn(
                'mb-1 transition-all duration-500',
                isReached && 'animate-bounce'
              )}>
                {isReached ? (
                  <Unlock className={cn(
                    'text-emerald-500',
                    isMaxTier ? 'h-5 w-5' : 'h-4 w-4'
                  )} />
                ) : (
                  <Lock className={cn(
                    'text-muted-foreground/40',
                    isMaxTier ? 'h-5 w-5' : 'h-4 w-4'
                  )} />
                )}
              </div>
              
              {/* Milestone number */}
              <span className={cn(
                'font-black leading-tight transition-all duration-500',
                isMaxTier ? 'text-2xl' : 'text-xl',
                isReached 
                  ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                  : 'text-muted-foreground'
              )}>
                {tier.videos}
              </span>
              
              {/* Bonus text */}
              <span className={cn(
                'font-bold leading-tight transition-all duration-500',
                isMaxTier ? 'text-sm' : 'text-xs',
                isReached 
                  ? 'text-emerald-500' 
                  : 'text-muted-foreground/50'
              )}>
                +{tier.bonus.toLocaleString()} {currency}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
