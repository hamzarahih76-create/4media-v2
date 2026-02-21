import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileVideo, 
  ExternalLink, 
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Loader2,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { TaskDelivery, ClientFeedback } from '@/types/workflow';

interface DeliveryVersionListProps {
  taskId: string;
  videoId?: string; // If provided, fetch from video_deliveries instead
  className?: string;
}

interface DeliveryWithFeedback extends TaskDelivery {
  feedback?: ClientFeedback | null;
  reviewToken?: string | null;
}

const linkTypeIcons: Record<string, string> = {
  drive: '📁',
  frame: '🎬',
  dropbox: '📦',
  other: '🔗',
};

export function DeliveryVersionList({ taskId, videoId, className }: DeliveryVersionListProps) {
  const [deliveries, setDeliveries] = useState<DeliveryWithFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      let deliveriesData: any[] = [];

      if (videoId) {
        // Fetch from video_deliveries
        const { data, error } = await supabase
          .from('video_deliveries')
          .select('*')
          .eq('video_id', videoId)
          .order('version_number', { ascending: false });

        if (error) throw error;
        
        // Map video_deliveries to TaskDelivery format
        deliveriesData = (data || []).map(d => ({
          ...d,
          task_id: taskId, // Use parent task_id for compatibility
        }));
      } else {
        // Fetch from task_deliveries (legacy)
        const { data, error } = await supabase
          .from('task_deliveries')
          .select('*')
          .eq('task_id', taskId)
          .order('version_number', { ascending: false });

        if (error) throw error;
        deliveriesData = data || [];
      }

      // Fetch review links and feedback for each delivery
      const deliveriesWithInfo = await Promise.all(
        deliveriesData.map(async (delivery) => {
          // Get active review link (check both tables)
          let reviewToken: string | null = null;
          let feedback: any = null;

          if (videoId) {
            // Check video_review_links
            const { data: reviewLink } = await supabase
              .from('video_review_links')
              .select('token')
              .eq('delivery_id', delivery.id)
              .eq('is_active', true)
              .maybeSingle();
            reviewToken = reviewLink?.token || null;

            // Get video_feedback
            const { data: feedbackData } = await supabase
              .from('video_feedback')
              .select('*')
              .eq('delivery_id', delivery.id)
              .maybeSingle();
            feedback = feedbackData || null;
          } else {
            // Check review_links (legacy)
            const { data: reviewLink } = await supabase
              .from('review_links')
              .select('token')
              .eq('delivery_id', delivery.id)
              .eq('is_active', true)
              .maybeSingle();
            reviewToken = reviewLink?.token || null;

            // Get client_feedback
            const { data: feedbackData } = await supabase
              .from('client_feedback')
              .select('*')
              .eq('delivery_id', delivery.id)
              .maybeSingle();
            feedback = feedbackData || null;
          }

          return {
            ...delivery,
            reviewToken,
            feedback,
          } as DeliveryWithFeedback;
        })
      );

      setDeliveries(deliveriesWithInfo);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [taskId, videoId]);

  const handleSubmitForReview = async (deliveryId: string) => {
    setSubmittingId(deliveryId);
    try {
      let result: { success: boolean; token: string; review_link_id: string };

      if (videoId) {
        // Use the video-specific function
        const { data, error } = await supabase
          .rpc('submit_video_for_review' as any, { p_delivery_id: deliveryId });

        if (error) throw error;
        result = data as { success: boolean; token: string; review_link_id: string };
      } else {
        // Use the legacy task function
        const { data, error } = await supabase
          .rpc('submit_for_review', { p_delivery_id: deliveryId });

        if (error) throw error;
        result = data as { success: boolean; token: string; review_link_id: string };
      }

      const reviewUrl = `${window.location.origin}/review/${result.token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(reviewUrl);
      
      toast.success('Lien de revue copié !', {
        description: 'Partagez ce lien avec le client pour validation.',
      });

      fetchDeliveries();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setSubmittingId(null);
    }
  };

  const copyReviewLink = async (token: string) => {
    const reviewUrl = `${window.location.origin}/review/${token}`;
    await navigator.clipboard.writeText(reviewUrl);
    toast.success('Lien copié !');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileVideo className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune version uploadée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileVideo className="h-4 w-4" />
          Versions livrées
          <Badge variant="secondary" className="ml-auto">
            {deliveries.length} version{deliveries.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deliveries.map((delivery, index) => (
          <div key={delivery.id}>
            {index > 0 && <Separator className="my-3" />}
            <div className="flex items-start gap-3">
              {/* Version badge */}
              <div className={cn(
                'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm',
                delivery.feedback?.decision === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : delivery.feedback?.decision === 'revision_requested'
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-muted text-muted-foreground'
              )}>
                v{delivery.version_number}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {delivery.delivery_type === 'link' ? (
                    <a
                      href={delivery.external_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {linkTypeIcons[delivery.link_type || 'other']}
                      <span className="truncate max-w-[150px]">
                        {delivery.link_type === 'drive' ? 'Google Drive' :
                         delivery.link_type === 'frame' ? 'Frame.io' :
                         delivery.link_type === 'dropbox' ? 'Dropbox' : 'Lien externe'}
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium flex items-center gap-1">
                      <FileVideo className="h-3.5 w-3.5" />
                      Fichier uploadé
                    </span>
                  )}
                  
                  {/* Status indicator */}
                  {delivery.feedback && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        delivery.feedback.decision === 'approved'
                          ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                          : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                      )}
                    >
                      {delivery.feedback.decision === 'approved' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approuvé
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Révision
                        </>
                      )}
                    </Badge>
                  )}
                  
                  {delivery.reviewToken && !delivery.feedback && (
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-500 bg-blue-500/10">
                      <Clock className="h-3 w-3 mr-1" />
                      En revue
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {format(new Date(delivery.submitted_at), 'd MMM à HH:mm', { locale: fr })}
                </p>

                {delivery.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    "{delivery.notes}"
                  </p>
                )}

                {/* Feedback display */}
                {delivery.feedback && (
                  <div className={cn(
                    'mt-2 p-2 rounded-md text-xs',
                    delivery.feedback.decision === 'approved'
                      ? 'bg-emerald-500/10'
                      : 'bg-amber-500/10'
                  )}>
                    {delivery.feedback.rating && (
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3 w-3',
                              i < delivery.feedback!.rating!
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {delivery.feedback.feedback_text && (
                      <p className="text-muted-foreground">
                        {delivery.feedback.feedback_text}
                      </p>
                    )}
                    {delivery.feedback.revision_notes && (
                      <p className="text-amber-600 mt-1 font-medium">
                        À corriger: {delivery.feedback.revision_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions supprimées - l'éditeur ne peut pas envoyer directement au client, seul l'admin peut valider et envoyer */}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
