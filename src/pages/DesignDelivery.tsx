import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  Star,
  Loader2,
  ExternalLink,
  Edit3,
  Sparkles,
  Crown,
  PartyPopper,
  Download,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
  ImageIcon,
  FileImage,
  ZoomIn,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logo from '@/assets/4media-logo-transparent.png';
import { ImageUploader } from '@/components/delivery/ImageUploader';
import { AudioRecorder } from '@/components/delivery/AudioRecorder';
import { DesignGallerySection } from '@/components/delivery/DesignGallerySection';
 
 const toTitleCase = (str: string) => {
   return str
     .toLowerCase()
     .split(' ')
     .map(word => word.charAt(0).toUpperCase() + word.slice(1))
     .join(' ');
 };
 
 interface DesignDeliveryData {
   taskTitle: string;
   clientName: string | null;
   projectName: string | null;
   status: string;
   taskId: string;
   reviewLinkId: string;
   deliveries: {
     id: string;
     versionNumber: number;
     deliveryType: string;
     externalLink: string | null;
     filePath: string | null;
     fileUrl: string | null;
     notes: string | null;
     submittedAt: string;
   }[];
 }
 
 const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
   in_review: {
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
     label: 'Validé ✨',
     color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0',
     icon: <Crown className="h-4 w-4" />,
   },
 };
 
const FloatingParticle = ({ delay, duration, size, left }: { delay: number; duration: number; size: number; left: number }) => (
    <div
      className="absolute rounded-full bg-gradient-to-br from-emerald-300/20 to-teal-300/20 blur-sm pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
 
 export default function DesignDelivery() {
   const { token } = useParams<{ token: string }>();
   const [deliveryData, setDeliveryData] = useState<DesignDeliveryData | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isInvalid, setIsInvalid] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [rating, setRating] = useState(0);
   const [hoverRating, setHoverRating] = useState(0);
   const [feedbackText, setFeedbackText] = useState('');
   const [revisionNotes, setRevisionNotes] = useState('');
   const [reviewerName, setReviewerName] = useState('');
   const [hasSubmitted, setHasSubmitted] = useState(false);
   const [showCelebration, setShowCelebration] = useState(false);
   const [showRevisionDialog, setShowRevisionDialog] = useState(false);
   const [showApprovalDialog, setShowApprovalDialog] = useState(false);
    const [revisionImages, setRevisionImages] = useState<File[]>([]);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
   const [showProcessingDialog, setShowProcessingDialog] = useState(false);
   const [processingComplete, setProcessingComplete] = useState(false);
 
   useEffect(() => {
     const fetchDeliveryData = async () => {
       if (!token) return;
 
       try {
         // Fetch review link
         const { data: reviewLink, error: linkError } = await supabase
           .from('design_review_links')
           .select('*')
           .eq('token', token)
           .eq('is_active', true)
           .maybeSingle();
 
         if (linkError || !reviewLink) {
           console.error('Review link not found:', linkError);
           setIsInvalid(true);
           setIsLoading(false);
           return;
         }
 
         // Check expiration
         if (new Date(reviewLink.expires_at) < new Date()) {
           setIsInvalid(true);
           setIsLoading(false);
           return;
         }
 
         // Update view count
         await supabase
           .from('design_review_links')
           .update({ 
             views_count: reviewLink.views_count + 1,
             last_viewed_at: new Date().toISOString()
           })
           .eq('id', reviewLink.id);
 
         // Fetch design task
         const { data: task, error: taskError } = await supabase
           .from('design_tasks')
           .select('*')
           .eq('id', reviewLink.design_task_id)
           .single();
 
         if (taskError || !task) {
           console.error('Task not found:', taskError);
           setIsInvalid(true);
           setIsLoading(false);
           return;
         }
 
        // Fetch the specific delivery linked to the review link
        const { data: linkedDelivery } = await supabase
          .from('design_deliveries')
          .select('*')
          .eq('id', reviewLink.delivery_id)
          .single();

        // Extract the item label from the linked delivery (e.g., "[Miniature 2]")
        const linkedLabelMatch = linkedDelivery?.notes?.match(/^\[(.+?)\]/);
        const linkedLabel = linkedLabelMatch ? linkedLabelMatch[1] : null;

        // Fetch only deliveries matching the same item label
        let deliveries: typeof linkedDelivery[] = [];
        if (linkedLabel) {
          const { data: allDeliveries, error: deliveriesError } = await supabase
            .from('design_deliveries')
            .select('*')
            .eq('design_task_id', task.id)
            .order('version_number', { ascending: false });

          if (deliveriesError) {
            console.error('Deliveries error:', deliveriesError);
          }
         // Filter to only deliveries with the same item label
          const matchingDeliveries = (allDeliveries || []).filter(d => {
            const match = d.notes?.match(/^\[(.+?)\]/);
            return match && match[1] === linkedLabel;
          });
          
          if (matchingDeliveries.length > 0) {
            // For carousels (multiple files per item), show all files from the latest batch
            // A "batch" = deliveries submitted within 2 minutes of the latest one
            const latestSubmittedAt = new Date(matchingDeliveries[0].submitted_at).getTime();
            const BATCH_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
            deliveries = matchingDeliveries.filter(d => {
              const diff = latestSubmittedAt - new Date(d.submitted_at).getTime();
              return diff <= BATCH_WINDOW_MS;
            });
          }
        } else if (linkedDelivery) {
          deliveries = [linkedDelivery];
        }
 
         // Check for existing feedback
         const { data: existingFeedback } = await supabase
           .from('design_feedback')
           .select('id')
           .eq('review_link_id', reviewLink.id)
           .maybeSingle();
 
         if (existingFeedback || task.status === 'completed') {
           setHasSubmitted(true);
         }
 
         // Process deliveries with file URLs
         const processedDeliveries = (deliveries || []).map(d => {
           let fileUrl = null;
           if (d.delivery_type === 'file' && d.file_path) {
             const { data } = supabase.storage.from('design-files').getPublicUrl(d.file_path);
             fileUrl = data.publicUrl;
           }
           return {
             id: d.id,
             versionNumber: d.version_number,
             deliveryType: d.delivery_type,
             externalLink: d.external_link,
             filePath: d.file_path,
             fileUrl,
             notes: d.notes,
             submittedAt: d.submitted_at,
           };
         });
 
         setDeliveryData({
           taskTitle: task.title,
           clientName: task.client_name,
           projectName: task.project_name,
           status: task.status === 'completed' ? 'completed' : task.status,
           taskId: task.id,
           reviewLinkId: reviewLink.id,
           deliveries: processedDeliveries,
         });
 
       } catch (error) {
         console.error('Error fetching delivery data:', error);
         setIsInvalid(true);
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchDeliveryData();
   }, [token]);
 
   const handleSubmitFeedback = async (decision: 'approved' | 'revision_requested') => {
     if (!deliveryData) return;
     
     if (decision === 'revision_requested' && !revisionNotes.trim() && revisionImages.length === 0) {
       toast.error('Veuillez indiquer les modifications souhaitées');
       return;
     }
 
     setShowProcessingDialog(true);
     setProcessingComplete(false);
     setIsSubmitting(true);
 
     try {
        let imagePaths: string[] = [];
        let audioPath: string | null = null;

        // Upload audio if provided
        if (decision === 'revision_requested' && audioBlob) {
          const audioFileName = `revision-audio/${deliveryData.taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
          const { data: audioUpload, error: audioError } = await supabase.storage
            .from('design-files')
            .upload(audioFileName, audioBlob, {
              contentType: 'audio/webm',
              upsert: false,
            });
          if (!audioError && audioUpload) {
            audioPath = audioUpload.path;
          } else {
            console.error('Audio upload error:', audioError);
          }
        }

        // Upload revision images
        if (decision === 'revision_requested' && revisionImages.length > 0) {
          const imagePromises = revisionImages.map(async (image, index) => {
            const ext = image.name.split('.').pop() || 'jpg';
            const imageFileName = `revision-images/${deliveryData.taskId}/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('design-files')
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
          
          const paths = await Promise.all(imagePromises);
          imagePaths = paths.filter((p): p is string => p !== null);
        }
 
       // Get latest delivery
       const latestDelivery = deliveryData.deliveries[0];
 
       // Insert feedback
       const { error: feedbackError } = await supabase
         .from('design_feedback')
         .insert({
           review_link_id: deliveryData.reviewLinkId,
           design_task_id: deliveryData.taskId,
           delivery_id: latestDelivery?.id,
           decision,
           rating: rating > 0 ? rating : null,
           feedback_text: feedbackText || null,
           revision_notes: decision === 'revision_requested' ? revisionNotes : null,
            revision_images: imagePaths.length > 0 ? imagePaths : null,
            revision_audio_path: audioPath,
            reviewed_by: reviewerName || 'Client',
         });
 
       if (feedbackError) throw feedbackError;
 
        // Update task status - only mark completed if ALL items are approved
        if (decision === 'approved') {
          // Get task description to know total items
          const { data: taskData } = await supabase
            .from('design_tasks')
            .select('description, design_count')
            .eq('id', deliveryData.taskId)
            .single();

          // Count how many unique item labels have been approved (including this one)
          const { data: allFeedback } = await supabase
            .from('design_feedback')
            .select('delivery_id, decision')
            .eq('design_task_id', deliveryData.taskId)
            .eq('decision', 'approved');

          // Get delivery notes for approved items to find their labels
          const approvedDeliveryIds = (allFeedback || []).map(f => f.delivery_id);
          // Add current delivery
          if (latestDelivery && !approvedDeliveryIds.includes(latestDelivery.id)) {
            approvedDeliveryIds.push(latestDelivery.id);
          }

          const { data: approvedDeliveries } = await supabase
            .from('design_deliveries')
            .select('notes')
            .in('id', approvedDeliveryIds);

          const approvedLabels = new Set<string>();
          for (const d of (approvedDeliveries || [])) {
            const match = d.notes?.match(/^\[(.+?)\]/);
            if (match) approvedLabels.add(match[1]);
          }

          // Parse total items from description
          const desc = taskData?.description || '';
          const descMatch = desc.match(/^\[(.+?)\]/);
          let totalItems = taskData?.design_count || 0;
          if (descMatch && totalItems === 0) {
            const entries = descMatch[1].split('+').map((s: string) => s.trim());
            for (const entry of entries) {
              const countMatch = entry.match(/(\d+)x/);
              if (countMatch) totalItems += parseInt(countMatch[1]);
            }
          }

          const allApproved = totalItems > 0 && approvedLabels.size >= totalItems;

          await supabase
            .from('design_tasks')
            .update({ 
              status: allApproved ? 'completed' : 'in_review',
              designs_completed: approvedLabels.size,
              ...(allApproved && { completed_at: new Date().toISOString() }),
            })
            .eq('id', deliveryData.taskId);
        } else {
          // Revision requested
          await supabase
            .from('design_tasks')
            .update({ status: 'revision_requested' })
            .eq('id', deliveryData.taskId);
        }
 
       // Deactivate review link
       await supabase
         .from('design_review_links')
         .update({ is_active: false })
         .eq('id', deliveryData.reviewLinkId);

        // Send notifications to designer + admins/PMs
        try {
          const { data: task } = await supabase
            .from('design_tasks')
            .select('assigned_to, description')
            .eq('id', deliveryData.taskId)
            .single();

          if (task?.assigned_to) {
            // Extract item label from the latest delivery notes (e.g., "[Miniature 2]")
            const latestNotes = deliveryData.deliveries[0]?.notes || '';
            const itemMatch = latestNotes.match(/^\[(.+?)\]/);
            const itemLabel = itemMatch ? itemMatch[1] : null;
            const projectContext = [deliveryData.projectName, deliveryData.clientName].filter(Boolean).join(' - ');
            const itemContext = itemLabel ? ` (${itemLabel})` : '';

            // Calculate item earnings for approved items
            let itemEarnings = 0;
            if (decision === 'approved' && itemLabel) {
              if (/Carrousel/i.test(itemLabel)) {
                const descMatch = (task.description || '').match(/\[([^\]]+)\]/);
                if (descMatch) {
                  const entries = descMatch[1].split('+').map((s: string) => s.trim());
                  for (const entry of entries) {
                    const cm = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
                    if (cm) { itemEarnings = (parseInt(cm[2]) / 2) * 40; break; }
                  }
                }
                if (itemEarnings === 0) itemEarnings = 80;
              } else {
                itemEarnings = 40;
              }
            } else if (decision === 'approved') {
              itemEarnings = 40;
            }

            const earningsText = decision === 'approved' && itemEarnings > 0 ? ` → +${itemEarnings} DH 💰` : '';

            const notifTitle = decision === 'approved' 
              ? `✅ Design validé par le client${itemContext}${earningsText}`
              : `🔄 Modifications demandées${itemContext}`;
            const notifMessage = decision === 'approved'
              ? `${projectContext} — Le client a validé "${deliveryData.taskTitle}"${itemContext}${rating > 0 ? ` avec une note de ${rating}/5` : ''}. Vous avez gagné ${itemEarnings} DH !`
              : `${projectContext} — Modifications demandées sur "${deliveryData.taskTitle}"${itemContext}: ${revisionNotes || 'Voir les détails'}`;

            await supabase.rpc('create_notification', {
              p_user_id: task.assigned_to,
              p_title: notifTitle,
              p_message: notifMessage,
              p_type: decision === 'approved' ? 'design_approved' : 'design_revision',
              p_link: '/designer',
            });
          }

          const { data: adminUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['admin', 'project_manager']);

          if (adminUsers) {
            const latestNotes2 = deliveryData.deliveries[0]?.notes || '';
            const itemMatch2 = latestNotes2.match(/^\[(.+?)\]/);
            const itemLabel2 = itemMatch2 ? itemMatch2[1] : null;
            const projectCtx = [deliveryData.projectName, deliveryData.clientName].filter(Boolean).join(' - ');
            const itemCtx = itemLabel2 ? ` (${itemLabel2})` : '';

            for (const admin of adminUsers) {
              await supabase.rpc('create_notification', {
                p_user_id: admin.user_id,
                p_title: decision === 'approved' ? `✅ Design validé${itemCtx}` : `🔄 Révision design${itemCtx}`,
                p_message: `${projectCtx} — "${deliveryData.taskTitle}"${itemCtx}: ${decision === 'approved' ? 'Validé' : revisionNotes || 'Modifications demandées'}`,
                p_type: decision === 'approved' ? 'design_approved' : 'design_revision',
                p_link: '/pm',
              });
            }
          }
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
        }

        setProcessingComplete(true);
       
       if (decision === 'approved') {
         setShowCelebration(true);
         setDeliveryData(prev => prev ? { ...prev, status: 'completed' } : null);
       }
       
       setHasSubmitted(true);
       setRevisionImages([]);
       
       setTimeout(() => {
         setShowProcessingDialog(false);
         toast.success(
           decision === 'approved' 
             ? '🎉 Design approuvé avec succès !' 
             : '✅ Demande de modifications envoyée !'
         );
       }, 2000);
       
     } catch (error: any) {
       console.error('Error submitting feedback:', error);
       setShowProcessingDialog(false);
       toast.error(error.message || 'Erreur lors de l\'envoi');
     } finally {
       setIsSubmitting(false);
     }
   };
 
    // Group deliveries by design label, sorted: Miniature first, Post second, Carrousel third
    const groupedDeliveries = useMemo(() => {
      if (!deliveryData) return [];
      const groups: Record<string, typeof deliveryData.deliveries> = {};
      const order: string[] = [];
      for (const d of deliveryData.deliveries) {
        const match = d.notes?.match(/^\[(.+?)\]/);
        const label = match ? match[1] : 'Design';
        if (!groups[label]) {
          groups[label] = [];
          order.push(label);
        }
        groups[label].push(d);
      }
      // Sort: Miniature first, Post second, Carrousel third, others last
      const getPriority = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('miniature')) return 0;
        if (l.includes('post')) return 1;
        if (l.includes('carrousel') || l.includes('carousel')) return 2;
        return 3;
      };
      order.sort((a, b) => getPriority(a) - getPriority(b));
      return order.map(label => ({ label, deliveries: groups[label] }));
    }, [deliveryData]);
    const totalDeliveries = deliveryData?.deliveries.length || 0;
 
   if (isLoading) {
     return (
       <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <Palette className="absolute inset-0 m-auto h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-emerald-700 text-lg font-medium">Chargement du design...</p>
         </div>
       </div>
     );
   }
 
   if (isInvalid || !deliveryData) {
     return (
        <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Lien invalide ou expiré</h1>
            <p className="text-gray-500">
              Ce lien de revue n'est plus actif. Veuillez contacter votre responsable de projet.
            </p>
          </div>
        </div>
     );
   }
 
   const currentStatus = statusConfig[deliveryData.status] || statusConfig.in_review;
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white relative overflow-hidden">
       {/* Floating particles */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <FloatingParticle delay={0} duration={6} size={100} left={10} />
         <FloatingParticle delay={2} duration={8} size={150} left={80} />
         <FloatingParticle delay={4} duration={7} size={80} left={50} />
       </div>
 
       {/* Celebration overlay */}
       {showCelebration && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
             <div className="relative">
               <PartyPopper className="h-24 w-24 text-yellow-400 mx-auto animate-bounce" />
               <div className="absolute -top-4 -right-4">
                 <Sparkles className="h-8 w-8 text-emerald-400 animate-pulse" />
               </div>
             </div>
             <h2 className="text-4xl font-bold text-white">Merci ! 🎉</h2>
             <p className="text-xl text-emerald-300">Votre design a été validé avec succès</p>
             <Button 
               onClick={() => setShowCelebration(false)}
               className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
             >
               Continuer
             </Button>
           </div>
         </div>
       )}
 
       <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
         {/* Header */}
         <div className="text-center mb-8">
           <img src={logo} alt="4Media" className="h-12 mx-auto mb-6 drop-shadow-2xl" />
           <Badge className={cn("mb-4 px-4 py-2 text-sm font-medium gap-2", currentStatus.color)}>
             {currentStatus.icon}
             {currentStatus.label}
           </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {deliveryData.taskTitle}
            </h1>
            {deliveryData.clientName && (
              <p className="text-emerald-600 text-lg">
                Pour {toTitleCase(deliveryData.clientName)}
                {deliveryData.projectName && ` • ${deliveryData.projectName}`}
              </p>
            )}
         </div>
 
          {/* Design Galleries grouped by type */}
          {groupedDeliveries.map((group, idx) => (
            <DesignGallerySection
              key={group.label}
              label={group.label}
              deliveries={group.deliveries}
              sectionNumber={idx + 1}
              onFullscreen={(url) => setFullscreenUrl(url)}
              showFeedback={!hasSubmitted && deliveryData.status !== 'completed'}
            />
          ))}
 
           {/* Action buttons */}
           {!hasSubmitted && deliveryData.status !== 'completed' && (
             <div className="bg-white rounded-3xl border border-emerald-200 shadow-lg p-6 mb-8 space-y-4">
               <h3 className="text-lg font-semibold text-gray-900 text-center">Que souhaitez-vous faire ?</h3>
               <div className="flex flex-col sm:flex-row gap-3 justify-center">
                 <Button
                   onClick={() => setShowRevisionDialog(true)}
                   variant="outline"
                   className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                 >
                   <Edit3 className="h-4 w-4" />
                   Demander des modifications
                 </Button>
                 <Button
                   onClick={() => setShowApprovalDialog(true)}
                   className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                 >
                   <CheckCircle className="h-4 w-4" />
                   Valider le design
                 </Button>
               </div>
             </div>
           )}

           {/* Already submitted message */}
           {hasSubmitted && (
             <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center shadow-lg">
               <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
               <h3 className="text-xl font-semibold text-gray-900 mb-2">Merci pour votre retour !</h3>
               <p className="text-emerald-700">
                 {deliveryData.status === 'completed' 
                   ? "Ce design a été validé avec succès."
                   : "Votre demande de modifications a été envoyée."}
               </p>
             </div>
          )}
       </div>
 
       {/* Fullscreen Image Modal */}
        {fullscreenUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenUrl(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/10"
              onClick={() => setFullscreenUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img 
              src={fullscreenUrl} 
              alt="Design fullscreen"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
 
       {/* Revision Dialog */}
       <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
          <DialogContent className="bg-white border-emerald-200 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Demander des modifications</DialogTitle>
              <DialogDescription className="text-gray-500">
                Décrivez les changements souhaités
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">Vos modifications *</Label>
                <Textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Décrivez les modifications souhaitées..."
                  className="bg-emerald-50/50 border-emerald-200 text-gray-900 placeholder:text-gray-400 min-h-[120px] mt-2"
               />
             </div>

              <AudioRecorder
                onAudioRecorded={setAudioBlob}
                audioBlob={audioBlob}
                onRemoveAudio={() => setAudioBlob(null)}
              />

             <div>
               <Label className="text-gray-700">Images de référence (optionnel)</Label>
               <div className="mt-2">
                 <ImageUploader
                   images={revisionImages}
                   onImagesChange={setRevisionImages}
                   maxImages={5}
                 />
               </div>
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="ghost" onClick={() => setShowRevisionDialog(false)} className="text-gray-500">
               Annuler
             </Button>
             <Button
               onClick={() => {
                 setShowRevisionDialog(false);
                 handleSubmitFeedback('revision_requested');
               }}
               disabled={!revisionNotes.trim() && revisionImages.length === 0 && !audioBlob}
               className="bg-gradient-to-r from-orange-500 to-amber-500"
             >
               <Send className="h-4 w-4 mr-2" />
               Envoyer
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Approval confirmation dialog */}
       <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="bg-white border-emerald-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Confirmer la validation</DialogTitle>
              <DialogDescription className="text-gray-500">
                Voulez-vous valider ce design avec une note de {rating}/5 ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowApprovalDialog(false)} className="text-gray-500">
                Annuler
             </Button>
             <Button
               onClick={() => {
                 setShowApprovalDialog(false);
                 handleSubmitFeedback('approved');
               }}
               className="bg-gradient-to-r from-emerald-500 to-teal-500"
             >
               <CheckCircle className="h-4 w-4 mr-2" />
               Confirmer
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Processing Dialog */}
       <Dialog open={showProcessingDialog} onOpenChange={() => {}}>
         <DialogContent className="bg-white border-emerald-200 max-w-sm">
           <div className="flex flex-col items-center py-6">
             {processingComplete ? (
               <>
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                  <p className="text-lg font-medium text-gray-900">Envoyé avec succès !</p>
               </>
             ) : (
               <>
                  <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-900">Envoi en cours...</p>
               </>
             )}
           </div>
         </DialogContent>
       </Dialog>
 
       {/* Float animation keyframes */}
       <style>{`
         @keyframes float {
           0%, 100% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
           10% { opacity: 0.5; }
           90% { opacity: 0.5; }
           100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
         }
       `}</style>
     </div>
   );
 }