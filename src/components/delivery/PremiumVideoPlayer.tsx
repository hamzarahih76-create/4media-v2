import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

export interface PremiumVideoPlayerRef {
  togglePlay: () => void;
  isPlaying: boolean;
  skip: (seconds: number) => void;
}

interface PremiumVideoPlayerProps {
  src: string;
  iframeUrl?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onMetadataLoaded?: (isVertical: boolean) => void;
  onVideoEnd?: () => void;
  className?: string;
  hideControls?: boolean;
}

const PremiumVideoPlayer = forwardRef<PremiumVideoPlayerRef, PremiumVideoPlayerProps>(({
  src,
  iframeUrl,
  onPlayStateChange,
  onMetadataLoaded,
  onVideoEnd,
  className,
  hideControls = false,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();
  const isCloudflareStream = !!iframeUrl;

  // Handle play/pause - works for both native video and Cloudflare iframe
  const togglePlay = useCallback(() => {
    if (isCloudflareStream) {
      // For Cloudflare Stream, we toggle the internal state
      // The iframe has autoplay disabled, so we control via state and re-render
      const newState = !isPlaying;
      setIsPlaying(newState);
      onPlayStateChange?.(newState);
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying, isCloudflareStream, onPlayStateChange]);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  }, [duration]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    togglePlay,
    isPlaying,
    skip,
  }), [togglePlay, isPlaying, skip]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Handle volume change
  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  // Handle seek
  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show controls temporarily
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      setShowControls(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      onVideoEnd?.();
      setShowControls(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      const isVertical = video.videoHeight > video.videoWidth;
      onMetadataLoaded?.(isVertical);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onPlayStateChange, onMetadataLoaded, onVideoEnd]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // If using iframe (Cloudflare Stream), render with native controls
  // Cloudflare Stream iframes cannot be controlled programmatically via postMessage
  // So we enable native controls and let users interact directly with the player
  if (iframeUrl) {
    // Add parameters for better player experience
    const iframeSrcWithParams = iframeUrl.includes('?') 
      ? `${iframeUrl}&autoplay=false&preload=metadata&muted=false&controls=true&primaryColor=10b981`
      : `${iframeUrl}?autoplay=false&preload=metadata&muted=false&controls=true&primaryColor=10b981`;
      
    return (
      <div className={cn("relative w-full h-full", className)}>
        <iframe
          ref={iframeRef}
          src={iframeSrcWithParams}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Hide the default play overlay if hideControls is true (parent handles it)
  const showPlayOverlay = !isPlaying && !isBuffering && !hideControls;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black group cursor-pointer",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        playsInline
        webkit-playsinline="true"
        preload="metadata"
      />

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {showPlayOverlay && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-transform hover:scale-110"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          >
            <Play className="h-10 w-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg [&_.relative]:h-1 [&_.absolute]:bg-emerald-500"
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" fill="white" />
              ) : (
                <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
              )}
            </button>

            {/* Rewind 10s */}
            <button
              onClick={() => skip(-10)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Reculer de 10s"
            >
              <RotateCcw className="h-4 w-4 text-white" />
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => skip(10)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Avancer de 10s"
            >
              <RotateCw className="h-4 w-4 text-white" />
            </button>

            {/* Time display */}
            <span className="text-white/80 text-sm font-medium tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white" />
                )}
              </button>
              <div className="w-20 opacity-0 group-hover/volume:opacity-100 transition-opacity">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.05}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_.relative]:h-1 [&_.absolute]:bg-emerald-500"
                />
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-white" />
              ) : (
                <Maximize className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PremiumVideoPlayer.displayName = 'PremiumVideoPlayer';

export default PremiumVideoPlayer;
