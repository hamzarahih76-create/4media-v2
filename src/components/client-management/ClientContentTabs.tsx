import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPlaybackUrls } from '@/lib/api/cloudflareStream';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Lightbulb, FileText, Video, Palette, CalendarDays, Clock,
  CheckCircle, RotateCcw, Send, Hash, Image, Loader2,
  ChevronLeft, ChevronRight, Camera, MapPin
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Status configs ───
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: FileText },
  in_progress: { label: 'En cours', color: 'bg-blue-500/10 text-blue-500', icon: Clock },
  pending_review: { label: 'En attente validation', color: 'bg-amber-500/10 text-amber-500', icon: Clock },
  validated: { label: 'Validé', color: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle },
  delivered: { label: 'Publié', color: 'bg-blue-500/10 text-blue-500', icon: Send },
  revision_requested: { label: 'Modification demandée', color: 'bg-orange-500/10 text-orange-500', icon: RotateCcw },
};

const VIDEO_STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  active: { label: 'En cours', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  late: { label: 'En retard', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
  in_review: { label: 'En revue', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  review_admin: { label: 'En revue PM', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  review_client: { label: 'Envoyée', color: 'bg-violet-500/10 text-violet-500 border-violet-500/30' },
  revision_requested: { label: 'Modification', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
};

interface ClientContentTabsProps {
  clientUserId: string;
}

export function ClientContentTabs({ clientUserId }: ClientContentTabsProps) {
  // ─── Data fetching ───
  const { data: contentItems = [] } = useQuery({
    queryKey: ['admin-client-content', clientUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_content_items')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: videoTasks = [] } = useQuery({
    queryKey: ['admin-client-video-tasks', clientUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, deadline, video_count, videos_completed, status')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const taskIds = videoTasks.map((t: any) => t.id);

  const { data: clientVideos = [] } = useQuery({
    queryKey: ['admin-client-videos-list', clientUserId, taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return [];
      const { data } = await supabase
        .from('videos')
        .select('id, title, task_id, status, deadline, created_at, description, revision_count')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: taskIds.length > 0,
  });

  const { data: designTasks = [] } = useQuery({
    queryKey: ['admin-client-design-tasks', clientUserId],
    queryFn: async () => {
      const { data: tasks } = await supabase
        .from('design_tasks')
        .select('id, title, status, deadline, description')
        .eq('client_user_id', clientUserId);
      if (!tasks || tasks.length === 0) return [];

      const dtIds = tasks.map(t => t.id);
      const [{ data: deliveries }, { data: feedbacks }] = await Promise.all([
        supabase.from('design_deliveries').select('id, design_task_id, version_number, notes, file_path').in('design_task_id', dtIds),
        supabase.from('design_feedback').select('design_task_id, delivery_id, decision, revision_notes').in('design_task_id', dtIds),
      ]);

      return tasks.map(task => {
        const taskDeliveries = (deliveries || []).filter(d => d.design_task_id === task.id);
        const taskFeedbacks = (feedbacks || []).filter(f => f.design_task_id === task.id);

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

        expectedItems.forEach(ei => {
          if (!itemMap.has(ei.label)) {
            itemMap.set(ei.label, { label: ei.label, status: 'pending', latestDelivery: null });
          }
        });

        return { ...task, items: Array.from(itemMap.values()) };
      });
    },
  });

  const { data: planningItems = [] } = useQuery({
    queryKey: ['admin-client-planning', clientUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_content_items')
        .select('*')
        .eq('client_user_id', clientUserId)
        .eq('workflow_step', 'planning')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ─── Video detail modal state ───
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [videoDetailOpen, setVideoDetailOpen] = useState(false);
  const [signedIframeUrl, setSignedIframeUrl] = useState<string | null>(null);
  const [signingVideo, setSigningVideo] = useState(false);

  // Fetch latest delivery for selected video
  const { data: videoDelivery, isLoading: deliveryLoading } = useQuery({
    queryKey: ['admin-video-delivery', selectedVideo?.id],
    queryFn: async () => {
      if (!selectedVideo?.id) return null;
      const { data } = await supabase
        .from('video_deliveries')
        .select('*')
        .eq('video_id', selectedVideo.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedVideo?.id && videoDetailOpen,
  });

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

  // ─── Content detail modal state ───
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ─── Filtered content ───
  const ideas = contentItems.filter((i: any) => i.workflow_step === 'idea');
  const scripts = contentItems.filter((i: any) => i.workflow_step === 'script');

  return (
    <>
      <Tabs defaultValue="ideas" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="ideas" className="gap-1.5 text-xs">
            <Lightbulb className="h-3.5 w-3.5" /> Idées ({ideas.length})
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Scripts ({scripts.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5 text-xs">
            <Video className="h-3.5 w-3.5" /> Vidéos ({clientVideos.length})
          </TabsTrigger>
          <TabsTrigger value="designs" className="gap-1.5 text-xs">
            <Palette className="h-3.5 w-3.5" /> Designs ({designTasks.length})
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> Planning
          </TabsTrigger>
        </TabsList>

        {/* ═══ Ideas ═══ */}
        <TabsContent value="ideas" className="mt-3">
          {ideas.length === 0 ? (
            <EmptyState icon={Lightbulb} text="Aucune idée" />
          ) : (
            <div className="space-y-3">
              {ideas.map((item: any) => (
                <ContentCard key={item.id} item={item} onClick={() => { setDetailItem(item); setDetailOpen(true); }} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ Scripts ═══ */}
        <TabsContent value="scripts" className="mt-3">
          {scripts.length === 0 ? (
            <EmptyState icon={FileText} text="Aucun script" />
          ) : (
            <div className="space-y-3">
              {scripts.map((item: any) => (
                <ContentCard key={item.id} item={item} onClick={() => { setDetailItem(item); setDetailOpen(true); }} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ Videos ═══ */}
        <TabsContent value="videos" className="mt-3">
          {clientVideos.length === 0 ? (
            <EmptyState icon={Video} text="Aucune vidéo" />
          ) : (
            <div className="space-y-4">
              {videoTasks.filter((t: any) => clientVideos.some((v: any) => v.task_id === t.id)).map((task: any) => {
                const taskVideos = clientVideos
                  .filter((v: any) => v.task_id === task.id)
                  .sort((a: any, b: any) => {
                    const numA = parseInt(a.title.replace(/\D/g, '') || '0');
                    const numB = parseInt(b.title.replace(/\D/g, '') || '0');
                    return numA - numB;
                  });
                const completed = taskVideos.filter((v: any) => v.status === 'completed').length;
                const total = task.video_count || taskVideos.length;
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
                              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors text-left w-full"
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

        {/* ═══ Designs ═══ */}
        <TabsContent value="designs" className="mt-3">
          {designTasks.length === 0 ? (
            <EmptyState icon={Palette} text="Aucun design" />
          ) : (
            <DesignGallery designs={designTasks} />
          )}
        </TabsContent>

        {/* ═══ Planning ═══ */}
        <TabsContent value="planning" className="mt-3">
          <PlanningCalendar planningItems={planningItems} clientVideos={clientVideos} clientUserId={clientUserId} />
        </TabsContent>
      </Tabs>

      {/* ═══ Content Detail Modal ═══ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {detailItem && (() => {
            const s = STATUS_MAP[detailItem.status] || STATUS_MAP.draft;
            const StatusIcon = s.icon;
            const meta = (detailItem.metadata || {}) as any;
            const description = meta?.inspiration || detailItem.description;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle>{detailItem.title}</DialogTitle>
                    <Badge className={`${s.color} border-0 gap-1`}>
                      <StatusIcon className="h-3 w-3" />{s.label}
                    </Badge>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  {description && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Contenu</Label>
                      <p
                        dir="auto"
                        className="text-sm whitespace-pre-wrap mt-1 bg-muted/30 rounded-lg p-4 leading-relaxed"
                        style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                      >{description}</p>
                    </div>
                  )}
                  {meta?.hashtags?.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Hashtags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {meta.hashtags.map((h: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">#{h}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {meta?.description && detailItem.workflow_step === 'script' && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Description (planning)</Label>
                      <p dir="auto" className="text-sm whitespace-pre-wrap mt-1" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{meta.description}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Créé le {new Date(detailItem.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ Video Detail Modal ═══ */}
      <Dialog open={videoDetailOpen} onOpenChange={setVideoDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedVideo && (() => {
            const vs = VIDEO_STATUS[selectedVideo.status] || VIDEO_STATUS.new;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
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
                    <a href={videoDelivery.external_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
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
    </>
  );
}

// ═══════════════════════════════════════════
// ContentCard — Ideas & Scripts (like copywriter)
// ═══════════════════════════════════════════
function ContentCard({ item, onClick }: { item: any; onClick: () => void }) {
  const meta = (item.metadata || {}) as any;
  const s = STATUS_MAP[item.status] || STATUS_MAP.draft;
  const StatusIcon = s.icon;
  const description = meta?.inspiration || item.description;

  return (
    <Card
      className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{item.title}</h3>
            {description && (
              <p
                dir="auto"
                className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-2"
                style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
              >{description}</p>
            )}
            {item.workflow_step === 'script' && meta?.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                  <Hash className="h-3 w-3" />
                  {meta.hashtags.map((h: string) => `#${h}`).join(' ')}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="shrink-0">
            <Badge className={`${s.color} border-0 gap-1`}>
              <StatusIcon className="h-3 w-3" />{s.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// DesignGallery — With images and filters (like copywriter)
// ═══════════════════════════════════════════
function DesignGallery({ designs }: { designs: any[] }) {
  const [filter, setFilter] = useState('all');

  const allItems = designs.flatMap((design: any) =>
    (design.items || []).map((item: any) => ({ ...item, designTitle: design.title, designDeadline: design.deadline }))
  );

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
    pending: { label: 'En attente de livraison', color: 'text-muted-foreground', icon: '⏳' },
  };

  const sectionTitle = filter === 'miniatures' ? 'Miniatures' : filter === 'posts' ? 'Posts' : filter === 'carrousels' ? 'Carrousels' : 'Tous les designs';

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-foreground text-background' : ''}>
          Tout ({allItems.length})
        </Button>
        {miniatures.length > 0 && (
          <Button variant={filter === 'miniatures' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('miniatures')}
            className={filter === 'miniatures' ? 'bg-foreground text-background' : ''}>
            Miniatures ({miniatures.length})
          </Button>
        )}
        {posts.length > 0 && (
          <Button variant={filter === 'posts' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('posts')}
            className={filter === 'posts' ? 'bg-foreground text-background' : ''}>
            Posts ({posts.length})
          </Button>
        )}
        {carrousels.length > 0 && (
          <Button variant={filter === 'carrousels' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('carrousels')}
            className={filter === 'carrousels' ? 'bg-foreground text-background' : ''}>
            Carrousels ({carrousels.length})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-pink-500" />
        <h3 className="text-lg font-bold">{sectionTitle}</h3>
        <Badge variant="outline" className="text-xs">{filteredItems.length}</Badge>
      </div>

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

// ═══════════════════════════════════════════
// PlanningCalendar — Read-only calendar (like copywriter)
// ═══════════════════════════════════════════
function PlanningCalendar({ planningItems, clientVideos, clientUserId }: { planningItems: any[]; clientVideos: any[]; clientUserId?: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [detailItems, setDetailItems] = useState<any[] | null>(null);

  // Fetch shooting date for this client
  const { data: clientShootingInfo } = useQuery({
    queryKey: ['client-shooting-info', clientUserId],
    queryFn: async () => {
      if (!clientUserId) return null;
      const { data } = await supabase
        .from('client_profiles')
        .select('next_shooting_date, studio_location')
        .eq('user_id', clientUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientUserId,
  });

  const shootingDateKey = clientShootingInfo?.next_shooting_date
    ? format(new Date(clientShootingInfo.next_shooting_date), 'yyyy-MM-dd')
    : null;

  const itemsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    planningItems.forEach((item: any) => {
      const meta = item.metadata as any;
      if (meta?.publication_date) {
        const key = meta.publication_date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      }
    });
    return map;
  }, [planningItems]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Stats
  const monthItems = planningItems.filter((item: any) => {
    const meta = item.metadata as any;
    if (!meta?.publication_date) return false;
    const d = new Date(meta.publication_date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });
  const videoCount = monthItems.filter((i: any) => (i.metadata as any)?.content_subtype === 'video' || i.related_video_id).length;
  const designCount = monthItems.filter((i: any) => (i.metadata as any)?.content_subtype === 'design' || i.related_design_task_id).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-bold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {weekDays.map(d => (
          <div key={d} className="bg-muted/50 text-center py-2 text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const isShootingDay = shootingDateKey === dateKey;

          return (
            <div
              key={idx}
              onClick={() => { if (dayItems.length > 0 && isCurrentMonth) setDetailItems(dayItems); }}
              className={`bg-card min-h-[80px] p-1.5 transition-colors ${
                !isCurrentMonth ? 'opacity-30' : ''
              } ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''} ${
                dayItems.length > 0 && isCurrentMonth ? 'cursor-pointer hover:bg-accent/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </span>
                {dayItems.length > 0 && isCurrentMonth && (
                  <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
                    {dayItems.length}
                  </span>
                )}
              </div>
              {isShootingDay && isCurrentMonth && clientShootingInfo && (
                <div className="text-[10px] px-1.5 py-0.5 rounded truncate bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                  <Camera className="h-2.5 w-2.5 shrink-0" />
                  Tournage {new Date(clientShootingInfo.next_shooting_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div className="space-y-0.5">
                {dayItems.slice(0, 2).map((item: any, i: number) => {
                  const meta = item.metadata as any;
                  const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
                  return (
                    <div
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                        isVideo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-pink-500/10 text-pink-600'
                      }`}
                    >
                      {isVideo ? '🎬' : '🎨'} {item.title}
                    </div>
                  );
                })}
                {dayItems.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">+{dayItems.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>📅 {monthItems.length} contenus ce mois</span>
        <span>🎬 {videoCount} vidéos</span>
        <span>🎨 {designCount} designs</span>
      </div>

      {/* Day detail modal */}
      <Dialog open={!!detailItems} onOpenChange={(o) => !o && setDetailItems(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          {detailItems && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Contenus planifiés — {detailItems[0]?.metadata?.publication_date
                    ? format(new Date(detailItems[0].metadata.publication_date), 'dd MMMM yyyy', { locale: fr })
                    : ''}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {detailItems.map((item: any) => (
                  <PlanningItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════
// EmptyState
// ═══════════════════════════════════════════
// PlanningItemCard — Shows video player + thumbnail in planning popup
// ═══════════════════════════════════════════
function PlanningItemCard({ item }: { item: any }) {
  const meta = (item.metadata || {}) as any;
  const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
  const videoId = item.related_video_id || meta?.video_id;
  const thumbnailDeliveryId = meta?.thumbnail_delivery_id;

  // Fetch video delivery if it's a video item
  const { data: videoDelivery } = useQuery({
    queryKey: ['planning-video-delivery', videoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('video_deliveries')
        .select('*')
        .eq('video_id', videoId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!videoId && isVideo,
  });

  // Get signed URL for Cloudflare video
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIframeUrl(null);
    if (!videoDelivery?.cloudflare_stream_id) return;
    setLoading(true);
    supabase.functions
      .invoke('cloudflare-stream-signed-url', {
        body: { cloudflareVideoId: videoDelivery.cloudflare_stream_id }
      })
      .then(({ data }) => {
        if (data?.iframeUrl) setIframeUrl(data.iframeUrl);
      })
      .finally(() => setLoading(false));
  }, [videoDelivery?.cloudflare_stream_id]);

  // Fetch thumbnail image if linked
  const { data: thumbnailDelivery } = useQuery({
    queryKey: ['planning-thumbnail-delivery', thumbnailDeliveryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('design_deliveries')
        .select('file_path')
        .eq('id', thumbnailDeliveryId)
        .maybeSingle();
      return data;
    },
    enabled: !!thumbnailDeliveryId,
  });

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {isVideo ? <Video className="h-4 w-4 text-emerald-500" /> : <Palette className="h-4 w-4 text-pink-500" />}
          <span className="font-medium text-sm">{item.title}</span>
        </div>

        {/* Video Player */}
        {isVideo && videoId && (
          loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : iframeUrl ? (
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
              <iframe
                src={iframeUrl}
                className="w-full h-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : videoDelivery?.external_link ? (
            <div className="rounded-lg border border-border/50 p-3 text-center">
              <a href={videoDelivery.external_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">
                {videoDelivery.external_link}
              </a>
            </div>
          ) : null
        )}

        {/* Thumbnail */}
        {thumbnailDelivery?.file_path && (
          <div className="rounded-lg overflow-hidden border border-border/50">
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${thumbnailDelivery.file_path}`}
              alt="Miniature"
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {item.description && (
          <p dir="auto" className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{item.description}</p>
        )}
        {meta?.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {meta.hashtags.map((h: string, i: number) => (
              <Badge key={i} variant="outline" className="text-[10px]">#{h}</Badge>
            ))}
          </div>
        )}
        {meta?.platform && (
          <span className="text-xs text-muted-foreground capitalize">📱 {meta.platform}</span>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
