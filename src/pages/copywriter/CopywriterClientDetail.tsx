import { useState, useEffect } from 'react';
import { CopywriterPlanningCalendar } from '@/components/copywriter/CopywriterPlanningCalendar';
import { useParams, useNavigate } from 'react-router-dom';
import { CopywriterLayout } from '@/components/layout/CopywriterLayout';
import { useCopywriterClientContent } from '@/hooks/useCopywriterData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Lightbulb, FileText, CalendarDays, Plus, Loader2, 
  Hash, Image, Video, Clock, Send, Eye, CheckCircle, RotateCcw,
  Instagram, Youtube, Music2, Palette, Trash2, Sparkles, Edit2, MoreVertical, Calendar, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { detectDirection, getDirectionStyle } from '@/lib/textDirection';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_review: { label: 'En attente validation', color: 'bg-amber-500/10 text-amber-500', icon: Clock },
  validated: { label: 'Validé', color: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle },
  revision_requested: { label: 'Modification demandée', color: 'bg-orange-500/10 text-orange-500', icon: RotateCcw },
  delivered: { label: 'Publié', color: 'bg-blue-500/10 text-blue-500', icon: Send },
};

const PLATFORM_ICONS: Record<string, any> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

export default function CopywriterClientDetail() {
  const { clientUserId } = useParams<{ clientUserId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: content = [], isLoading: contentLoading } = useCopywriterClientContent(clientUserId);

  const { data: clientProfile } = useQuery({
    queryKey: ['copywriter-client-profile', clientUserId],
    queryFn: async () => {
      if (!clientUserId) return null;
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', clientUserId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!clientUserId,
  });

  // Fetch ALL videos linked to this client's tasks (not just copywriter's)
  const { data: clientTasks = [] } = useQuery({
    queryKey: ['copywriter-client-tasks', clientUserId],
    queryFn: async () => {
      if (!clientUserId) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, deadline, video_count, videos_completed, status')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!clientUserId,
  });

  const taskIds = clientTasks.map((t: any) => t.id);

  const { data: clientVideos = [] } = useQuery({
    queryKey: ['copywriter-client-videos', clientUserId, taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const { data } = await supabase
        .from('videos')
        .select('id, title, task_id, status, deadline, created_at')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: taskIds.length > 0,
  });

  // Fetch design tasks with deliveries and feedback for this client
  const { data: clientDesignTasks = [] } = useQuery({
    queryKey: ['copywriter-client-designs', clientUserId],
    queryFn: async () => {
      if (!clientUserId) return [];
      const { data: tasks } = await supabase
        .from('design_tasks')
        .select('id, title, status, deadline, description')
        .eq('client_user_id', clientUserId);
      if (!tasks || tasks.length === 0) return [];

      // Fetch all deliveries and feedback for these tasks
      const taskIds = tasks.map(t => t.id);
      const [{ data: deliveries }, { data: feedbacks }] = await Promise.all([
        supabase.from('design_deliveries').select('id, design_task_id, version_number, notes, file_path').in('design_task_id', taskIds),
        supabase.from('design_feedback').select('design_task_id, delivery_id, decision, revision_notes').in('design_task_id', taskIds),
      ]);

      // Extract unique item labels from delivery notes and description
      return tasks.map(task => {
        const taskDeliveries = (deliveries || []).filter(d => d.design_task_id === task.id);
        const taskFeedbacks = (feedbacks || []).filter(f => f.design_task_id === task.id);
        
        // Parse expected items from description (e.g. "2x Post, 3x Miniature, 1x Carrousel (4p)")
        const expectedItems: { label: string }[] = [];
        if (task.description) {
          const entries = task.description.split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean);
          entries.forEach((entry: string) => {
            const m = entry.match(/(\d+)\s*x?\s*(Post|Miniature|Carrousel|Thumbnail)/i);
            if (m) {
              const count = parseInt(m[1]);
              const type = m[2];
              for (let i = 1; i <= count; i++) {
                expectedItems.push({ label: `${type} ${i > 1 || count > 1 ? i : 1}` });
              }
            }
          });
        }

        // Group delivered items by label
        const itemMap = new Map<string, { label: string; status: string; latestDelivery: any | null }>();
        taskDeliveries.forEach(d => {
          const match = d.notes?.match(/\[([^\]]+)\]/);
          const label = match ? match[1] : `Item ${d.version_number}`;
          const existing = itemMap.get(label);
          if (!existing || d.version_number > existing.latestDelivery?.version_number) {
            const fb = taskFeedbacks.find(f => f.delivery_id === d.id);
            let status = 'delivered';
            if (fb?.decision === 'approved') status = 'validated';
            else if (fb?.decision === 'revision_requested') status = 'revision';
            itemMap.set(label, { label, status, latestDelivery: d });
          }
        });

        // Merge: add expected items not yet delivered
        expectedItems.forEach(ei => {
          if (!itemMap.has(ei.label)) {
            itemMap.set(ei.label, { label: ei.label, status: 'pending', latestDelivery: null });
          }
        });

        // If no expected items parsed and no deliveries, use design_count
        if (itemMap.size === 0 && task.description) {
          // Fallback: just show what we have from deliveries
        }

        return { ...task, items: Array.from(itemMap.values()) };
      });
    },
    enabled: !!clientUserId,
  });

  // === State for create content modal ===
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<'idea' | 'script' | 'planning'>('idea');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  // Ideas multi-create
  const [ideaItems, setIdeaItems] = useState<{ title: string; inspiration: string }[]>([{ title: '', inspiration: '' }]);
  // Scripts multi-create
  const [scriptItems, setScriptItems] = useState<{ title: string; inspiration: string; scriptDescription: string; scriptHashtags: string }[]>([{ title: '', inspiration: '', scriptDescription: '', scriptHashtags: '' }]);
  // Planning-specific fields
  const [planPublicationDate, setPlanPublicationDate] = useState('');
  const [planHashtags, setPlanHashtags] = useState('');
  const [planPlatform, setPlanPlatform] = useState('instagram');
  const [planLinkedVideoId, setPlanLinkedVideoId] = useState('');
  const [planLinkedDesignTaskId, setPlanLinkedDesignTaskId] = useState('');
  const [planThumbnailUrl, setPlanThumbnailUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // === State for detail modal ===
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // === State for video detail modal ===
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [videoDetailOpen, setVideoDetailOpen] = useState(false);
  const [signedIframeUrl, setSignedIframeUrl] = useState<string | null>(null);
  const [signingVideo, setSigningVideo] = useState(false);

  // Fetch latest delivery for selected video
  const { data: videoDelivery, isLoading: deliveryLoading } = useQuery({
    queryKey: ['copywriter-video-delivery', selectedVideo?.id],
    queryFn: async () => {
      if (!selectedVideo?.id) return null;
      const { data, error } = await supabase
        .from('video_deliveries')
        .select('*')
        .eq('video_id', selectedVideo.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVideo?.id && videoDetailOpen,
  });

  // Get signed URL when delivery loads with cloudflare_stream_id
  useEffect(() => {
    setSignedIframeUrl(null);
    if (!videoDelivery?.cloudflare_stream_id) return;
    setSigningVideo(true);
    supabase.functions
      .invoke('cloudflare-stream-signed-url', {
        body: { cloudflareVideoId: videoDelivery.cloudflare_stream_id }
      })
      .then(({ data }) => {
        if (data?.iframeUrl) setSignedIframeUrl(data.iframeUrl);
      })
      .finally(() => setSigningVideo(false));
  }, [videoDelivery?.cloudflare_stream_id]);

  // Design filter state
  const [designFilter, setDesignFilter] = useState('all');


  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditTitle, setInlineEditTitle] = useState('');
  const [inlineEditDesc, setInlineEditDesc] = useState('');
  const [inlineEditScriptDesc, setInlineEditScriptDesc] = useState('');
  const [inlineEditHashtags, setInlineEditHashtags] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);

  const invalidateContent = () => {
    queryClient.invalidateQueries({ queryKey: ['copywriter-client-content', clientUserId] });
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setIdeaItems([{ title: '', inspiration: '' }]);
    setScriptItems([{ title: '', inspiration: '', scriptDescription: '', scriptHashtags: '' }]);
    setPlanPublicationDate('');
    setPlanHashtags('');
    setPlanPlatform('instagram');
    setPlanLinkedVideoId('');
    setPlanLinkedDesignTaskId('');
    setPlanThumbnailUrl('');
  };

  const addIdeaItem = () => {
    const existingCount = content.filter((c: any) => c.workflow_step === 'idea').length;
    setIdeaItems(prev => [...prev, { title: `Idée ${existingCount + prev.length + 1}`, inspiration: '' }]);
  };

  const removeIdeaItem = (index: number) => {
    if (ideaItems.length <= 1) return;
    setIdeaItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateIdeaItem = (index: number, field: 'title' | 'inspiration', value: string) => {
    setIdeaItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addScriptItem = () => {
    const existingCount = content.filter((c: any) => c.workflow_step === 'script').length;
    setScriptItems(prev => [...prev, { title: `Script ${existingCount + prev.length + 1}`, inspiration: '', scriptDescription: '', scriptHashtags: '' }]);
  };

  const removeScriptItem = (index: number) => {
    if (scriptItems.length <= 1) return;
    setScriptItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateScriptItem = (index: number, field: 'title' | 'inspiration' | 'scriptDescription' | 'scriptHashtags', value: string) => {
    setScriptItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleCreate = async () => {
    if (!clientUserId || !user?.id) return;
    setCreating(true);
    try {
      if (newType === 'idea') {
        // Multi-idea creation
        const validIdeas = ideaItems.filter(item => item.title.trim());
        if (validIdeas.length === 0) {
          toast.error('Ajoutez au moins une idée avec un titre');
          setCreating(false);
          return;
        }
        const rows = validIdeas.map(item => ({
          client_user_id: clientUserId,
          title: item.title.trim(),
          description: item.inspiration.trim() || null,
          workflow_step: 'idea' as const,
          content_type: 'text',
          created_by: user.id,
          status: 'draft' as const,
          metadata: item.inspiration.trim() ? { inspiration: item.inspiration.trim() } : null,
        }));
        const { error } = await supabase.from('client_content_items').insert(rows as any);
        if (error) throw error;
        toast.success(`${validIdeas.length} idée${validIdeas.length > 1 ? 's' : ''} créée${validIdeas.length > 1 ? 's' : ''} !`);
      } else if (newType === 'script') {
        // Multi-script creation
        const validScripts = scriptItems.filter(item => item.title.trim());
        if (validScripts.length === 0) {
          toast.error('Ajoutez au moins un script avec un titre');
          setCreating(false);
          return;
        }
        const rows = validScripts.map(item => {
          const hashtagList = item.scriptHashtags.split(/[,\s#]+/).filter(Boolean).map(h => h.trim());
          const meta: Record<string, any> = {};
          if (item.inspiration.trim()) meta.inspiration = item.inspiration.trim();
          if (item.scriptDescription.trim()) meta.description = item.scriptDescription.trim();
          if (hashtagList.length > 0) meta.hashtags = hashtagList;
          return {
            client_user_id: clientUserId,
            title: item.title.trim(),
            description: item.inspiration.trim() || null,
            workflow_step: 'script' as const,
            content_type: 'text',
            created_by: user.id,
            status: 'draft' as const,
            metadata: Object.keys(meta).length > 0 ? meta : null,
          };
        });
        const { error } = await supabase.from('client_content_items').insert(rows as any);
        if (error) throw error;
        toast.success(`${validScripts.length} script${validScripts.length > 1 ? 's' : ''} créé${validScripts.length > 1 ? 's' : ''} !`);
      } else {
        if (!newTitle.trim()) return;
        const metadata = {
          publication_date: planPublicationDate || null,
          hashtags: planHashtags.split(/[,\s#]+/).filter(Boolean).map(h => h.trim()),
          platform: planPlatform,
          thumbnail_url: planThumbnailUrl || null,
        };

        const { error } = await supabase.from('client_content_items').insert({
          client_user_id: clientUserId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          workflow_step: 'planning',
          content_type: 'planning',
          created_by: user.id,
          status: 'draft',
          related_video_id: planLinkedVideoId || null,
          related_design_task_id: planLinkedDesignTaskId || null,
          metadata: metadata as any,
        });
        if (error) throw error;
        const labels = { idea: 'Idée', script: 'Script', planning: 'Planning' };
        toast.success(`${labels[newType]} créé(e) !`);
      }
      setCreateOpen(false);
      resetCreateForm();
      invalidateContent();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitForReview = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('client_content_items')
        .update({ status: 'pending_review' })
        .eq('id', itemId);
      if (error) throw error;
      toast.success('Envoyé pour validation !');
      invalidateContent();
      setDetailOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const ideas = content.filter((c: any) => c.workflow_step === 'idea');
  const scripts = content.filter((c: any) => c.workflow_step === 'script');
  const planning = content.filter((c: any) => c.workflow_step === 'planning');
  const primaryColor = clientProfile?.primary_color || '#8b5cf6';

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer ce contenu ?')) return;
    const { error } = await supabase.from('client_content_items').delete().eq('id', itemId);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Contenu supprimé');
    invalidateContent();
  };

  const handleInlineSave = async (itemId: string) => {
    if (!inlineEditTitle.trim()) { toast.error('Titre requis'); return; }
    setInlineSaving(true);
    const item = content.find((c: any) => c.id === itemId);
    const existingMeta = (item?.metadata || {}) as Record<string, any>;
    const isScript = item?.workflow_step === 'script';
    const updatedMeta = { 
      ...existingMeta, 
      inspiration: inlineEditDesc.trim() || undefined,
      ...(isScript ? {
        description: inlineEditScriptDesc.trim() || undefined,
        hashtags: inlineEditHashtags.trim() ? inlineEditHashtags.split(/[\s,]+/).map((h: string) => h.replace(/^#/, '').trim()).filter(Boolean) : [],
      } : {}),
    };
    const { error } = await supabase
      .from('client_content_items')
      .update({ 
        title: inlineEditTitle.trim(), 
        description: inlineEditDesc.trim() || null,
        metadata: updatedMeta as any,
      })
      .eq('id', itemId);
    setInlineSaving(false);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Contenu modifié');
    setInlineEditId(null);
    invalidateContent();
  };

  const getStatusBadge = (status: string) => {
    const s = STATUS_MAP[status] || STATUS_MAP.draft;
    return <Badge className={`${s.color} border-0 gap-1`}><s.icon className="h-3 w-3" />{s.label}</Badge>;
  };

  const renderContentCard = (item: any, showPlanningDetails = false) => {
    const meta = item.metadata as any;
    const isInlineEditing = inlineEditId === item.id;

    if (isInlineEditing) {
      return (
        <Card key={item.id} className="border-violet-500/30 border-2">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Titre</Label>
              <Input value={inlineEditTitle} onChange={(e) => setInlineEditTitle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Inspiration</Label>
              <Textarea 
                value={inlineEditDesc} 
                onChange={(e) => setInlineEditDesc(e.target.value)} 
                rows={6} 
                className="min-h-[200px] leading-relaxed whitespace-pre-wrap"
                dir="auto"
                style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
              />
            </div>
            {item.workflow_step === 'script' && (
              <>
                <div>
                  <Label className="text-xs">Description (pour le planning)</Label>
                  <Textarea 
                    value={inlineEditScriptDesc} 
                    onChange={(e) => setInlineEditScriptDesc(e.target.value)} 
                    rows={4} 
                     className="min-h-[120px] leading-relaxed whitespace-pre-wrap"
                     dir="auto"
                     style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Hashtags (séparés par des espaces)</Label>
                  <Input 
                    value={inlineEditHashtags} 
                    onChange={(e) => setInlineEditHashtags(e.target.value)} 
                    placeholder="#hashtag1 #hashtag2"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setInlineEditId(null)}>Annuler</Button>
              <Button size="sm" className="bg-violet-500 hover:bg-violet-600" onClick={() => handleInlineSave(item.id)} disabled={inlineSaving}>
                {inlineSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card 
        key={item.id} 
        className="border-border/50 hover:border-violet-500/30 transition-colors cursor-pointer"
        onClick={() => { setDetailItem(item); setDetailOpen(true); }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {showPlanningDetails && meta?.platform && (
                  (() => {
                    const PIcon = PLATFORM_ICONS[meta.platform] || CalendarDays;
                    return <PIcon className="h-4 w-4 text-muted-foreground" />;
                  })()
                )}
                <h3 className="font-semibold truncate">{item.title}</h3>
              </div>
              
              {item.description && (
                <p dir="auto" className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-2" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{item.description}</p>
              )}
              
              {showPlanningDetails && meta && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {meta.publication_date && (
                    <span className="inline-flex items-center gap-1 text-xs bg-violet-500/10 text-violet-500 px-2 py-0.5 rounded-full">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(meta.publication_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                  {meta.hashtags?.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                      <Hash className="h-3 w-3" />
                      {meta.hashtags.length} hashtag{meta.hashtags.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {item.related_video_id && (
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                      <Video className="h-3 w-3" />Vidéo liée
                    </span>
                  )}
                  {item.related_design_task_id && (
                    <span className="inline-flex items-center gap-1 text-xs bg-pink-500/10 text-pink-500 px-2 py-0.5 rounded-full">
                      <Image className="h-3 w-3" />Miniature liée
                    </span>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {getStatusBadge(item.status)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    setInlineEditTitle(item.title);
                    setInlineEditDesc(item.description || '');
                    const itemMeta = (item.metadata || {}) as any;
                    setInlineEditScriptDesc(itemMeta.description || '');
                    setInlineEditHashtags(itemMeta.hashtags ? itemMeta.hashtags.map((h: string) => `#${h}`).join(' ') : '');
                    setInlineEditId(item.id);
                  }}>
                    <Edit2 className="h-4 w-4 mr-2" />Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <CopywriterLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/copywriter/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {clientProfile?.logo_url ? (
              <img src={clientProfile.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor + '20' }}>
                <span className="text-lg font-bold" style={{ color: primaryColor }}>{clientProfile?.company_name?.[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{clientProfile?.company_name || 'Client'}</h1>
              <p className="text-muted-foreground text-sm">{clientProfile?.industry || ''} • {clientProfile?.contact_name || ''}</p>
              {clientProfile?.next_shooting_date && (
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">
                    {new Date(clientProfile.next_shooting_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {new Date(clientProfile.next_shooting_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {clientProfile?.studio_location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {clientProfile.studio_location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="ml-auto">
            <Dialog open={createOpen} onOpenChange={(v) => { 
              setCreateOpen(v); 
              if (!v) { resetCreateForm(); } 
              else { 
                const existingIdeaCount = content.filter((c: any) => c.workflow_step === 'idea').length;
                setIdeaItems([{ title: `Idée ${existingIdeaCount + 1}`, inspiration: '' }]);
                const existingScriptCount = content.filter((c: any) => c.workflow_step === 'script').length;
                setScriptItems([{ title: `Script ${existingScriptCount + 1}`, inspiration: '', scriptDescription: '', scriptHashtags: '' }]);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-violet-500 hover:bg-violet-600">
                  <Plus className="h-4 w-4 mr-2" />Créer du contenu
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouveau contenu</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">💡 Idée</SelectItem>
                        <SelectItem value="script">📝 Script</SelectItem>
                        <SelectItem value="planning">📅 Planning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Idea-specific: multi-idea fields */}
                  {newType === 'idea' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Idées ({ideaItems.length})</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addIdeaItem} className="gap-1">
                          <Plus className="h-3.5 w-3.5" />Ajouter une idée
                        </Button>
                      </div>
                      {ideaItems.map((item, index) => (
                        <div key={index} className="p-3 rounded-lg border border-border/50 space-y-2 relative">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Idée {index + 1}</span>
                            {ideaItems.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIdeaItem(index)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <Input 
                            value={item.title} 
                            onChange={(e) => updateIdeaItem(index, 'title', e.target.value)} 
                            placeholder="Titre de l'idée" 
                          />
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Sparkles className="h-3 w-3" />Inspiration (optionnel)
                            </Label>
                            <Input 
                              value={item.inspiration} 
                              onChange={(e) => updateIdeaItem(index, 'inspiration', e.target.value)} 
                              placeholder="Lien, référence ou note d'inspiration..." 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Script-specific: multi-script fields */}
                  {newType === 'script' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Scripts ({scriptItems.length})</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addScriptItem} className="gap-1">
                          <Plus className="h-3.5 w-3.5" />Ajouter un script
                        </Button>
                      </div>
                      {scriptItems.map((item, index) => (
                        <div key={index} className="p-3 rounded-lg border border-border/50 space-y-2 relative">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Script {index + 1}</span>
                            {scriptItems.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeScriptItem(index)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <Input 
                            value={item.title} 
                            onChange={(e) => updateScriptItem(index, 'title', e.target.value)} 
                            placeholder="Titre du script" 
                          />
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Sparkles className="h-3 w-3" />Inspiration (optionnel)
                            </Label>
                            <Textarea 
                              value={item.inspiration} 
                              onChange={(e) => updateScriptItem(index, 'inspiration', e.target.value)} 
                              placeholder="Collez ou écrivez le script ici... Le texte arabe sera automatiquement aligné à droite."
                              rows={8}
                               className="min-h-[300px] leading-relaxed whitespace-pre-wrap"
                               dir="auto"
                               style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3" />Description (pour le planning)
                            </Label>
                            <Textarea 
                              value={item.scriptDescription} 
                              onChange={(e) => updateScriptItem(index, 'scriptDescription', e.target.value)} 
                              placeholder="Description complète qui sera utilisée dans le planning..."
                              rows={4}
                               className="min-h-[100px] leading-relaxed whitespace-pre-wrap"
                               dir="auto"
                               style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1 mb-1">
                              <Hash className="h-3 w-3" />Hashtags (pour le planning)
                            </Label>
                            <Input 
                              value={item.scriptHashtags} 
                              onChange={(e) => updateScriptItem(index, 'scriptHashtags', e.target.value)} 
                              placeholder="#business #entrepreneur #motivation" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">Séparez par des espaces ou des virgules</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Planning: single title + description */}
                  {newType === 'planning' && (
                    <>
                      <div>
                        <Label>Titre</Label>
                        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Reel - 5 erreurs en business" />
                      </div>
                      <div>
                        <Label>Description / Caption</Label>
                        <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Texte de la publication, description..." rows={4} />
                      </div>
                    </>
                  )}

                  {/* Planning-specific fields */}
                  {newType === 'planning' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Date de publication</Label>
                          <Input type="date" value={planPublicationDate} onChange={(e) => setPlanPublicationDate(e.target.value)} />
                        </div>
                        <div>
                          <Label>Plateforme</Label>
                          <Select value={planPlatform} onValueChange={setPlanPlatform}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instagram">📸 Instagram</SelectItem>
                              <SelectItem value="youtube">🎬 YouTube</SelectItem>
                              <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                              <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                              <SelectItem value="twitter">🐦 X (Twitter)</SelectItem>
                              <SelectItem value="facebook">📘 Facebook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Hashtags</Label>
                        <Input 
                          value={planHashtags} 
                          onChange={(e) => setPlanHashtags(e.target.value)} 
                          placeholder="#business #entrepreneur #motivation" 
                        />
                        <p className="text-xs text-muted-foreground mt-1">Séparez par des espaces ou des virgules</p>
                      </div>

                      <div>
                        <Label className="flex items-center gap-1"><Video className="h-3.5 w-3.5" />Vidéo liée</Label>
                        <Select value={planLinkedVideoId || '_none'} onValueChange={(v) => setPlanLinkedVideoId(v === '_none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Aucune vidéo</SelectItem>
                            {clientVideos.map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="flex items-center gap-1"><Image className="h-3.5 w-3.5" />Miniature / Design lié</Label>
                        <Select value={planLinkedDesignTaskId || '_none'} onValueChange={(v) => setPlanLinkedDesignTaskId(v === '_none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Aucun design</SelectItem>
                            {clientDesignTasks.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="flex items-center gap-1"><Image className="h-3.5 w-3.5" />URL miniature (optionnel)</Label>
                        <Input value={planThumbnailUrl} onChange={(e) => setPlanThumbnailUrl(e.target.value)} placeholder="https://..." />
                      </div>
                    </>
                  )}

                  <Button 
                    onClick={handleCreate} 
                    disabled={creating || (newType === 'idea' ? ideaItems.every(i => !i.title.trim()) : newType === 'script' ? scriptItems.every(i => !i.title.trim()) : !newTitle.trim())} 
                    className="w-full bg-violet-500 hover:bg-violet-600"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {newType === 'idea' 
                      ? `Créer ${ideaItems.filter(i => i.title.trim()).length} idée${ideaItems.filter(i => i.title.trim()).length > 1 ? 's' : ''}` 
                      : newType === 'script'
                      ? `Créer ${scriptItems.filter(i => i.title.trim()).length} script${scriptItems.filter(i => i.title.trim()).length > 1 ? 's' : ''}`
                      : 'Créer'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>



        {/* Tabs */}
        <Tabs defaultValue="ideas">
          <TabsList className="flex-wrap">
            <TabsTrigger value="ideas" className="gap-2"><Lightbulb className="h-4 w-4" />Idées ({ideas.length})</TabsTrigger>
            <TabsTrigger value="scripts" className="gap-2"><FileText className="h-4 w-4" />Scripts ({scripts.length})</TabsTrigger>
            <TabsTrigger value="videos" className="gap-2"><Video className="h-4 w-4" />Vidéos ({clientVideos.length})</TabsTrigger>
            <TabsTrigger value="designs" className="gap-2"><Palette className="h-4 w-4" />Designs ({clientDesignTasks.length})</TabsTrigger>
            <TabsTrigger value="planning" className="gap-2"><CalendarDays className="h-4 w-4" />Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="ideas">
            {contentLoading ? <LoadingState /> : ideas.length === 0 ? <EmptyState text="Aucune idée. Créez votre première idée !" /> : (
              <div className="space-y-3">{ideas.map((item: any) => renderContentCard(item))}</div>
            )}
          </TabsContent>

          <TabsContent value="scripts">
            {contentLoading ? <LoadingState /> : scripts.length === 0 ? <EmptyState text="Aucun script. Commencez à rédiger !" /> : (
              <div className="space-y-3">{scripts.map((item: any) => renderContentCard(item))}</div>
            )}
          </TabsContent>

          <TabsContent value="planning">
            <CopywriterPlanningCalendar
              clientUserId={clientUserId!}
              clientVideos={clientVideos}
              clientDesignTasks={clientDesignTasks}
              clientScripts={scripts}
            />
          </TabsContent>

          <TabsContent value="videos">
            {clientVideos.length === 0 ? <EmptyState text="Aucune vidéo pour ce client." /> : (
              <div className="space-y-4">
                {clientTasks.filter((t: any) => clientVideos.some((v: any) => v.task_id === t.id)).map((task: any) => {
                  const taskVideos = clientVideos.filter((v: any) => v.task_id === task.id)
                    .sort((a: any, b: any) => {
                      const numA = parseInt(a.title.replace(/\D/g, '') || '0');
                      const numB = parseInt(b.title.replace(/\D/g, '') || '0');
                      return numA - numB;
                    });
                  const completed = taskVideos.filter((v: any) => v.status === 'completed').length;
                  const total = task.video_count || taskVideos.length;
                  const VIDEO_STATUS: Record<string, { label: string; color: string }> = {
                    new: { label: 'Nouveau', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
                    active: { label: 'En cours', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
                    late: { label: 'En retard', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
                    in_review: { label: 'En revue', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
                    review_client: { label: 'Envoyée', color: 'bg-violet-500/10 text-violet-500 border-violet-500/30' },
                    revision_requested: { label: 'Révision', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
                    completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
                  };
                  return (
                    <Card key={task.id} className="border-border/50 overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <Video className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                              <CardTitle className="text-sm">{task.title}</CardTitle>
                              {task.deadline && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  Deadline : {new Date(task.deadline).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{completed}/{total} terminées</p>
                            <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                           {taskVideos.map((video: any) => {
                             const vs = VIDEO_STATUS[video.status] || VIDEO_STATUS.new;
                             return (
                               <button
                                 key={video.id}
                                  onClick={() => { setSelectedVideo({ ...video, taskTitle: task.title }); setVideoDetailOpen(true); }}
                                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-colors text-left w-full"
                               >
                                 <div className="flex items-center gap-2 min-w-0">
                                   <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                   <span className="text-sm font-medium truncate">{video.title}</span>
                                 </div>
                                 <Badge variant="outline" className={`${vs.color} text-xs shrink-0 ml-2`}>{vs.label}</Badge>
                               </button>
                             );
                           })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="designs">
            {clientDesignTasks.length === 0 ? <EmptyState text="Aucun design pour ce client." /> : (
              <CopywriterDesignGallery designs={clientDesignTasks} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{detailItem.title}</DialogTitle>
                  {getStatusBadge(detailItem.status)}
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                {detailItem.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Contenu</Label>
                     <p 
                       dir="auto"
                       className="text-sm whitespace-pre-wrap mt-1 bg-muted/30 rounded-lg p-4 leading-relaxed"
                       style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                     >{detailItem.description}</p>
                  </div>
                )}

                {detailItem.workflow_step === 'planning' && detailItem.metadata && (() => {
                  const meta = detailItem.metadata as any;
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {meta.publication_date && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Date de publication</Label>
                          <p className="text-sm font-medium mt-1">{format(new Date(meta.publication_date), 'dd MMMM yyyy', { locale: fr })}</p>
                        </div>
                      )}
                      {meta.platform && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Plateforme</Label>
                          <p className="text-sm font-medium mt-1 capitalize">{meta.platform}</p>
                        </div>
                      )}
                      {meta.hashtags?.length > 0 && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground text-xs">Hashtags</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {meta.hashtags.map((h: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">#{h}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {meta.thumbnail_url && (
                        <div className="col-span-2">
                          <Label className="text-muted-foreground text-xs">Miniature</Label>
                          <img src={meta.thumbnail_url} alt="Thumbnail" className="mt-1 rounded-lg max-h-48 object-cover" />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {detailItem.related_video_id && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Vidéo liée</Label>
                    <p className="text-sm font-medium mt-1 flex items-center gap-1">
                      <Video className="h-3.5 w-3.5 text-emerald-500" />
                      {clientVideos.find((v: any) => v.id === detailItem.related_video_id)?.title || 'Vidéo'}
                    </p>
                  </div>
                )}

                {detailItem.related_design_task_id && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Design lié</Label>
                    <p className="text-sm font-medium mt-1 flex items-center gap-1">
                      <Image className="h-3.5 w-3.5 text-pink-500" />
                      {clientDesignTasks.find((d: any) => d.id === detailItem.related_design_task_id)?.title || 'Design'}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Créé le {new Date(detailItem.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>

                {/* Actions */}
                {detailItem.status === 'draft' && (
                  <Button 
                    onClick={() => handleSubmitForReview(detailItem.id)} 
                    className="w-full bg-violet-500 hover:bg-violet-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Soumettre pour validation
                  </Button>
                )}
                {detailItem.status === 'revision_requested' && (
                  <div className="space-y-3">
                    {(detailItem.metadata as any)?.revision_note && (
                      <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-1">
                        <p className="text-xs font-medium text-orange-500 flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          Note du client
                        </p>
                        <p className="text-sm">{(detailItem.metadata as any).revision_note}</p>
                      </div>
                    )}

                    {!isEditing ? (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditTitle(detailItem.title);
                            setEditDescription(detailItem.description || '');
                            setIsEditing(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Modifier le contenu
                        </Button>
                        <Button 
                          onClick={() => handleSubmitForReview(detailItem.id)} 
                          className="flex-1 bg-orange-500 hover:bg-orange-600"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Resoumettre
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-lg border p-3">
                        <div>
                          <Label className="text-xs">Titre</Label>
                          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Description / Contenu</Label>
                          <Textarea 
                            value={editDescription} 
                            onChange={(e) => setEditDescription(e.target.value)} 
                            rows={8}
                             className="min-h-[300px] leading-relaxed whitespace-pre-wrap"
                             dir="auto"
                             style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Annuler</Button>
                          <Button 
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={async () => {
                              const existingMeta = (detailItem.metadata || {}) as Record<string, any>;
                              const updatedMeta = { ...existingMeta, inspiration: editDescription.trim() || undefined };
                              const { error } = await supabase
                                .from('client_content_items')
                                .update({ 
                                  title: editTitle.trim(), 
                                  description: editDescription.trim() || null,
                                  metadata: updatedMeta as any,
                                  status: 'pending_review',
                                })
                                .eq('id', detailItem.id);
                              if (error) { toast.error('Erreur'); return; }
                              toast.success('Contenu modifié et resoumis !');
                              invalidateContent();
                              setIsEditing(false);
                              setDetailOpen(false);
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Modifier & Resoumettre
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Detail Modal */}
      <Dialog open={videoDetailOpen} onOpenChange={setVideoDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedVideo && (() => {
            const VIDEO_STATUS_MODAL: Record<string, { label: string; color: string }> = {
              new: { label: 'Nouveau', color: 'bg-emerald-500/10 text-emerald-500' },
              active: { label: 'En cours', color: 'bg-blue-500/10 text-blue-500' },
              late: { label: 'En retard', color: 'bg-red-500/10 text-red-500' },
              review_admin: { label: 'En revue admin', color: 'bg-amber-500/10 text-amber-500' },
              review_client: { label: 'Envoyée au client', color: 'bg-violet-500/10 text-violet-500' },
              revision_requested: { label: 'Révision demandée', color: 'bg-orange-500/10 text-orange-500' },
              completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-500' },
              cancelled: { label: 'Annulé', color: 'bg-muted text-muted-foreground' },
            };
            const vs = VIDEO_STATUS_MODAL[selectedVideo.status] || VIDEO_STATUS_MODAL.new;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-violet-500" />
                      {selectedVideo.title}
                    </DialogTitle>
                    <Badge className={`${vs.color} border-0`}>{vs.label}</Badge>
                  </div>
                </DialogHeader>

                {/* Video Player */}
                {deliveryLoading || signingVideo ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : signedIframeUrl ? (
                  <div className="rounded-lg overflow-hidden bg-black aspect-video">
                    <iframe
                      src={signedIframeUrl}
                      className="w-full h-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : videoDelivery?.external_link ? (
                  <div className="rounded-lg border border-border/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Lien externe de la vidéo</p>
                    <a href={videoDelivery.external_link} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-500 hover:underline break-all">
                      {videoDelivery.external_link}
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                    <Video className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune livraison disponible</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Projet</Label>
                    <p className="text-sm font-medium">{selectedVideo.taskTitle}</p>
                  </div>
                  {selectedVideo.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p dir="auto" className="text-sm text-muted-foreground whitespace-pre-wrap" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{selectedVideo.description}</p>
                    </div>
                  )}
                  {selectedVideo.deadline && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Deadline</Label>
                      <p className="text-sm font-medium">{new Date(selectedVideo.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  )}
                  <div className="flex gap-6">
                    <div>
                      <Label className="text-xs text-muted-foreground">Révisions</Label>
                      <p className="text-sm font-medium">{selectedVideo.revision_count || 0}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date de création</Label>
                      <p className="text-sm font-medium">{new Date(selectedVideo.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Design detail modal removed - gallery is now inline */}
    </CopywriterLayout>
  );
}

function CopywriterDesignGallery({ designs }: { designs: any[] }) {
  const [filter, setFilter] = useState('all');

  // Flatten all items from all design tasks
  const allItems = designs.flatMap((design: any) =>
    (design.items || []).map((item: any) => ({ ...item, designTitle: design.title, designDeadline: design.deadline }))
  );

  // Categorize items
  const getCategory = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('miniature') || l.includes('thumbnail')) return 'miniatures';
    if (l.includes('carrousel') || l.includes('carousel')) return 'carrousels';
    return 'posts';
  };

  const miniatures = allItems.filter(i => getCategory(i.label) === 'miniatures');
  const posts = allItems.filter(i => getCategory(i.label) === 'posts');
  const carrousels = allItems.filter(i => getCategory(i.label) === 'carrousels');

  const filteredItems = filter === 'all' ? allItems
    : filter === 'miniatures' ? miniatures
    : filter === 'carrousels' ? carrousels
    : posts;

  const ITEM_STATUS: Record<string, { label: string; color: string; icon: string }> = {
    delivered: { label: 'Livré au client', color: 'text-blue-500', icon: '📤' },
    validated: { label: 'Validé', color: 'text-emerald-500', icon: '✅' },
    revision: { label: 'Modification', color: 'text-orange-500', icon: '🔄' },
    pending: { label: 'En attente', color: 'text-muted-foreground', icon: '⏳' },
  };

  // Section title based on filter
  const sectionTitle = filter === 'miniatures' ? 'Miniatures' : filter === 'posts' ? 'Posts' : filter === 'carrousels' ? 'Carrousels' : 'Tous les designs';

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-foreground text-background' : ''}
        >
          Tout ({allItems.length})
        </Button>
        {miniatures.length > 0 && (
          <Button
            variant={filter === 'miniatures' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('miniatures')}
            className={filter === 'miniatures' ? 'bg-foreground text-background' : ''}
          >
            Miniatures ({miniatures.length})
          </Button>
        )}
        {posts.length > 0 && (
          <Button
            variant={filter === 'posts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('posts')}
            className={filter === 'posts' ? 'bg-foreground text-background' : ''}
          >
            Posts ({posts.length})
          </Button>
        )}
        {carrousels.length > 0 && (
          <Button
            variant={filter === 'carrousels' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('carrousels')}
            className={filter === 'carrousels' ? 'bg-foreground text-background' : ''}
          >
            Carrousels ({carrousels.length})
          </Button>
        )}
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-pink-500" />
        <h3 className="text-lg font-bold">{sectionTitle}</h3>
        <Badge variant="outline" className="text-xs">{filteredItems.length}</Badge>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item: any, idx: number) => {
          const is = ITEM_STATUS[item.status] || ITEM_STATUS.pending;
          const hasImage = !!item.latestDelivery?.file_path;
          return (
            <div key={idx} className="rounded-xl border border-border/50 overflow-hidden bg-card hover:shadow-md transition-shadow">
              {hasImage ? (
                <div className="aspect-square bg-muted/10">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${item.latestDelivery.file_path}`}
                    alt={item.label}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-muted/20 flex flex-col items-center justify-center gap-2">
                  <Image className="h-10 w-10 text-muted-foreground/20" />
                  <span className="text-xs text-muted-foreground">En attente de livraison</span>
                </div>
              )}
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium truncate">{item.label}</span>
                <span className={`text-xs font-medium ${is.color} flex items-center gap-1 shrink-0 ml-2`}>
                  {is.icon} {is.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
