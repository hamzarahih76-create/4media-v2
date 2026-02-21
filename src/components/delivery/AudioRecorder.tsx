import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  audioBlob: Blob | null;
  onRemoveAudio: () => void;
  maxDurationSeconds?: number;
}

export function AudioRecorder({
  onAudioRecorded,
  audioBlob,
  onRemoveAudio,
  maxDurationSeconds = 120, // 2 minutes max
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  // Create audio URL when blob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        onAudioRecorded(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDurationSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRemove = () => {
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onRemoveAudio();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [audioUrl]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mic className="h-4 w-4" />
        <span>Message vocal (optionnel)</span>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Recording state */}
      {isRecording && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {formatTime(recordingTime)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>
          
          {/* Simple audio visualizer */}
          <div className="flex-1 flex items-center justify-center gap-0.5 h-6">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-amber-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 50}ms`,
                  animationDuration: '300ms',
                }}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-1"
          >
            <Square className="h-3 w-3 fill-current" />
            Arrêter
          </Button>
        </div>
      )}

      {/* Has recording */}
      {!isRecording && audioBlob && audioUrl && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Audio enregistré ({formatTime(recordingTime)})
            </p>
            <audio ref={audioRef} src={audioUrl} className="hidden" />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* No recording - show start button */}
      {!isRecording && !audioBlob && (
        <Button
          type="button"
          variant="outline"
          onClick={startRecording}
          className={cn(
            "w-full gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10",
            "dark:text-amber-400 dark:hover:bg-amber-500/10"
          )}
        >
          <Mic className="h-4 w-4" />
          Enregistrer un message vocal
        </Button>
      )}
    </div>
  );
}
