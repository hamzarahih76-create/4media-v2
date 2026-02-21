import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Palette,
  Loader2,
  ShieldAlert,
  Eye,
  FileImage,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  Pencil,
  Send,
  ImagePlus,
  Mic,
  Square,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logo from '@/assets/4media-logo-transparent.png';

interface ProjectOverviewData {
  taskTitle: string;
  clientName: string | null;
  projectName: string | null;
  description: string | null;
  status: string;
  deadline: string | null;
  designCount: number;
  designsCompleted: number;
  designTaskId: string;
  items: DesignItemOverview[];
}

interface DesignItemOverview {
  label: string;
  type: string;
  index: number;
  status: 'pending' | 'delivered' | 'revision' | 'approved';
  latestDelivery: {
    id: string;
    deliveryType: string;
    externalLink: string | null;
    filePath: string | null;
    fileUrl: string | null;
    submittedAt: string;
    files?: { fileUrl: string; filePath: string }[];
  } | null;
  reviewLinkId: string | null;
}

function parseDesignItems(description: string | null): { type: string; label: string; index: number }[] {
  if (!description) return [];
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return [];
  const entries = match[1].split('+').map(s => s.trim());
  const typeOrder = ['Miniature', 'Post', 'Carrousel'];
  const grouped: Record<string, number> = {};

  for (const entry of entries) {
    const carouselMatch = entry.match(/(\d+)x\s*Carrousel\s+(\d+)p/i);
    if (carouselMatch) {
      grouped['Carrousel'] = (grouped['Carrousel'] || 0) + parseInt(carouselMatch[1]);
      continue;
    }
    const simpleMatch = entry.match(/(\d+)x\s*(Post|Miniature)/i);
    if (simpleMatch) {
      const type = simpleMatch[2].charAt(0).toUpperCase() + simpleMatch[2].slice(1).toLowerCase();
      grouped[type] = (grouped[type] || 0) + parseInt(simpleMatch[1]);
    }
  }

  const items: { type: string; label: string; index: number }[] = [];
  let globalIndex = 0;
  for (const type of typeOrder) {
    const count = grouped[type] || 0;
    for (let i = 0; i < count; i++) {
      globalIndex++;
      items.push({ type, label: `${type} ${i + 1}`, index: globalIndex });
    }
  }
  return items;
}

const getItemIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'miniature': return '🖼️';
    case 'post': return '📱';
    case 'carrousel': return '🎠';
    default: return '🎨';
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'approved':
      return { label: 'Validé', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' };
    case 'delivered':
      return { label: 'Livré au client', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-500' };
    case 'revision':
      return { label: 'En modification', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' };
    default:
      return { label: 'En attente', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted border-muted', dot: 'bg-muted-foreground' };
  }
};

export default function DesignProjectOverview() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ProjectOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [feedbackItem, setFeedbackItem] = useState<DesignItemOverview | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackImages, setFeedbackImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkId, setLinkId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        // Fetch project review link
        const { data: link, error: linkError } = await supabase
          .from('design_project_review_links')
          .select('*')
          .eq('token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (linkError || !link) {
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        // Check expiration
        if (new Date(link.expires_at) < new Date()) {
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        // Update view count
        await supabase
          .from('design_project_review_links')
          .update({
            views_count: link.views_count + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('id', link.id);

        // Fetch design task
        const { data: task, error: taskError } = await supabase
          .from('design_tasks')
          .select('*')
          .eq('id', link.design_task_id)
          .single();

        if (taskError || !task) {
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        // Parse items from description
        const items = parseDesignItems(task.description);

        // Fetch all deliveries
        const { data: deliveries } = await supabase
          .from('design_deliveries')
          .select('*')
          .eq('design_task_id', task.id)
          .order('submitted_at', { ascending: false });

        // Fetch all feedback
        const { data: feedbacks } = await supabase
          .from('design_feedback')
          .select('delivery_id, decision')
          .eq('design_task_id', task.id);

        // Fetch review links
        const { data: reviewLinks } = await supabase
          .from('design_review_links')
          .select('id, delivery_id')
          .eq('design_task_id', task.id)
          .eq('is_active', true);

        const reviewLinkByDelivery = new Map<string, string>();
        for (const rl of (reviewLinks || [])) {
          reviewLinkByDelivery.set(rl.delivery_id, rl.id);
        }

        const feedbackMap = new Map<string, string>();
        for (const f of (feedbacks || [])) {
          feedbackMap.set(f.delivery_id, f.decision);
        }

        // Group deliveries by item label
        const deliveriesByLabel = new Map<string, typeof deliveries>();
        for (const d of (deliveries || [])) {
          const match = d.notes?.match(/^\[(.+?)\]/);
          if (match) {
            const label = match[1];
            if (!deliveriesByLabel.has(label)) deliveriesByLabel.set(label, []);
            deliveriesByLabel.get(label)!.push(d);
          }
        }

        // Build item overviews
        const itemOverviews: DesignItemOverview[] = items.map(item => {
          const itemDeliveries = deliveriesByLabel.get(item.label) || [];

          if (itemDeliveries.length === 0) {
            return { ...item, status: 'pending' as const, latestDelivery: null, reviewLinkId: null };
          }

          // Get latest batch (within 2 minutes of the most recent)
          const latestSubmittedAt = new Date(itemDeliveries[0].submitted_at).getTime();
          const BATCH_WINDOW_MS = 2 * 60 * 1000;
          const latestBatch = itemDeliveries.filter(d => {
            const diff = latestSubmittedAt - new Date(d.submitted_at).getTime();
            return diff <= BATCH_WINDOW_MS;
          });

          // Determine status from feedback on ANY delivery in the batch
          let decision: string | null = null;
          for (const d of latestBatch) {
            const fb = feedbackMap.get(d.id);
            if (fb) { decision = fb; break; }
          }

          let status: 'pending' | 'delivered' | 'revision' | 'approved' = 'delivered';
          if (decision === 'approved') status = 'approved';
          else if (decision === 'revision_requested') status = 'revision';

          // Process file URLs
          const files = latestBatch
            .filter(d => d.delivery_type === 'file' && d.file_path)
            .map(d => {
              const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(d.file_path!);
              return { fileUrl: urlData.publicUrl, filePath: d.file_path! };
            });

          const primaryDelivery = latestBatch[0];
          let fileUrl = null;
          if (primaryDelivery.delivery_type === 'file' && primaryDelivery.file_path) {
            const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(primaryDelivery.file_path);
            fileUrl = urlData.publicUrl;
          }

          // Find review link from any delivery in the batch
          let reviewLinkId: string | null = null;
          for (const d of latestBatch) {
            const rlId = reviewLinkByDelivery.get(d.id);
            if (rlId) { reviewLinkId = rlId; break; }
          }

          return {
            ...item,
            status,
            reviewLinkId,
            latestDelivery: {
              id: primaryDelivery.id,
              deliveryType: primaryDelivery.delivery_type,
              externalLink: primaryDelivery.external_link,
              filePath: primaryDelivery.file_path,
              fileUrl,
              submittedAt: primaryDelivery.submitted_at,
              files: files.length > 1 ? files : undefined,
            },
          };
        });

        setData({
          taskTitle: task.title,
          clientName: task.client_name,
          projectName: task.project_name,
          description: task.description,
          status: task.status,
          deadline: task.deadline,
          designCount: task.design_count || items.length,
          designsCompleted: task.designs_completed || 0,
          designTaskId: task.id,
          items: itemOverviews,
        });
      } catch (error) {
        console.error('Error fetching project overview:', error);
        setIsInvalid(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleApprove = async (item: DesignItemOverview) => {
    if (!data || !item.latestDelivery) return;
    setIsSubmitting(true);
    try {
      await supabase.from('design_feedback').insert({
        design_task_id: data.designTaskId,
        delivery_id: item.latestDelivery.id,
        review_link_id: item.reviewLinkId,
        decision: 'approved',
        feedback_text: `Design "${item.label}" approuvé depuis la vue projet.`,
        reviewed_at: new Date().toISOString(),
      });
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          designsCompleted: prev.designsCompleted + 1,
          items: prev.items.map(i => i.index === item.index ? { ...i, status: 'approved' as const } : i),
        };
      });
      toast.success(`${item.label} validé !`);
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use mp4 for Safari/iOS compatibility, fallback to webm
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.stop(); setIsRecording(false); } }, 120000);
    } catch { toast.error('Impossible d\'accéder au microphone'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmitRevision = async () => {
    if (!data || !feedbackItem?.latestDelivery) return;
    if (!feedbackText.trim() && feedbackImages.length === 0 && !audioBlob) {
      toast.error('Veuillez ajouter un commentaire, des images ou un audio');
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload images
      const imagePaths: string[] = [];
      for (const file of feedbackImages) {
        const path = `revision-images/${data.designTaskId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('design-files').upload(path, file);
        if (!error) imagePaths.push(path);
      }

      // Upload audio
      let audioPath: string | null = null;
      if (audioBlob) {
        audioPath = `revision-audio/${data.designTaskId}/${Date.now()}-feedback.webm`;
        await supabase.storage.from('design-files').upload(audioPath, audioBlob);
      }

      await supabase.from('design_feedback').insert({
        design_task_id: data.designTaskId,
        delivery_id: feedbackItem.latestDelivery.id,
        review_link_id: feedbackItem.reviewLinkId,
        decision: 'revision_requested',
        revision_notes: feedbackText || null,
        revision_images: imagePaths.length > 0 ? imagePaths : null,
        revision_audio_path: audioPath,
        reviewed_at: new Date().toISOString(),
      });

      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(i => i.index === feedbackItem.index ? { ...i, status: 'revision' as const } : i),
        };
      });
      toast.success('Demande de modification envoyée !');
      setFeedbackItem(null);
      setFeedbackText('');
      setFeedbackImages([]);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-muted-foreground">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (isInvalid || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Lien invalide ou expiré</h2>
            <p className="text-muted-foreground text-sm">
              Ce lien de projet n'est plus actif. Veuillez contacter votre gestionnaire de projet pour obtenir un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = data.designCount > 0
    ? Math.round((data.designsCompleted / data.designCount) * 100)
    : 0;

  const approvedCount = data.items.filter(i => i.status === 'approved').length;
  const deliveredCount = data.items.filter(i => i.status === 'delivered').length;
  const revisionCount = data.items.filter(i => i.status === 'revision').length;
  const pendingCount = data.items.filter(i => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Fullscreen overlay */}
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => { setFullscreenUrl(null); setCarouselIndex(0); }}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white z-50"
            onClick={() => { setFullscreenUrl(null); setCarouselIndex(0); }}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={fullscreenUrl}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="4Media" className="h-8 w-auto" />
            <Separator orientation="vertical" className="h-6" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Projet</p>
              <h1 className="font-bold text-lg leading-tight">{data.taskTitle}</h1>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Palette className="h-3 w-3" />
            Vue projet
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Project summary card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Client</p>
                <p className="font-semibold text-lg">{data.clientName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Progression</p>
                <div className="flex items-center gap-3">
                  <Progress value={progressPercentage} className="h-2.5 flex-1 [&>div]:bg-emerald-500" />
                  <span className="font-bold text-sm tabular-nums">{approvedCount}/{data.designCount}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Deadline</p>
                <p className="font-semibold">
                  {data.deadline
                    ? format(new Date(data.deadline), 'dd MMMM yyyy', { locale: fr })
                    : 'Non défini'}
                </p>
              </div>
            </div>
          </div>

          {/* Status summary pills */}
          <div className="px-6 py-4 flex flex-wrap gap-3 border-t">
            {approvedCount > 0 && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                <CheckCircle className="h-3 w-3" /> {approvedCount} validé{approvedCount > 1 ? 's' : ''}
              </Badge>
            )}
            {deliveredCount > 0 && (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                <Eye className="h-3 w-3" /> {deliveredCount} livré{deliveredCount > 1 ? 's' : ''}
              </Badge>
            )}
            {revisionCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                <AlertCircle className="h-3 w-3" /> {revisionCount} en modification
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="bg-muted text-muted-foreground gap-1">
                <Clock className="h-3 w-3" /> {pendingCount} en attente
              </Badge>
            )}
          </div>
        </Card>

        {/* Items grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-500" />
            Livrables du projet
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => {
              const statusCfg = getStatusConfig(item.status);
              const StatusIcon = statusCfg.icon;
              const hasCarousel = item.latestDelivery?.files && item.latestDelivery.files.length > 1;

              return (
                <Card
                  key={item.index}
                  className={cn(
                    'overflow-hidden transition-all hover:shadow-md border',
                    statusCfg.bg
                  )}
                >
                  {/* Preview */}
                  {item.latestDelivery?.fileUrl ? (
                    <div className="relative aspect-square bg-muted overflow-hidden group">
                      {hasCarousel ? (
                        <CarouselPreview
                          files={item.latestDelivery.files!}
                          onFullscreen={(url) => setFullscreenUrl(url)}
                        />
                      ) : (
                        <>
                          <img
                            src={item.latestDelivery.fileUrl}
                            alt={item.label}
                            className="w-full h-full object-cover"
                          />
                          <button
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
                            onClick={() => setFullscreenUrl(item.latestDelivery!.fileUrl!)}
                          >
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </>
                      )}
                    </div>
                  ) : item.latestDelivery?.externalLink ? (
                    <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <ExternalLink className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Lien externe</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <FileImage className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">En attente de livraison</p>
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getItemIcon(item.type)}</span>
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs gap-1', statusCfg.bg, statusCfg.color)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {item.latestDelivery && (
                      <p className="text-xs text-muted-foreground">
                        Livré le {format(new Date(item.latestDelivery.submittedAt), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}

                    {/* Action buttons for delivered/revision items */}
                    {item.latestDelivery && item.status !== 'approved' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                          onClick={() => { setFeedbackItem(item); setFeedbackText(''); setFeedbackImages([]); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifications
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => handleApprove(item)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          Valider
                        </Button>
                      </div>
                    )}

                    {/* Download button for approved items */}
                    {item.status === 'approved' && item.latestDelivery?.fileUrl && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          onClick={async () => {
                            try {
                              toast.info('Téléchargement en cours...');
                              const allFiles = item.latestDelivery!.files || [{ fileUrl: item.latestDelivery!.fileUrl!, filePath: item.latestDelivery!.filePath || 'design.png' }];
                              for (const file of allFiles) {
                                const response = await fetch(file.fileUrl);
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.filePath.split('/').pop() || `${item.label}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }
                              toast.success('Téléchargement terminé !');
                            } catch {
                              toast.error('Erreur lors du téléchargement');
                            }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Télécharger
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Feedback modal */}
        {feedbackItem && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setFeedbackItem(null)}>
            <div
              className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Demander des modifications</h3>
                  <button onClick={() => setFeedbackItem(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {feedbackItem.label} — Décrivez les changements souhaités
                </p>

                <Textarea
                  placeholder="Décrivez les modifications à apporter..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />

                {/* Image attachments */}
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFeedbackImages(prev => [...prev, ...files].slice(0, 5));
                      e.target.value = '';
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={feedbackImages.length >= 5}
                      className="gap-1.5"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Images ({feedbackImages.length}/5)
                    </Button>
                    {!audioBlob && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('gap-1.5', isRecording && 'border-red-400 text-red-500')}
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? <Square className="h-4 w-4 fill-red-500" /> : <Mic className="h-4 w-4" />}
                        {isRecording ? 'Arrêter' : 'Audio'}
                      </Button>
                    )}
                  </div>
                  {feedbackImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {feedbackImages.map((file, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <button
                            className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                            onClick={() => setFeedbackImages(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {audioUrl && (
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                      <audio src={audioUrl} controls className="h-8 flex-1" />
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setFeedbackItem(null); setAudioBlob(null); setAudioUrl(null); }}>
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={handleSubmitRevision}
                    disabled={isSubmitting || (!feedbackText.trim() && feedbackImages.length === 0 && !audioBlob)}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-muted-foreground">
            Propulsé par <span className="font-semibold">4Media</span> • Vue projet en lecture seule
          </p>
        </div>
      </main>
    </div>
  );
}

// Carousel preview component for multi-file items
function CarouselPreview({
  files,
  onFullscreen,
}: {
  files: { fileUrl: string; filePath: string }[];
  onFullscreen: (url: string) => void;
}) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="relative w-full h-full group">
      <img
        src={files[current].fileUrl}
        alt={`Page ${current + 1}`}
        className="w-full h-full object-contain bg-muted"
      />

      {/* Navigation */}
      {files.length > 1 && (
        <>
          <button
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            onClick={(e) => { e.stopPropagation(); setCurrent(c => (c - 1 + files.length) % files.length); }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            onClick={(e) => { e.stopPropagation(); setCurrent(c => (c + 1) % files.length); }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {files.map((_, i) => (
              <button
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                )}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              />
            ))}
          </div>
        </>
      )}

      {/* Zoom button */}
      <button
        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
        onClick={(e) => { e.stopPropagation(); onFullscreen(files[current].fileUrl); }}
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      {/* Page indicator */}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
        {current + 1}/{files.length}
      </div>
    </div>
  );
}
