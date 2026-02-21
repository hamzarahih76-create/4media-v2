import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Download, 
  CheckCircle, 
  XCircle, 
  Star,
  Loader2,
  ExternalLink,
  FileVideo,
  Calendar,
  AlertTriangle,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReviewData {
  taskTitle: string;
  clientName: string;
  projectName: string;
  versionNumber: number;
  deliveryType: string;
  externalLink: string | null;
  filePath: string | null;
  notes: string | null;
  deadline: string | null;
  submittedAt: string;
  taskId: string;
  videoId: string | null; // For video reviews
  deliveryId: string;
  reviewLinkId: string;
  isVideoReview: boolean; // To know which tables to use for feedback
}

export default function ClientReview() {
  const { token } = useParams<{ token: string }>();
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);

  useEffect(() => {
    const fetchReviewData = async () => {
      if (!token) return;

      try {
        // First, try to find in video_review_links (new system)
        const { data: videoReviewLink, error: videoLinkError } = await supabase
          .from('video_review_links')
          .select('*, video_deliveries(*), videos(*)')
          .eq('token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (!videoLinkError && videoReviewLink) {
          // Found in video_review_links
          if (new Date(videoReviewLink.expires_at) < new Date()) {
            setIsExpired(true);
            return;
          }

          // Check if already reviewed
          const { data: existingFeedback } = await supabase
            .from('video_feedback')
            .select('id')
            .eq('review_link_id', videoReviewLink.id)
            .maybeSingle();

          if (existingFeedback) {
            setHasSubmitted(true);
          }

          // Increment view count
          await supabase
            .from('video_review_links')
            .update({ 
              views_count: videoReviewLink.views_count + 1,
              last_viewed_at: new Date().toISOString()
            })
            .eq('id', videoReviewLink.id);

          const delivery = videoReviewLink.video_deliveries;
          const video = videoReviewLink.videos;

          // Get task info for client name
          let taskInfo = null;
          if (video?.task_id) {
            const { data: task } = await supabase
              .from('tasks')
              .select('*')
              .eq('id', video.task_id)
              .maybeSingle();
            taskInfo = task;
          }

          setReviewData({
            taskTitle: video?.title || 'Vidéo',
            clientName: taskInfo?.client_name || '',
            projectName: taskInfo?.title || '',
            versionNumber: delivery?.version_number || 1,
            deliveryType: delivery?.delivery_type || 'link',
            externalLink: delivery?.external_link,
            filePath: delivery?.file_path,
            notes: delivery?.notes,
            deadline: video?.deadline,
            submittedAt: delivery?.submitted_at || videoReviewLink.created_at,
            taskId: video?.task_id || '',
            videoId: videoReviewLink.video_id,
            deliveryId: videoReviewLink.delivery_id,
            reviewLinkId: videoReviewLink.id,
            isVideoReview: true,
          });
          setIsLoading(false);
          return;
        }

        // Fallback: try to find in review_links (legacy task system)
        const { data: reviewLink, error: linkError } = await supabase
          .from('review_links')
          .select('*, task_deliveries(*), tasks(*)')
          .eq('token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (linkError) throw linkError;

        if (!reviewLink) {
          setIsExpired(true);
          return;
        }

        // Check if expired
        if (new Date(reviewLink.expires_at) < new Date()) {
          setIsExpired(true);
          return;
        }

        // Check if already reviewed
        const { data: existingFeedback } = await supabase
          .from('client_feedback')
          .select('id')
          .eq('review_link_id', reviewLink.id)
          .maybeSingle();

        if (existingFeedback) {
          setHasSubmitted(true);
        }

        // Increment view count
        await supabase
          .from('review_links')
          .update({ 
            views_count: reviewLink.views_count + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', reviewLink.id);

        const delivery = reviewLink.task_deliveries;
        const task = reviewLink.tasks;

        setReviewData({
          taskTitle: task?.title || 'Vidéo',
          clientName: task?.client_name || '',
          projectName: task?.project_name || '',
          versionNumber: delivery?.version_number || 1,
          deliveryType: delivery?.delivery_type || 'link',
          externalLink: delivery?.external_link,
          filePath: delivery?.file_path,
          notes: delivery?.notes,
          deadline: task?.deadline,
          submittedAt: delivery?.submitted_at || reviewLink.created_at,
          taskId: reviewLink.task_id,
          videoId: null,
          deliveryId: reviewLink.delivery_id,
          reviewLinkId: reviewLink.id,
          isVideoReview: false,
        });
      } catch (error) {
        console.error('Error fetching review data:', error);
        setIsExpired(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewData();
  }, [token]);

  const MAX_FEEDBACK_LENGTH = 5000;
  const MAX_NAME_LENGTH = 100;
  const MAX_NOTES_LENGTH = 5000;

  const handleSubmitFeedback = async (decision: 'approved' | 'revision_requested') => {
    if (!reviewData) return;
    
    if (decision === 'revision_requested' && !revisionNotes.trim()) {
      toast.error('Veuillez indiquer les modifications souhaitées');
      return;
    }

    // Validate input lengths
    if (feedbackText.length > MAX_FEEDBACK_LENGTH) {
      toast.error(`Le commentaire ne doit pas dépasser ${MAX_FEEDBACK_LENGTH} caractères`);
      return;
    }
    if (revisionNotes.length > MAX_NOTES_LENGTH) {
      toast.error(`Les notes de révision ne doivent pas dépasser ${MAX_NOTES_LENGTH} caractères`);
      return;
    }
    if (reviewerName.length > MAX_NAME_LENGTH) {
      toast.error(`Le nom ne doit pas dépasser ${MAX_NAME_LENGTH} caractères`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (reviewData.isVideoReview && reviewData.videoId) {
        // Insert video feedback
        const { error: feedbackError } = await supabase
          .from('video_feedback')
          .insert({
            review_link_id: reviewData.reviewLinkId,
            video_id: reviewData.videoId,
            delivery_id: reviewData.deliveryId,
            decision,
            rating: rating > 0 ? rating : null,
            feedback_text: feedbackText || null,
            revision_notes: decision === 'revision_requested' ? revisionNotes : null,
            reviewed_by: reviewerName || null,
          });

        if (feedbackError) throw feedbackError;

        // Update video status
        const newStatus = decision === 'approved' ? 'completed' : 'revision_requested';
        await supabase
          .from('videos')
          .update({ 
            status: newStatus,
            is_validated: decision === 'approved',
            ...(decision === 'approved' && { 
              completed_at: new Date().toISOString(),
              validated_at: new Date().toISOString()
            })
          })
          .eq('id', reviewData.videoId);

        // Deactivate review link
        await supabase
          .from('video_review_links')
          .update({ is_active: false })
          .eq('id', reviewData.reviewLinkId);
      } else {
        // Insert task feedback (legacy)
        const { error: feedbackError } = await supabase
          .from('client_feedback')
          .insert({
            review_link_id: reviewData.reviewLinkId,
            task_id: reviewData.taskId,
            delivery_id: reviewData.deliveryId,
            decision,
            rating: rating > 0 ? rating : null,
            feedback_text: feedbackText || null,
            revision_notes: decision === 'revision_requested' ? revisionNotes : null,
            reviewed_by: reviewerName || null,
          });

        if (feedbackError) throw feedbackError;

        // Update task status
        const newStatus = decision === 'approved' ? 'completed' : 'revision_requested';
        await supabase
          .from('tasks')
          .update({ 
            status: newStatus,
            ...(decision === 'approved' && { completed_at: new Date().toISOString() })
          })
          .eq('id', reviewData.taskId);

        // Deactivate review link
        await supabase
          .from('review_links')
          .update({ is_active: false })
          .eq('id', reviewData.reviewLinkId);
      }

      setHasSubmitted(true);
      toast.success(
        decision === 'approved' 
          ? 'Vidéo approuvée !' 
          : 'Demande de révision envoyée'
      );
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileUrl = async () => {
    if (!reviewData?.filePath) return null;
    
    const { data } = await supabase.storage
      .from('deliveries')
      .createSignedUrl(reviewData.filePath, 3600); // 1 hour
    
    return data?.signedUrl;
  };

  const handleDownload = async () => {
    if (reviewData?.deliveryType === 'link' && reviewData.externalLink) {
      window.open(reviewData.externalLink, '_blank');
    } else if (reviewData?.filePath) {
      const url = await getFileUrl();
      if (url) window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isExpired || !reviewData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h1 className="text-xl font-semibold mb-2">Lien expiré ou invalide</h1>
            <p className="text-muted-foreground">
              Ce lien de revue n'est plus valide. Veuillez contacter l'équipe pour obtenir un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
            <h1 className="text-xl font-semibold mb-2">Merci pour votre retour !</h1>
            <p className="text-muted-foreground">
              Votre avis a bien été enregistré. L'équipe a été notifiée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{reviewData.taskTitle}</h1>
          <p className="text-muted-foreground">
            {reviewData.clientName && <span>{reviewData.clientName}</span>}
            {reviewData.projectName && <span> • {reviewData.projectName}</span>}
          </p>
        </div>

        {/* Video preview card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  Version {reviewData.versionNumber}
                </CardTitle>
                <CardDescription>
                  Soumis le {format(new Date(reviewData.submittedAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        <CardContent>
            {/* Video embed or link */}
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
              {reviewData.deliveryType === 'link' && reviewData.externalLink ? (
                (() => {
                  const url = reviewData.externalLink;
                  // Google Drive embed
                  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
                  if (driveMatch) {
                    const fileId = driveMatch[1];
                    return (
                      <iframe
                        src={`https://drive.google.com/file/d/${fileId}/preview`}
                        className="w-full h-full"
                        allow="autoplay"
                        allowFullScreen
                      />
                    );
                  }
                  // YouTube embed
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
                  // Vimeo embed
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
                  // Loom embed
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
                  // Fallback: show play button to open external link
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Play className="h-16 w-16" />
                      <span className="text-sm font-medium flex items-center gap-1">
                        Ouvrir la vidéo <ExternalLink className="h-4 w-4" />
                      </span>
                    </a>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <FileVideo className="h-16 w-16" />
                  <Button onClick={handleDownload} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger la vidéo
                  </Button>
                </div>
              )}
            </div>


            {/* Download button for links too */}
            {reviewData.deliveryType === 'link' && (
              <Button 
                onClick={handleDownload} 
                variant="outline" 
                className="w-full mt-4 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir dans un nouvel onglet
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Feedback form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Votre avis</CardTitle>
            <CardDescription>
              Validez la vidéo ou demandez des modifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
                onClick={() => setShowRevisionDialog(true)}
                disabled={isSubmitting}
              >
                <Edit3 className="h-4 w-4" />
                Demander des modifications
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600"
                onClick={() => handleSubmitFeedback('approved')}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                J'adore, je valide ! ✨
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-500" />
              Demander des modifications
            </DialogTitle>
            <DialogDescription>
              Décrivez les ajustements que vous souhaitez apporter à la vidéo.
              <span className="block mt-2 text-amber-500 font-medium">
                ⚠️ N'oubliez aucune modification, soyez le plus précis possible !
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="Ex: Le logo n'est pas visible à la fin, la musique est trop forte, je souhaiterais modifier le texte à 0:45..."
            className="min-h-[140px]"
            rows={5}
            maxLength={5000}
          />
          
          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowRevisionDialog(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={() => {
                setShowRevisionDialog(false);
                handleSubmitFeedback('revision_requested');
              }}
              className="bg-amber-500 hover:bg-amber-600"
              disabled={!revisionNotes.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Edit3 className="h-4 w-4 mr-2" />
              )}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
