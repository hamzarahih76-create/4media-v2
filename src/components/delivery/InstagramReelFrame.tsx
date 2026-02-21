import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music2, Download, Copy, Flag, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface InstagramReelFrameProps {
  clientName: string;
  profileImageUrl?: string | null;
  children: React.ReactNode;
  isVertical?: boolean;
  videoUrl?: string | null;
  onDownload?: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  hidePlayButton?: boolean;
}

// Target counts - realistic engagement numbers
const TARGET_LIKES = 13200;
const TARGET_COMMENTS = 435;

// Simulation duration in ms (4 minutes for gradual progression)
const SIMULATION_DURATION_MS = 240000;

// Format number for display (e.g., 13.2k)
const formatCount = (count: number): string => {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
};

// Floating heart component with smooth upward animation
const FloatingHeart = ({ 
  id, 
  left, 
  size, 
  delay,
  duration,
  onComplete 
}: { 
  id: number; 
  left: number; 
  size: 'small' | 'normal' | 'large';
  delay: number;
  duration: number;
  onComplete: (id: number) => void;
}) => {
  const sizeClass = size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-7 w-7' : 'h-5 w-5';
  
  useEffect(() => {
    const timeout = setTimeout(() => onComplete(id), (duration + delay) * 1000);
    return () => clearTimeout(timeout);
  }, [id, duration, delay, onComplete]);
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        bottom: '100px',
        animation: `heart-float ${duration}s ease-out forwards`,
        animationDelay: `${delay}s`,
      }}
    >
      <Heart className={cn(sizeClass, 'text-red-500 fill-red-500 drop-shadow-lg')} />
    </div>
  );
};

export default function InstagramReelFrame({ 
  clientName, 
  profileImageUrl,
  children, 
  isVertical = true, 
  videoUrl, 
  onDownload, 
  isPlaying = false, 
  onTogglePlay,
  hidePlayButton = false
}: InstagramReelFrameProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<Array<{
    id: number;
    left: number;
    size: 'small' | 'normal' | 'large';
    delay: number;
    duration: number;
  }>>([]);
  
  // Auto-start counters after a short delay (simulates engagement)
  const [countersStarted, setCountersStarted] = useState(false);
  
  // Start counters automatically after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setCountersStarted(true);
    }, 1500); // Start after 1.5 seconds
    return () => clearTimeout(timer);
  }, []);
  
  // Use countersStarted for animations instead of video playing state
  const effectiveIsPlaying = countersStarted;
  
  // Refs for tracking accumulated playback time
  const accumulatedTimeRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const heartIdRef = useRef(0);

  // Smooth counter progression synced with video playback
  useEffect(() => {
    const updateInterval = 60; // Update every 60ms for smooth increments

    const tick = () => {
      const now = Date.now();
      
      if (effectiveIsPlaying) {
        // Calculate elapsed time since last tick
        if (lastTickRef.current !== null) {
          accumulatedTimeRef.current += now - lastTickRef.current;
        }
        lastTickRef.current = now;
      } else {
        // Reset last tick when paused
        lastTickRef.current = null;
      }

      // Calculate progress (0 to 1)
      const progress = Math.min(accumulatedTimeRef.current / SIMULATION_DURATION_MS, 1);
      
      // Smooth easeOutCubic for natural growth
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      // Update counters
      const newLikes = Math.floor(easedProgress * TARGET_LIKES);
      const newComments = Math.floor(easedProgress * TARGET_COMMENTS);
      
      setLikeCount(newLikes);
      setCommentCount(newComments);
    };

    const timer = setInterval(tick, updateInterval);
    return () => clearInterval(timer);
  }, [effectiveIsPlaying]);

  // Continuous floating hearts during playback - subtle and professional
  // Continuous floating hearts - simple straight up movement, 1-2 per second
  useEffect(() => {
    if (!effectiveIsPlaying) return;

    const createHeart = () => {
      const newHeart = {
        id: heartIdRef.current++,
        left: 82 + Math.random() * 12,
        size: 'normal' as const,
        delay: 0,
        duration: 2.5,
      };
      setFloatingHearts(prev => [...prev.slice(-10), newHeart]);
    };

    // Create 1-2 hearts per second (every 600-800ms)
    const interval = setInterval(createHeart, 650);

    return () => {
      clearInterval(interval);
    };
  }, [effectiveIsPlaying]);

  const handleHeartComplete = useCallback((id: number) => {
    setFloatingHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      setLikeCount(prev => prev + 1);
      // Burst of hearts on like
      const sizes: Array<'small' | 'normal' | 'large'> = ['small', 'normal', 'large'];
      const burstHearts = Array.from({ length: 5 }, () => ({
        id: heartIdRef.current++,
        left: 75 + Math.random() * 18,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        delay: Math.random() * 0.2,
        duration: 2 + Math.random() * 1,
      }));
      setFloatingHearts(prev => [...prev, ...burstHearts]);
    }
  };

  // Get initials from client name
  const initials = clientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleDownload = async () => {
    if (videoUrl) {
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clientName.replace(/\s+/g, '_')}_video.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Téléchargement démarré !');
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Erreur lors du téléchargement');
      }
    } else if (onDownload) {
      onDownload();
    } else {
      toast.error('Vidéo non disponible au téléchargement');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Lien copié !');
  };

  // Show social elements (likes, comments) always for the Instagram experience
  const showSocialElements = true;

  return (
    <div 
      className={cn(
        "relative bg-black rounded-3xl shadow-2xl",
        isVertical ? "aspect-[9/16]" : "aspect-video"
      )}
      style={{ overflow: 'hidden' }}
    >
      {/* CSS for simple straight-up heart animation */}
      <style>{`
        @keyframes heart-float {
          0% { 
            transform: translateY(0); 
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          90% {
            opacity: 0.8;
          }
          100% { 
            transform: translateY(-350px); 
            opacity: 0; 
          }
        }
        @keyframes music-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes subtle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>

      {/* Video content */}
      <div className="absolute inset-0">
        {children}
      </div>

      {/* Native video controls are used - no custom play button needed */}

      {/* Top header with profile - responsive */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/60 via-black/30 to-transparent z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Profile picture with Instagram gradient */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={clientName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[10px] sm:text-xs font-bold">{initials}</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-xs sm:text-sm flex items-center gap-1">
                @{clientName.toLowerCase().replace(/\s+/g, '_')}
                <span className="text-blue-400">✓</span>
              </p>
              <p className="text-white/60 text-[10px] sm:text-xs">Vidéo originale</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Right sidebar - Action buttons - responsive - contained within frame */}
      <div 
        className={cn(
          "absolute right-2 sm:right-3 bottom-20 sm:bottom-24 flex flex-col items-center gap-3 sm:gap-4 z-10 transition-all duration-500",
          showSocialElements ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
        )}
      >
        {/* Like button */}
        <button 
          onClick={handleLike}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={cn(
            "transition-transform duration-200",
            isLiked && "animate-[subtle-pulse_0.4s_ease-out]"
          )}>
            <Heart 
              className={cn(
                "h-6 w-6 sm:h-8 sm:w-8 transition-all duration-200 drop-shadow-md",
                isLiked ? "text-red-500 fill-red-500 scale-110" : "text-white hover:scale-110"
              )} 
            />
          </div>
          <span className="text-white text-[10px] sm:text-xs font-semibold tabular-nums min-w-[3ch] text-center">
            {formatCount(likeCount)}
          </span>
        </button>

        {/* Comment button */}
        <button className="flex flex-col items-center gap-1 group">
          <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="text-white text-[10px] sm:text-xs font-semibold tabular-nums">
            {commentCount}
          </span>
        </button>

        {/* Share button */}
        <button className="flex flex-col items-center gap-1 group">
          <Send className="h-5 w-5 sm:h-7 sm:w-7 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="text-white text-[10px] sm:text-xs font-semibold">Partager</span>
        </button>

        {/* Save button */}
        <button className="flex flex-col items-center gap-1 group">
          <Bookmark className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
        </button>

        {/* Music disc */}
        <div 
          className={cn(
            "mt-1 w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-white/20 overflow-hidden flex items-center justify-center shadow-lg",
            effectiveIsPlaying && "animate-spin"
          )} 
          style={{ animationDuration: '3s' }}
        >
          <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Bottom section - Caption and music - contained within frame */}
      <div 
        className={cn(
          "absolute bottom-12 sm:bottom-14 left-0 right-10 sm:right-14 px-3 py-2 sm:px-4 sm:py-3 z-10 transition-all duration-500 pointer-events-none",
          showSocialElements ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* Username and caption */}
        <div className="mb-2 sm:mb-3">
          <p className="text-white text-xs sm:text-sm leading-relaxed">
            <span className="font-bold">@{clientName.toLowerCase().replace(/\s+/g, '_')}</span>
            {' '}
            <span className="text-white/90">Nouvelle vidéo exclusive ! 🎬✨ #content #video #creative</span>
          </p>
        </div>

        {/* Music info with scrolling text */}
        <div className="flex items-center gap-2 text-white/80">
          <Music2 className="h-3 w-3 flex-shrink-0" />
          <div className="overflow-hidden w-32 sm:w-40">
            <div className={cn(
              "whitespace-nowrap",
              effectiveIsPlaying && "animate-[music-scroll_10s_linear_infinite]"
            )}>
              <span className="text-[10px] sm:text-xs">🎵 Son original - {clientName} • 🎵 Son original - {clientName} • </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating hearts - smooth and subtle */}
      {floatingHearts.map(heart => (
        <FloatingHeart 
          key={heart.id}
          id={heart.id}
          left={heart.left}
          size={heart.size}
          delay={heart.delay}
          duration={heart.duration}
          onComplete={handleHeartComplete}
        />
      ))}
    </div>
  );
}
