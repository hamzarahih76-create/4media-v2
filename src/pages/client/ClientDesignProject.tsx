import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { useClientProfile } from '@/hooks/useClientProfile';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Palette,
  Loader2,
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
  ArrowLeft,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
}

interface ProjectData {
  taskTitle: string;
  description: string | null;
  status: string;
  deadline: string | null;
  designCount: number;
  designsCompleted: number;
  designTaskId: string;
  items: DesignItemOverview[];
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
    if (carouselMatch) { grouped['Carrousel'] = (grouped['Carrousel'] || 0) + parseInt(carouselMatch[1]); continue; }
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

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'approved':
      return { label: 'Validé', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'delivered':
      return { label: 'Livré', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'revision':
      return { label: 'Modification', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    default:
      return { label: 'En attente', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted border-muted' };
  }
};

export default function ClientDesignProject() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterType = searchParams.get('type');
  const { profile } = useClientProfile();
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';

  const [data, setData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [feedbackItem, setFeedbackItem] = useState<DesignItemOverview | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackImages, setFeedbackImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!taskId) return;
      try {
        const { data: task, error: taskError } = await supabase
          .from('design_tasks')
          .select('*')
          .eq('id', taskId)
          .single();
        if (taskError || !task) { setIsLoading(false); return; }

        const items = parseDesignItems(task.description);

        const { data: deliveries } = await supabase
          .from('design_deliveries')
          .select('*')
          .eq('design_task_id', task.id)
          .order('submitted_at', { ascending: false });

        const { data: feedbacks } = await supabase
          .from('design_feedback')
          .select('delivery_id, decision')
          .eq('design_task_id', task.id);

        const feedbackMap = new Map<string, string>();
        for (const f of (feedbacks || [])) feedbackMap.set(f.delivery_id, f.decision);

        const deliveriesByLabel = new Map<string, typeof deliveries>();
        for (const d of (deliveries || [])) {
          const m = d.notes?.match(/^\[(.+?)\]/);
          if (m) {
            if (!deliveriesByLabel.has(m[1])) deliveriesByLabel.set(m[1], []);
            deliveriesByLabel.get(m[1])!.push(d);
          }
        }

        const itemOverviews: DesignItemOverview[] = items.map(item => {
          const itemDeliveries = deliveriesByLabel.get(item.label) || [];
          if (itemDeliveries.length === 0) return { ...item, status: 'pending' as const, latestDelivery: null };

          const latestTime = new Date(itemDeliveries[0].submitted_at).getTime();
          const batch = itemDeliveries.filter(d => latestTime - new Date(d.submitted_at).getTime() <= 120000);

          let decision: string | null = null;
          for (const d of batch) { const fb = feedbackMap.get(d.id); if (fb) { decision = fb; break; } }

          let status: 'pending' | 'delivered' | 'revision' | 'approved' = 'delivered';
          if (decision === 'approved') status = 'approved';
          else if (decision === 'revision_requested') status = 'revision';

          const files = batch
            .filter(d => d.delivery_type === 'file' && d.file_path)
            .map(d => {
              const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(d.file_path!);
              return { fileUrl: urlData.publicUrl, filePath: d.file_path! };
            });

          const primary = batch[0];
          let fileUrl = null;
          if (primary.delivery_type === 'file' && primary.file_path) {
            const { data: urlData } = supabase.storage.from('design-files').getPublicUrl(primary.file_path);
            fileUrl = urlData.publicUrl;
          }

          return {
            ...item,
            status,
            latestDelivery: {
              id: primary.id,
              deliveryType: primary.delivery_type,
              externalLink: primary.external_link,
              filePath: primary.file_path,
              fileUrl,
              submittedAt: primary.submitted_at,
              files: files.length > 1 ? files : undefined,
            },
          };
        });

        setData({
          taskTitle: task.title,
          description: task.description,
          status: task.status,
          deadline: task.deadline,
          designCount: task.design_count || items.length,
          designsCompleted: task.designs_completed || 0,
          designTaskId: task.id,
          items: itemOverviews,
        });
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [taskId]);

  const handleApprove = async (item: DesignItemOverview) => {
    if (!data || !item.latestDelivery) return;
    setIsSubmitting(true);
    try {
      await supabase.from('design_feedback').insert({
        design_task_id: data.designTaskId,
        delivery_id: item.latestDelivery.id,
        decision: 'approved',
        feedback_text: `Design "${item.label}" approuvé par le client.`,
        reviewed_at: new Date().toISOString(),
      });
      setData(prev => prev ? {
        ...prev,
        designsCompleted: prev.designsCompleted + 1,
        items: prev.items.map(i => i.index === item.index ? { ...i, status: 'approved' as const } : i),
      } : prev);
      toast.success(`${item.label} validé !`);
    } catch { toast.error('Erreur lors de la validation'); }
    finally { setIsSubmitting(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
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

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const handleSubmitRevision = async () => {
    if (!data || !feedbackItem?.latestDelivery) return;
    if (!feedbackText.trim() && feedbackImages.length === 0 && !audioBlob) {
      toast.error('Veuillez ajouter un commentaire, des images ou un audio');
      return;
    }
    setIsSubmitting(true);
    try {
      const imagePaths: string[] = [];
      for (const file of feedbackImages) {
        const path = `revision-images/${data.designTaskId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('design-files').upload(path, file);
        if (!error) imagePaths.push(path);
      }
      let audioPath: string | null = null;
      if (audioBlob) {
        audioPath = `revision-audio/${data.designTaskId}/${Date.now()}-feedback.webm`;
        await supabase.storage.from('design-files').upload(audioPath, audioBlob);
      }
      await supabase.from('design_feedback').insert({
        design_task_id: data.designTaskId,
        delivery_id: feedbackItem.latestDelivery.id,
        decision: 'revision_requested',
        revision_notes: feedbackText || null,
        revision_images: imagePaths.length > 0 ? imagePaths : null,
        revision_audio_path: audioPath,
        reviewed_at: new Date().toISOString(),
      });
      setData(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.index === feedbackItem.index ? { ...i, status: 'revision' as const } : i),
      } : prev);
      toast.success('Demande de modification envoyée !');
      setFeedbackItem(null);
      setFeedbackText('');
      setFeedbackImages([]);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch { toast.error('Erreur lors de l\'envoi'); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
        </div>
      </ClientLayout>
    );
  }

  if (!data) {
    return (
      <ClientLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Projet introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/client/designs')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </ClientLayout>
    );
  }

  const approvedCount = data.items.filter(i => i.status === 'approved').length;
  const deliveredCount = data.items.filter(i => i.status === 'delivered').length;
  const revisionCount = data.items.filter(i => i.status === 'revision').length;
  const pendingCount = data.items.filter(i => i.status === 'pending').length;
  const progressPct = data.designCount > 0 ? Math.round((approvedCount / data.designCount) * 100) : 0;

  // Group items by type
  const groupedItems = data.items.reduce<Record<string, DesignItemOverview[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});
  const typeOrder = ['Miniature', 'Post', 'Carrousel'];

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Fullscreen overlay */}
        {fullscreenUrl && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer" onClick={() => setFullscreenUrl(null)}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white z-50" onClick={() => setFullscreenUrl(null)}>
              <X className="h-8 w-8" />
            </button>
            <img src={fullscreenUrl} alt="Fullscreen" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/client/designs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{data.taskTitle}</h1>
            {data.deadline && (
              <p className="text-sm text-muted-foreground">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Deadline : {format(new Date(data.deadline), 'dd MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
        </div>

        {/* Summary card */}
        <Card className="border-0 shadow-lg overflow-hidden" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Progression</span>
              <span className="text-white font-bold">{approvedCount}/{data.designCount}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="flex flex-wrap gap-2 pt-1">
              {approvedCount > 0 && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle className="h-3 w-3" /> {approvedCount} validé{approvedCount > 1 ? 's' : ''}</Badge>}
              {deliveredCount > 0 && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><Eye className="h-3 w-3" /> {deliveredCount} livré{deliveredCount > 1 ? 's' : ''}</Badge>}
              {revisionCount > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><AlertCircle className="h-3 w-3" /> {revisionCount} modification{revisionCount > 1 ? 's' : ''}</Badge>}
              {pendingCount > 0 && <Badge className="bg-white/10 text-white/50 border-white/20 gap-1"><Clock className="h-3 w-3" /> {pendingCount} en attente</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Type filter tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!filterType ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({})}
          >
            Tout ({data.items.length})
          </Button>
          {typeOrder.map(type => {
            const items = groupedItems[type];
            if (!items || items.length === 0) return null;
            return (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchParams({ type })}
              >
                {type}s ({items.length})
              </Button>
            );
          })}
        </div>

        {/* Items grouped by type */}
        {typeOrder.map(type => {
          if (filterType && filterType !== type) return null;
          const items = groupedItems[type];
          if (!items || items.length === 0) return null;
          return (
            <div key={type} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: primaryColor }} />
                {type}s
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                  const cfg = getStatusConfig(item.status);
                  const StatusIcon = cfg.icon;
                  const hasCarousel = item.latestDelivery?.files && item.latestDelivery.files.length > 1;

                  return (
                    <Card key={item.index} className={cn('overflow-hidden transition-all hover:shadow-md border', cfg.bg)}>
                      {/* Preview */}
                      {item.latestDelivery?.fileUrl ? (
                        <div className="relative aspect-square bg-muted overflow-hidden group">
                          {hasCarousel ? (
                            <CarouselPreview files={item.latestDelivery.files!} onFullscreen={setFullscreenUrl} />
                          ) : (
                            <>
                              <img src={item.latestDelivery.fileUrl} alt={item.label} className="w-full h-full object-contain" />
                              <button
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
                                onClick={() => setFullscreenUrl(item.latestDelivery!.fileUrl!)}
                              >
                                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <FileImage className="h-8 w-8 mx-auto text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground">En attente de livraison</p>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.label}</span>
                          <Badge variant="outline" className={cn('text-xs gap-1', cfg.bg, cfg.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </div>
                        {item.latestDelivery && (
                          <p className="text-xs text-muted-foreground">
                            Livré le {format(new Date(item.latestDelivery.submittedAt), 'd MMM yyyy', { locale: fr })}
                          </p>
                        )}
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
                              className="flex-1 gap-1.5 text-white"
                              style={{ backgroundColor: primaryColor }}
                              onClick={() => handleApprove(item)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Valider
                            </Button>
                          </div>
                        )}
                        {item.status === 'approved' && (
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> Validé
                            </div>
                            {item.latestDelivery?.fileUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-7 text-xs"
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
                                <Download className="h-3 w-3" />
                                Télécharger
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Feedback modal */}
        {feedbackItem && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setFeedbackItem(null)}>
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Demander des modifications</h3>
                  <button onClick={() => setFeedbackItem(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <p className="text-sm text-muted-foreground">{feedbackItem.label} — Décrivez les changements souhaités</p>
                <Textarea placeholder="Décrivez les modifications à apporter..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={4} className="resize-none" />
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files || []); setFeedbackImages(prev => [...prev, ...files].slice(0, 5)); e.target.value = ''; }} />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={feedbackImages.length >= 5} className="gap-1.5">
                      <ImagePlus className="h-4 w-4" /> Images ({feedbackImages.length}/5)
                    </Button>
                    {!audioBlob && (
                      <Button variant="outline" size="sm" className={cn('gap-1.5', isRecording && 'border-red-400 text-red-500')} onClick={isRecording ? stopRecording : startRecording}>
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
                          <button className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5" onClick={() => setFeedbackImages(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {audioUrl && (
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                      <audio src={audioUrl} controls className="h-8 flex-1" />
                      <button className="text-muted-foreground hover:text-destructive" onClick={() => { setAudioBlob(null); setAudioUrl(null); }}><X className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setFeedbackItem(null); setAudioBlob(null); setAudioUrl(null); }}>Annuler</Button>
                  <Button className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleSubmitRevision} disabled={isSubmitting || (!feedbackText.trim() && feedbackImages.length === 0 && !audioBlob)}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

function CarouselPreview({ files, onFullscreen }: { files: { fileUrl: string; filePath: string }[]; onFullscreen: (url: string) => void }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="relative w-full h-full group">
      <img src={files[current].fileUrl} alt={`Page ${current + 1}`} className="w-full h-full object-contain bg-muted" />
      {files.length > 1 && (
        <>
          <button className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => { e.stopPropagation(); setCurrent(c => (c - 1 + files.length) % files.length); }}><ChevronLeft className="h-4 w-4" /></button>
          <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => { e.stopPropagation(); setCurrent(c => (c + 1) % files.length); }}><ChevronRight className="h-4 w-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {files.map((_, i) => (<button key={i} className={cn('h-1.5 rounded-full transition-all', i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50')} onClick={(e) => { e.stopPropagation(); setCurrent(i); }} />))}
          </div>
        </>
      )}
      <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition" onClick={(e) => { e.stopPropagation(); onFullscreen(files[current].fileUrl); }}><ZoomIn className="h-4 w-4" /></button>
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{current + 1}/{files.length}</div>
    </div>
  );
}
