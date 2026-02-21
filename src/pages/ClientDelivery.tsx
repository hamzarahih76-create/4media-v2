import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Play, 
  CheckCircle, 
  Star,
  Loader2,
  ExternalLink,
  FileVideo,
  Edit3,
  AlertTriangle,
  Sparkles,
  Heart,
  Crown,
  PartyPopper,
  Wand2,
  Gift,
  Zap,
  Download,
  Cloud,
  Send,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Helper to capitalize each word in a string
const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
import logo from '@/assets/4media-logo-transparent.png';
import InstagramReelFrame from '@/components/delivery/InstagramReelFrame';
import PremiumVideoPlayer, { PremiumVideoPlayerRef } from '@/components/delivery/PremiumVideoPlayer';
import { AudioRecorder } from '@/components/delivery/AudioRecorder';
import { ImageUploader } from '@/components/delivery/ImageUploader';
import { ConfirmationPopup } from '@/components/delivery/ConfirmationPopup';
// Audio now uses Supabase Storage for instant playback (Cloudflare Stream was too slow)

interface DeliveryData {
  videoTitle: string;
  clientName: string;
  projectName: string;
  versionNumber: number;
  deliveryType: string;
  externalLink: string | null;
  filePath: string | null;
  cloudflareStreamId: string | null;
  notes: string | null;
  status: string;
  submittedAt: string;
  videoId: string;
  deliveryId: string;
  reviewLinkId: string;
  taskId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  review_client: {
    label: 'En attente de votre avis',
    color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0',
    icon: <Sparkles className="h-4 w-4" />,
  },
  revision_requested: {
    label: 'Révision en cours',
    color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0',
    icon: <Edit3 className="h-4 w-4" />,
  },
  completed: {
    label: 'Validée ✨',
    color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0',
    icon: <Crown className="h-4 w-4" />,
  },
};

// Floating particle component
const FloatingParticle = ({ delay, duration, size, left }: { delay: number; duration: number; size: number; left: number }) => (
  <div
    className="absolute rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 blur-sm pointer-events-none"
    style={{
      width: size,
      height: size,
      left: `${left}%`,
      animation: `float ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  />
);

// Confetti piece for celebration
const ConfettiPiece = ({ delay, color, left }: { delay: number; color: string; left: number }) => (
  <div
    className="absolute w-3 h-3 rounded-sm pointer-events-none"
    style={{
      backgroundColor: color,
      left: `${left}%`,
      top: '-20px',
      animation: `confetti-fall 3s ease-out forwards`,
      animationDelay: `${delay}s`,
    }}
  />
);

export default function ClientDelivery() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [cloudflareIframeUrl, setCloudflareIframeUrl] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'horizontal' | 'vertical'>('vertical');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [revisionAudioBlob, setRevisionAudioBlob] = useState<Blob | null>(null);
  const [revisionImages, setRevisionImages] = useState<File[]>([]);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>('video.mp4');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showProcessingDialog, setShowProcessingDialog] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  
  // Ref for video player control
  const videoPlayerRef = useRef<PremiumVideoPlayerRef>(null);

  useEffect(() => {
    const fetchDeliveryData = async () => {
      if (!videoId) return;

      try {
        const { data: response, error } = await supabase.functions.invoke('get-delivery-signed-url', {
          body: { videoId, fetchFullData: true }
        });

        if (error || !response) {
          console.error('Error fetching delivery data:', error);
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        if (response.error) {
          console.error('Edge function error:', response.error);
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        const { video, delivery, reviewLink, signedUrl, hasExistingFeedback, cloudflarePlayback, clientLogoUrl: logoUrl } = response;
        
        if (logoUrl) setClientLogoUrl(logoUrl);

        if (!video || !delivery) {
          console.error('Missing video or delivery data');
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        const reviewableStatuses = ['review_client', 'revision_requested'];
        const isCompleted = video.status === 'completed';
        const isReviewable = reviewableStatuses.includes(video.status);

        if (!isCompleted && !isReviewable) {
          console.error('Video not in reviewable state:', video.status);
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        if (!isCompleted && reviewLink) {
          if (new Date(reviewLink.expires_at) < new Date()) {
            setIsInvalid(true);
            setIsLoading(false);
            return;
          }
        }

        // Handle Cloudflare Stream playback
        if (cloudflarePlayback?.iframeUrl) {
          setCloudflareIframeUrl(cloudflarePlayback.iframeUrl);
        } else if (signedUrl) {
          setSignedVideoUrl(signedUrl);
        }

        if (isCompleted || hasExistingFeedback) {
          setHasSubmitted(true);
        }

        setDeliveryData({
          videoTitle: video.title || 'Vidéo',
          clientName: video.client_name || '',
          projectName: video.project_name || '',
          versionNumber: delivery.version_number || 1,
          deliveryType: delivery.delivery_type || 'link',
          externalLink: delivery.external_link,
          filePath: delivery.file_path,
          cloudflareStreamId: delivery.cloudflare_stream_id || null,
          notes: delivery.notes,
          status: isCompleted ? 'completed' : video.status,
          submittedAt: delivery.submitted_at,
          videoId: video.id,
          deliveryId: delivery.id,
          reviewLinkId: reviewLink?.id || '',
          taskId: video.task_id || '',
        });

      } catch (error) {
        console.error('Error fetching delivery data:', error);
        setIsInvalid(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveryData();
  }, [videoId]);

  // Trigger confirmation popup when hasSubmitted changes to true
  useEffect(() => {
    if (hasSubmitted) {
      setShowConfirmationPopup(true);
    }
  }, [hasSubmitted]);

  const handleDownload = async () => {
    if (!deliveryData || deliveryData.status !== 'completed') {
      toast.error('La vidéo doit être validée pour télécharger');
      return;
    }

    // IMPORTANT: Close ALL popups first to avoid overlapping modals
    setShowConfirmationPopup(false);
    setShowDownloadModal(false);
    
    // Wait for popups to close completely
    await new Promise(resolve => setTimeout(resolve, 300));

    // Now show download modal
    setDownloadUrl(null); // Reset download URL
    setIsDownloading(true);
    setShowDownloadModal(true);
    setDownloadProgress(10);

    try {
      console.log('Starting download for video:', deliveryData.videoId);
      setDownloadProgress(20);
      
      const { data, error } = await supabase.functions.invoke('cloudflare-stream-download', {
        body: { 
          videoId: deliveryData.videoId,
          token: deliveryData.reviewLinkId 
        }
      });

      setDownloadProgress(60);
      console.log('Download response:', data, error);

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Échec de la connexion au serveur');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || data?.message || 'Échec du téléchargement');
      }

      if (!data.downloadUrl) {
        throw new Error('URL de téléchargement non disponible');
      }

      console.log('Download URL received:', data.downloadUrl);
      setDownloadProgress(80);
      
      // Small delay to show progress animation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setDownloadUrl(data.downloadUrl);
      setDownloadFileName(data.fileName || 'video.mp4');
      setDownloadProgress(100);

    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Erreur lors du téléchargement');
      // Don't close modal on error, show retry option instead
    } finally {
      setIsDownloading(false);
    }
  };

  const handleActualDownload = () => {
    if (downloadUrl) {
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Téléchargement lancé !');
    }
  };

  const handleSubmitFeedback = async (decision: 'approved' | 'revision_requested') => {
    if (!deliveryData || !deliveryData.reviewLinkId) return;
    
    if (decision === 'revision_requested' && !revisionNotes.trim() && !revisionAudioBlob && revisionImages.length === 0) {
      toast.error('Veuillez indiquer les modifications souhaitées (texte, audio ou images)');
      return;
    }

    // Show processing dialog immediately for better UX
    setShowProcessingDialog(true);
    setProcessingComplete(false);
    setIsSubmitting(true);

    try {
      let revisionAudioPath: string | null = null;
      let imagePaths: string[] = [];

      // Upload audio and images in PARALLEL for better performance
      if (decision === 'revision_requested') {
        const uploadPromises: Promise<void>[] = [];

        // Audio upload to Supabase Storage (instant playback, no encoding delay)
        if (revisionAudioBlob) {
          setIsUploadingAudio(true);
          const audioPromise = (async () => {
            const audioFileName = `revision-audio/${deliveryData.videoId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('deliveries')
              .upload(audioFileName, revisionAudioBlob, {
                contentType: 'audio/webm',
                upsert: false,
              });
            if (!uploadError && uploadData) {
              revisionAudioPath = uploadData.path;
              console.log('Audio uploaded to Supabase Storage:', revisionAudioPath);
            } else {
              console.error('Audio upload error:', uploadError);
            }
          })();
          uploadPromises.push(audioPromise);
        }

        // Image uploads promise (all images in parallel to Supabase Storage)
        if (revisionImages.length > 0) {
          setIsUploadingImages(true);
          const imagePromises = revisionImages.map(async (image, index) => {
            const ext = image.name.split('.').pop() || 'jpg';
            const imageFileName = `revision-images/${deliveryData.videoId}/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('deliveries')
              .upload(imageFileName, image, {
                contentType: image.type,
                upsert: false,
              });
            if (!uploadError && uploadData) {
              return uploadData.path;
            }
            console.error('Image upload error:', uploadError);
            return null;
          });
          
          const imagesPromise = Promise.all(imagePromises).then(paths => {
            imagePaths = paths.filter((p): p is string => p !== null);
          });
          uploadPromises.push(imagesPromise);
        }

        // Wait for all uploads to complete in parallel
        await Promise.all(uploadPromises);
        setIsUploadingAudio(false);
        setIsUploadingImages(false);
      }

      const { error: feedbackError } = await supabase
        .from('video_feedback')
        .insert({
          review_link_id: deliveryData.reviewLinkId,
          video_id: deliveryData.videoId,
          delivery_id: deliveryData.deliveryId,
          decision,
          rating: rating > 0 ? rating : null,
          feedback_text: feedbackText || null,
          revision_notes: decision === 'revision_requested' ? revisionNotes : null,
          revision_audio_path: revisionAudioPath,
          revision_images: imagePaths.length > 0 ? imagePaths : null,
          reviewed_by: reviewerName || 'Client',
        });

      if (feedbackError) throw feedbackError;

      const newStatus = decision === 'approved' ? 'completed' : 'revision_requested';
      await supabase
        .from('videos')
        .update({ 
          status: newStatus,
          is_validated: decision === 'approved',
          ...(decision === 'approved' && { 
            completed_at: new Date().toISOString(),
            validated_at: new Date().toISOString()
          }),
          ...(decision === 'revision_requested' && {
            revision_count: (deliveryData.status === 'revision_requested' ? 1 : 0) + 1
          })
        })
        .eq('id', deliveryData.videoId);

      await supabase
        .from('video_review_links')
        .update({ is_active: false })
        .eq('id', deliveryData.reviewLinkId);

      try {
        await supabase.functions.invoke('notify-client-feedback', {
          body: {
            videoId: deliveryData.videoId,
            videoTitle: deliveryData.videoTitle,
            clientName: deliveryData.clientName || reviewerName || 'Client',
            decision,
            feedbackText: feedbackText || null,
            revisionNotes: decision === 'revision_requested' ? revisionNotes : null,
            rating: rating > 0 ? rating : null,
            hasAudio: !!revisionAudioPath,
            hasImages: imagePaths.length > 0,
          }
        });
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
      }

      // Mark processing as complete
      setProcessingComplete(true);
      
      if (decision === 'approved') {
        setShowCelebration(true);
        // Update local status for download button
        setDeliveryData(prev => prev ? { ...prev, status: 'completed' } : null);
      }
      
      setHasSubmitted(true);
      setRevisionAudioBlob(null);
      setRevisionImages([]);
      
      // Keep processing dialog open for 2 seconds to show success
      setTimeout(() => {
        setShowProcessingDialog(false);
        toast.success(
          decision === 'approved' 
            ? '🎉 Vidéo approuvée avec succès !' 
            : '✅ Demande de modifications envoyée avec succès !'
        );
      }, 2000);
      
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      setShowProcessingDialog(false);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
      setIsUploadingAudio(false);
      setIsUploadingImages(false);
    }
  };

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const aspectRatio = video.videoWidth / video.videoHeight;
    const format = aspectRatio < 1 ? 'vertical' : 'horizontal';
    setVideoAspectRatio(format);
  };

  const handleTogglePlay = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.togglePlay();
    }
  };

  const renderVideoPlayer = () => {
    if (!deliveryData) return null;

    // Cloudflare Stream - use Premium player with iframe fallback
    if (cloudflareIframeUrl) {
      return (
        <PremiumVideoPlayer
          ref={videoPlayerRef}
          src=""
          iframeUrl={cloudflareIframeUrl}
          onPlayStateChange={setIsVideoPlaying}
          onMetadataLoaded={(isVertical) => setVideoAspectRatio(isVertical ? 'vertical' : 'horizontal')}
          hideControls
        />
      );
    }

    // Local signed URL video player with premium controls
    if (deliveryData.deliveryType === 'file' && signedVideoUrl) {
      return (
        <PremiumVideoPlayer
          ref={videoPlayerRef}
          src={signedVideoUrl}
          onPlayStateChange={setIsVideoPlaying}
          onMetadataLoaded={(isVertical) => setVideoAspectRatio(isVertical ? 'vertical' : 'horizontal')}
          hideControls
        />
      );
    }

    // External link embed
    if (deliveryData.deliveryType === 'link' && deliveryData.externalLink) {
      const url = deliveryData.externalLink;

      const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
      if (driveMatch) {
        return (
          <iframe
            src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
            className="w-full h-full"
            allow="autoplay"
            allowFullScreen
          />
        );
      }

      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      if (youtubeMatch) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }

      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }

      const loomMatch = url.match(/loom\.com\/share\/([^?]+)/);
      if (loomMatch) {
        return (
          <iframe
            src={`https://www.loom.com/embed/${loomMatch[1]}`}
            className="w-full h-full"
            allowFullScreen
          />
        );
      }

      const frameMatch = url.match(/frame\.io\/v\/([^?]+)/);
      if (frameMatch) {
        return (
          <iframe
            src={`https://app.frame.io/reviews/${frameMatch[1]}`}
            className="w-full h-full"
            allowFullScreen
          />
        );
      }

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 text-white/70 hover:text-white transition-colors"
        >
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Play className="h-10 w-10" />
          </div>
          <span className="text-sm font-medium flex items-center gap-1">
            Ouvrir la vidéo <ExternalLink className="h-4 w-4" />
          </span>
        </a>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3 text-white/50">
        <FileVideo className="h-16 w-16" />
        <span className="text-sm">Vidéo non disponible</span>
      </div>
    );
  };

  // Loading state - Magic style
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Wand2 className="h-10 w-10 text-white animate-bounce" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-white/90 text-lg font-medium">Préparation de votre vidéo...</p>
            <p className="text-white/50 text-sm">Un instant de magie ✨</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid or expired - Magic style
  if (isInvalid || !deliveryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 blur-xl rounded-3xl" />
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <AlertTriangle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Lien expiré</h1>
            <p className="text-white/60 text-lg">
              Ce lien de livraison n'est plus actif. Contactez l'équipe 4Media pour obtenir un nouveau lien.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[deliveryData.status] || statusConfig.review_client;
  const confettiColors = ['#10b981', '#14b8a6', '#22c55e', '#34d399', '#6ee7b7', '#a7f3d0'];
  const isVideoValidated = deliveryData.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 relative overflow-hidden">
      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 0 50px rgba(16, 185, 129, 0.7), 0 0 100px rgba(16, 185, 129, 0.4); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .magic-glow {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #ffffff 0%, #6ee7b7 25%, #ffffff 50%, #6ee7b7 75%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-emerald-500/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-teal-400/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-emerald-400/15 rounded-full blur-[150px]" />
        <div className="absolute top-20 right-1/3 w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-40 left-1/3 w-[250px] h-[250px] bg-white/10 rounded-full blur-[60px]" />
        
        {[...Array(12)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 1.5}
            duration={15 + Math.random() * 10}
            size={20 + Math.random() * 40}
            left={Math.random() * 100}
          />
        ))}
      </div>

      {/* Confetti for celebration */}
      {showCelebration && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <ConfettiPiece
              key={i}
              delay={Math.random() * 2}
              color={confettiColors[i % confettiColors.length]}
              left={Math.random() * 100}
            />
          ))}
        </div>
      )}

      {/* Premium Header with glass effect */}
      <header className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="4Media" className="h-14 [filter:brightness(0)_invert(1)]" />
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white font-medium backdrop-blur-sm"
                onClick={() => navigate('/client/videos')}
              >
                ← Retour au dashboard
              </Button>
            )}
          </div>
          <Badge className={cn('gap-2 px-5 py-2.5 font-semibold shadow-xl text-base', currentStatus.color)}>
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto p-4 py-10 space-y-10">
        {/* Video title section - Premium styling */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-white/10 to-white/5 border border-white/20 backdrop-blur-xl shadow-2xl">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <span className="text-white text-sm font-semibold tracking-wide">Livraison vidéo exclusive</span>
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          
          {deliveryData.clientName && (
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight drop-shadow-2xl">
              {toTitleCase(deliveryData.clientName)}
            </h1>
          )}
          
          <p className="text-2xl md:text-3xl text-white/90 font-medium tracking-wide">
            {deliveryData.videoTitle}
          </p>
          
          {deliveryData.projectName && (
            <div className="flex justify-center">
              <span className="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium backdrop-blur-sm">
                {deliveryData.projectName}
              </span>
            </div>
          )}
        </div>

        {/* Video player - Clean premium frame */}
        <div className={cn(
          "mx-auto",
          videoAspectRatio === 'vertical' ? 'max-w-md' : 'w-full max-w-4xl'
        )}>
            <div className="relative group">
            {/* Premium glow effect - subtle emerald/white */}
            <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/30 via-white/20 to-emerald-500/30 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            
            <div className="relative">
              <InstagramReelFrame 
                key="instagram-reel-frame"
                clientName={toTitleCase(deliveryData.clientName || 'Client')}
                profileImageUrl={clientLogoUrl}
                isVertical={videoAspectRatio === 'vertical'}
                videoUrl={cloudflareIframeUrl || signedVideoUrl || deliveryData.externalLink}
                isPlaying={isVideoPlaying}
                onTogglePlay={handleTogglePlay}
                hidePlayButton={!!cloudflareIframeUrl} // Hide custom button for Cloudflare videos (they have native controls)
              >
                <div className={cn(
                  "w-full h-full flex items-center justify-center",
                  videoAspectRatio === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'
                )}>
                  {renderVideoPlayer()}
                </div>
              </InstagramReelFrame>
            </div>
          </div>
          
          {/* Version and date info - OUTSIDE the Reel frame for clean design */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl text-white font-medium text-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Version {deliveryData.versionNumber}
            </span>
            <span className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl text-white/70 text-sm border border-white/10">
              {format(new Date(deliveryData.submittedAt), 'd MMMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>

        {/* Already submitted - Show minimal state, popup handles celebration */}
        {hasSubmitted ? (
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-40" />
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-10 text-center">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Votre avis a été enregistré</h2>
              <p className="text-white/60 text-base max-w-md mx-auto mb-6">
                Merci pour votre retour ! Cliquez ci-dessous pour revoir les détails.
              </p>
              <Button
                onClick={() => setShowConfirmationPopup(true)}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-lg shadow-emerald-500/30"
              >
                <Sparkles className="h-5 w-5" />
                {isVideoValidated ? 'Télécharger ma vidéo' : 'Voir le message'}
              </Button>
            </div>
          </div>
        ) : (
          /* Premium Feedback form */
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-emerald-500/20 rounded-3xl blur-xl opacity-30" />
            <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-8 py-8 bg-gradient-to-r from-white/5 to-emerald-500/10 border-b border-white/10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Votre avis nous est précieux</h2>
                    <p className="text-white/60 text-base">Validez ou demandez des ajustements</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex flex-col sm:flex-row gap-5">
                  <Button
                    variant="outline"
                    className="flex-1 h-20 gap-4 rounded-2xl border-2 border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300 group backdrop-blur-sm"
                    onClick={() => setShowRevisionDialog(true)}
                    disabled={isSubmitting}
                  >
                    <Edit3 className="h-7 w-7 text-white/80 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-lg">Demander des modifications</span>
                  </Button>
                  
                  <div className="relative flex-1 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
                    <Button
                      className="relative w-full h-20 gap-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-0 transition-all duration-300 shadow-xl"
                      onClick={() => setShowApprovalDialog(true)}
                      disabled={isSubmitting}
                    >
                      <CheckCircle className="h-7 w-7" />
                      <span className="font-bold text-lg">J'adore, je valide ! ✨</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revision Dialog */}
        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
          <DialogContent className="bg-slate-900/95 border-amber-500/30 backdrop-blur-xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-400" />
                Demander des modifications
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Décrivez les ajustements que vous souhaitez apporter à la vidéo.
                <span className="block mt-2 text-amber-400/80 font-medium">
                  ⚠️ N'oubliez aucune modification, soyez le plus précis possible !
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Ex: Le logo n'est pas visible à la fin, la musique est trop forte, je souhaiterais modifier le texte à 0:45..."
                className="min-h-[120px] bg-slate-800/50 border-amber-500/30 text-white placeholder:text-white/40 focus:border-amber-500/50 focus:ring-amber-500/20"
                rows={4}
              />
              
              {/* Audio recorder */}
              <div className="pt-2 border-t border-amber-500/20">
                <AudioRecorder
                  onAudioRecorded={setRevisionAudioBlob}
                  audioBlob={revisionAudioBlob}
                  onRemoveAudio={() => setRevisionAudioBlob(null)}
                  maxDurationSeconds={120}
                />
              </div>

              {/* Image uploader */}
              <div className="pt-2 border-t border-amber-500/20">
                <ImageUploader
                  images={revisionImages}
                  onImagesChange={setRevisionImages}
                  maxImages={5}
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowRevisionDialog(false);
                  setRevisionAudioBlob(null);
                  setRevisionImages([]);
                }}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  setShowRevisionDialog(false);
                  handleSubmitFeedback('revision_requested');
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={(!revisionNotes.trim() && !revisionAudioBlob && revisionImages.length === 0) || isSubmitting || isUploadingAudio || isUploadingImages}
              >
                {isSubmitting || isUploadingAudio || isUploadingImages ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Edit3 className="h-4 w-4 mr-2" />
                )}
                {isUploadingAudio ? 'Upload audio...' : isUploadingImages ? 'Upload images...' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="bg-slate-900/95 border-emerald-500/30 backdrop-blur-xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Star className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                Donnez votre avis
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Avant de valider, partagez votre expérience avec nous !
                <span className="block mt-2 text-emerald-400/80 font-medium">
                  ⭐ La notation et l'avis sont obligatoires
                </span>
              </DialogDescription>
            </DialogHeader>
            
            {/* Star Rating */}
            <div className="space-y-3">
              <Label className="text-white/80">Votre note</Label>
              <div className="flex gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-transform hover:scale-110"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star 
                      className={cn(
                        "h-10 w-10 transition-colors",
                        (hoverRating || rating) >= star 
                          ? "text-yellow-400 fill-yellow-400" 
                          : "text-white/30"
                      )} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Text */}
            <div className="space-y-2">
              <Label className="text-white/80">Votre avis</Label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Dites-nous ce que vous avez aimé dans cette vidéo..."
                className="min-h-[100px] bg-slate-800/50 border-emerald-500/30 text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                rows={4}
              />
            </div>
            
            <DialogFooter className="gap-2 sm:gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setShowApprovalDialog(false)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  setShowApprovalDialog(false);
                  handleSubmitFeedback('approved');
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                disabled={rating === 0 || !feedbackText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Valider la vidéo ✨
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Download Modal - Fullscreen Overlay */}
        {showDownloadModal && (
          <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            
            <div className="relative z-10 text-center space-y-8 p-8 max-w-lg mx-auto">
              {isDownloading ? (
                <>
                  <div className="relative mx-auto">
                    <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full animate-pulse" />
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto">
                      <Loader2 className="h-16 w-16 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-white">Préparation du téléchargement...</h2>
                    <p className="text-white/60 text-lg">Un instant, nous préparons votre vidéo HD</p>
                  </div>
                  <div className="w-full max-w-xs mx-auto bg-white/10 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </>
              ) : downloadUrl ? (
                <>
                  <div className="relative mx-auto">
                    <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto magic-glow">
                      <Download className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-white">Votre vidéo est prête ! 🎬</h2>
                    <p className="text-white/60 text-lg">Cliquez sur le bouton pour télécharger votre vidéo en qualité HD</p>
                  </div>
                  
                  <div className="space-y-4">
                    <a
                      href={downloadUrl}
                      download={downloadFileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-10 py-4 text-xl font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all"
                    >
                      <Download className="h-7 w-7" />
                      Télécharger maintenant
                    </a>
                    
                    <p className="text-white/40 text-sm">
                      📁 {downloadFileName}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDownloadModal(false);
                      setDownloadUrl(null);
                    }}
                    className="text-white/50 hover:text-white hover:bg-white/10"
                  >
                    Fermer
                  </Button>
                </>
              ) : (
                // Error or waiting state
                <>
                  <div className="relative mx-auto">
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto">
                      <AlertTriangle className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-white">Préparation en cours...</h2>
                    <p className="text-white/60 text-lg">Le téléchargement est en cours de préparation. Réessayez dans quelques instants.</p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      onClick={() => {
                        setShowDownloadModal(false);
                        handleDownload();
                      }}
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                    >
                      <Loader2 className="h-4 w-4" />
                      Réessayer
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowDownloadModal(false)}
                      className="text-white/50 hover:text-white hover:bg-white/10"
                    >
                      Fermer
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Processing Dialog - Shows immediately when submitting */}
        <Dialog open={showProcessingDialog} onOpenChange={() => {}}>
          <DialogContent className="bg-slate-900/98 border-emerald-500/30 backdrop-blur-xl sm:max-w-md">
            <div className="text-center py-8 space-y-6">
              {!processingComplete ? (
                <>
                  {/* Processing state */}
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <Loader2 className="h-12 w-12 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Traitement en cours...</h2>
                    <p className="text-white/60">
                      {isUploadingAudio ? "Upload de l'audio..." : 
                       isUploadingImages ? "Upload des images..." : 
                       "Envoi de votre demande..."}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </>
              ) : (
                <>
                  {/* Success state */}
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <Check className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Envoyé avec succès ! ✨</h2>
                    <p className="text-white/60">
                      Votre demande a été transmise à notre équipe.
                    </p>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Popup - Premium centered modal */}
        <ConfirmationPopup
          open={showConfirmationPopup}
          onClose={() => setShowConfirmationPopup(false)}
          isVideoValidated={isVideoValidated}
          isDownloading={isDownloading}
          onDownload={handleDownload}
        />

        {/* Footer */}
        <footer className="text-center py-10">
          <div className="inline-flex items-center gap-3 text-white/40 text-sm">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <span className="shimmer-text font-medium">Propulsé par 4Media</span>
            <span className="text-white/20">•</span>
            <span>Créé avec passion</span>
            <Sparkles className="h-5 w-5 text-emerald-500" />
          </div>
        </footer>
      </main>
    </div>
  );
}
