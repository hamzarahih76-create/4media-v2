import { useState, useMemo, useCallback, useEffect } from 'react';
import { getPlaybackUrls } from '@/lib/api/cloudflareStream';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2,
  Hash, Image, Video, Trash2, Palette, Clock, Check, Play, X, Pencil, Camera, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  clientUserId: string;
  clientVideos: any[];
  clientDesignTasks: any[];
  clientScripts?: any[];
}

export function CopywriterPlanningCalendar({ clientUserId, clientVideos, clientDesignTasks, clientScripts = [] }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form state
  const [contentType, setContentType] = useState<'video' | 'design'>('video');
  const [linkedVideoId, setLinkedVideoId] = useState('');
  const [linkedDesignTaskId, setLinkedDesignTaskId] = useState('');
  const [selectedThumbnailId, setSelectedThumbnailId] = useState(''); // delivery id for unique thumbnail selection
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [recommendedTimeStart, setRecommendedTimeStart] = useState('');
  const [recommendedTimeEnd, setRecommendedTimeEnd] = useState('');
  const [creating, setCreating] = useState(false);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null); // cloudflare stream id for preview
  const [previewIframeUrl, setPreviewIframeUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch planning items for this client
  const { data: planningItems = [], isLoading } = useQuery({
    queryKey: ['copywriter-planning-calendar', clientUserId],
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
    enabled: !!clientUserId,
  });

  // Fetch shooting date for this client
  const { data: clientShootingInfo } = useQuery({
    queryKey: ['copywriter-client-shooting', clientUserId],
    queryFn: async () => {
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

  // Fetch design deliveries to find thumbnails linked to specific videos
  const designTaskIds = clientDesignTasks.map((d: any) => d.id);
  const { data: designDeliveries = [] } = useQuery({
    queryKey: ['copywriter-design-deliveries', designTaskIds],
    queryFn: async () => {
      if (designTaskIds.length === 0) return [];
      const { data } = await supabase
        .from('design_deliveries')
        .select('id, design_task_id, version_number, notes, file_path')
        .in('design_task_id', designTaskIds)
        .order('version_number', { ascending: false });
      return data || [];
    },
    enabled: designTaskIds.length > 0,
  });

  // Fetch video deliveries for thumbnails (Cloudflare Stream)
  const videoIds = clientVideos.map((v: any) => v.id);
  const { data: videoDeliveries = [] } = useQuery({
    queryKey: ['copywriter-video-deliveries', videoIds],
    queryFn: async () => {
      if (videoIds.length === 0) return [];
      const { data } = await supabase
        .from('video_deliveries')
        .select('id, video_id, cloudflare_stream_id, version_number')
        .in('video_id', videoIds)
        .order('version_number', { ascending: false });
      return data || [];
    },
    enabled: videoIds.length > 0,
  });

  // Build video items with signed thumbnail URLs from Cloudflare
  const [signedThumbnails, setSignedThumbnails] = useState<Record<string, string>>({});
  
  // Fetch signed thumbnail URLs when deliveries change
  useEffect(() => {
    const fetchThumbnails = async () => {
      const deliveriesWithStream = videoDeliveries.filter((d: any) => d.cloudflare_stream_id);
      if (deliveriesWithStream.length === 0) return;
      
      for (const d of deliveriesWithStream) {
        try {
          const result = await getPlaybackUrls(d.cloudflare_stream_id, 'preview');
          if (result.success && result.thumbnail) {
            setSignedThumbnails(prev => ({ ...prev, [d.video_id]: result.thumbnail! }));
          }
        } catch (e) {
          console.error('Failed to fetch thumbnail for video:', d.video_id, e);
        }
      }
    };
    fetchThumbnails();
  }, [videoDeliveries]);

  // Build video items with signed thumbnail URLs
  const videoItemsWithDeliveries = useMemo(() => {
    return clientVideos.map((v: any) => {
      const delivery = videoDeliveries.find((d: any) => d.video_id === v.id && d.cloudflare_stream_id);
      return { ...v, streamId: delivery?.cloudflare_stream_id || null, thumbnailUrl: signedThumbnails[v.id] || null };
    });
  }, [clientVideos, videoDeliveries, signedThumbnails]);

  const validatedScripts = useMemo(() => {
    return clientScripts.filter((s: any) => s.workflow_step === 'script');
  }, [clientScripts]);

  // Get scripts matching selected video (by title pattern)
  const matchingScripts = useMemo(() => {
    if (!linkedVideoId) return [];
    const video = clientVideos.find((v: any) => v.id === linkedVideoId);
    if (!video) return [];
    const vTitle = (video.title || '').toLowerCase().trim();
    
    return validatedScripts.filter((s: any) => {
      const sTitle = (s.title || '').toLowerCase().replace(/script\s*/i, '').trim();
      return sTitle === vTitle || vTitle.includes(sTitle) || sTitle.includes(vTitle);
    });
  }, [linkedVideoId, clientVideos, validatedScripts]);

  // Get ALL script descriptions available for this client
  const availableDescriptions = useMemo(() => {
    const descs: { label: string; value: string }[] = [];
    validatedScripts.forEach((s: any) => {
      const meta = s.metadata as any;
      if (meta?.description) {
        descs.push({ label: `${s.title}: ${meta.description.substring(0, 60)}...`, value: meta.description });
      }
    });
    return descs;
  }, [validatedScripts]);

  // Get ALL script hashtags available for this client
  const availableHashtags = useMemo(() => {
    const tags: { label: string; value: string }[] = [];
    validatedScripts.forEach((s: any) => {
      const meta = s.metadata as any;
      if (meta?.hashtags?.length > 0) {
        const formatted = meta.hashtags.map((h: string) => `#${h}`).join(' ');
        tags.push({ label: `${s.title}: ${formatted.substring(0, 60)}...`, value: formatted });
      }
    });
    return tags;
  }, [validatedScripts]);

  // Build individual thumbnail items from design deliveries with image URLs (deduplicated by label)
  const thumbnailItems = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; designTaskId: string; imageUrl: string | null }>();
    designDeliveries.forEach((d: any) => {
      const noteMatch = d.notes?.match(/\[([^\]]+)\]/);
      const label = noteMatch ? noteMatch[1] : null;
      if (!label) return;
      if (!seen.has(label)) {
        const imageUrl = d.file_path
          ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${d.file_path}`
          : null;
        seen.set(label, { id: d.id, label, designTaskId: d.design_task_id, imageUrl });
      }
    });
    return Array.from(seen.values());
  }, [designDeliveries]);

  // Calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group planning items by date
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

  const resetForm = () => {
    setContentType('video');
    setLinkedVideoId('');
    setLinkedDesignTaskId('');
    setSelectedThumbnailId('');
    setDescription('');
    setHashtags('');
    setPlatform('instagram');
    setRecommendedTimeStart('');
    setRecommendedTimeEnd('');
  };

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, currentMonth)) return;
    setSelectedDate(day);
    
    const dateKey = format(day, 'yyyy-MM-dd');
    const existing = itemsByDate.get(dateKey);
    if (existing && existing.length > 0) {
      setDetailItem(existing);
      return;
    }
    
    resetForm();
    setFormOpen(true);
  };

  const handleCreate = async () => {
    if (!clientUserId || !user?.id || !selectedDate) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const linkedVideo = clientVideos.find((v: any) => v.id === linkedVideoId);
    const linkedDesign = clientDesignTasks.find((d: any) => d.id === linkedDesignTaskId);
    
    let title = '';
    if (contentType === 'video' && linkedVideo) {
      title = linkedVideo.title;
    } else if (contentType === 'design' && linkedDesign) {
      title = linkedDesign.title;
    }
    
    if (!title) {
      toast.error('Sélectionnez un contenu à planifier');
      return;
    }

    setCreating(true);
    try {
      const hashtagList = hashtags.split(/[,\s#]+/).filter(Boolean).map(h => h.trim());
      const metadata = {
        publication_date: dateStr,
        hashtags: hashtagList,
        platform,
        content_subtype: contentType,
        recommended_time_start: recommendedTimeStart || null,
        recommended_time_end: recommendedTimeEnd || null,
        description: description.trim() || null,
        hashtags_text: hashtags.trim() || null,
        selected_thumbnail_delivery_id: selectedThumbnailId || null,
      };

      const { error } = await supabase.from('client_content_items').insert({
        client_user_id: clientUserId,
        title,
        description: description.trim() || null,
        workflow_step: 'planning',
        content_type: 'planning',
        created_by: user.id,
        status: 'validated',
        related_video_id: contentType === 'video' ? linkedVideoId || null : null,
        related_design_task_id: linkedDesignTaskId || null,
        metadata: metadata as any,
      });
      if (error) throw error;
      toast.success('Contenu planifié !');
      setFormOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['copywriter-planning-calendar', clientUserId] });
      queryClient.invalidateQueries({ queryKey: ['copywriter-client-content', clientUserId] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Supprimer ce contenu du planning ?')) return;
    const { error } = await supabase.from('client_content_items').delete().eq('id', itemId);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Supprimé du planning');
    setDetailItem(null);
    queryClient.invalidateQueries({ queryKey: ['copywriter-planning-calendar', clientUserId] });
    queryClient.invalidateQueries({ queryKey: ['copywriter-client-content', clientUserId] });
  };

  const handleEditItem = (item: any) => {
    const meta = item.metadata as any;
    const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
    setContentType(isVideo ? 'video' : 'design');
    setLinkedVideoId(item.related_video_id || '');
    setLinkedDesignTaskId(item.related_design_task_id || '');
    setDescription(item.description || meta?.description || '');
    const hashtagList = meta?.hashtags || [];
    setHashtags(hashtagList.length > 0 ? hashtagList.map((h: string) => `#${h}`).join(' ') : (meta?.hashtags_text || ''));
    setPlatform(meta?.platform || 'instagram');
    setRecommendedTimeStart(meta?.recommended_time_start || '');
    setRecommendedTimeEnd(meta?.recommended_time_end || '');
    setEditingItemId(item.id);
    setDetailItem(null);
    setFormOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItemId || !clientUserId || !user?.id || !selectedDate) return;
    setCreating(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const linkedVideo = clientVideos.find((v: any) => v.id === linkedVideoId);
      const linkedDesign = clientDesignTasks.find((d: any) => d.id === linkedDesignTaskId);
      let title = '';
      if (contentType === 'video' && linkedVideo) title = linkedVideo.title;
      else if (contentType === 'design' && linkedDesign) title = linkedDesign.title;
      if (!title) { toast.error('Sélectionnez un contenu'); setCreating(false); return; }

      const hashtagList = hashtags.split(/[,\s#]+/).filter(Boolean).map(h => h.trim());
      const metadata = {
        publication_date: dateStr,
        hashtags: hashtagList,
        platform,
        content_subtype: contentType,
        recommended_time_start: recommendedTimeStart || null,
        recommended_time_end: recommendedTimeEnd || null,
        description: description.trim() || null,
        hashtags_text: hashtags.trim() || null,
        selected_thumbnail_delivery_id: selectedThumbnailId || null,
      };

      const { error } = await supabase.from('client_content_items').update({
        title,
        description: description.trim() || null,
        related_video_id: contentType === 'video' ? linkedVideoId || null : null,
        related_design_task_id: linkedDesignTaskId || null,
        metadata: metadata as any,
      }).eq('id', editingItemId);
      if (error) throw error;
      toast.success('Contenu modifié !');
      setFormOpen(false);
      setEditingItemId(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['copywriter-planning-calendar', clientUserId] });
      queryClient.invalidateQueries({ queryKey: ['copywriter-client-content', clientUserId] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
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

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {/* Calendar grid */}
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
                  onClick={() => handleDayClick(day)}
                  className={`bg-card min-h-[90px] p-1.5 cursor-pointer transition-colors hover:bg-accent/50 ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  } ${isCurrentDay ? 'ring-2 ring-violet-500 ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isCurrentDay ? 'text-violet-500' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayItems.length > 0 && isCurrentMonth && (
                      <span className="text-[10px] bg-violet-500/10 text-violet-500 rounded-full px-1.5">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                  {isShootingDay && isCurrentMonth && clientShootingInfo && (
                    <div className="text-[10px] px-1 py-0.5 rounded truncate bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                      <Camera className="h-2.5 w-2.5 shrink-0" />
                      Tournage {new Date(clientShootingInfo.next_shooting_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 2).map((item: any) => {
                      const meta = item.metadata as any;
                      const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
                      return (
                        <div
                          key={item.id}
                          className={`text-[10px] truncate rounded px-1 py-0.5 ${
                            isVideo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-pink-500/10 text-pink-600'
                          }`}
                        >
                          {isVideo ? '🎬' : '🎨'} {item.title}
                        </div>
                      );
                    })}
                    {dayItems.length > 2 && (
                      <p className="text-[9px] text-muted-foreground pl-1">+{dayItems.length - 2} de plus</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>📅 {planningItems.filter((i: any) => {
              const d = (i.metadata as any)?.publication_date;
              return d && d.startsWith(format(currentMonth, 'yyyy-MM'));
            }).length} contenus ce mois</span>
            <span>🎬 {planningItems.filter((i: any) => {
              const meta = i.metadata as any;
              return meta?.publication_date?.startsWith(format(currentMonth, 'yyyy-MM')) && (meta?.content_subtype === 'video' || i.related_video_id);
            }).length} vidéos</span>
            <span>🎨 {planningItems.filter((i: any) => {
              const meta = i.metadata as any;
              return meta?.publication_date?.startsWith(format(currentMonth, 'yyyy-MM')) && (meta?.content_subtype === 'design' || i.related_design_task_id);
            }).length} designs</span>
          </div>
        </>
      )}

      {/* Add content dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); resetForm(); setEditingItemId(null); } else setFormOpen(true); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-500" />
              {editingItemId ? 'Modifier' : 'Planifier'} — {selectedDate ? format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr }) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Content type */}
            <div>
              <Label>Type de contenu</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={contentType === 'video' ? 'default' : 'outline'}
                  className={contentType === 'video' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  onClick={() => { setContentType('video'); setLinkedDesignTaskId(''); setSelectedThumbnailId(''); }}
                >
                  <Video className="h-4 w-4 mr-2" />Vidéo
                </Button>
                <Button
                  type="button"
                  variant={contentType === 'design' ? 'default' : 'outline'}
                  className={contentType === 'design' ? 'bg-pink-500 hover:bg-pink-600' : ''}
                  onClick={() => { setContentType('design'); setLinkedVideoId(''); }}
                >
                  <Palette className="h-4 w-4 mr-2" />Design
                </Button>
              </div>
            </div>

            {/* Video selection - Button to open visual modal */}
            {contentType === 'video' && (
              <div>
                <Label className="flex items-center gap-1 mb-1"><Video className="h-3.5 w-3.5" />Sélectionner la vidéo</Label>
                <Button
                  variant="outline"
                  onClick={() => setShowVideoSelector(true)}
                  className="w-full justify-start h-11"
                >
                  <Video className="h-4 w-4 mr-2" />
                  {linkedVideoId
                    ? `🎬 ${clientVideos.find((v: any) => v.id === linkedVideoId)?.title || 'Sélectionnée'}`
                    : 'Choisir une vidéo...'
                  }
                </Button>
              </div>
            )}

            {/* Design selection */}
            {contentType === 'design' && (
              <div>
                <Label className="flex items-center gap-1"><Palette className="h-3.5 w-3.5" />Sélectionner le design</Label>
                <Select value={linkedDesignTaskId || '_none'} onValueChange={(v) => setLinkedDesignTaskId(v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir un design..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-- Choisir --</SelectItem>
                    {clientDesignTasks.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>🎨 {d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Thumbnail selection - Button to open modal */}
            {contentType === 'video' && linkedVideoId && thumbnailItems.length > 0 && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowThumbnailSelector(true)}
                  className="w-full justify-start"
                >
                  <Image className="h-4 w-4 mr-2" />
                  {selectedThumbnailId 
                    ? `Miniature: ${thumbnailItems.find(t => t.id === selectedThumbnailId)?.label || 'Sélectionnée'}`
                    : 'Sélectionner une miniature'
                  }
                </Button>
              </div>
            )}

            {/* Platform */}
            <div>
              <Label>Plateforme</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">📸 Instagram</SelectItem>
                  <SelectItem value="youtube">🎬 YouTube</SelectItem>
                  <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recommended time slot - Premium style */}
            <div>
              <Label className="flex items-center gap-1 mb-2"><Clock className="h-3.5 w-3.5" />Plage horaire recommandée</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">De</Label>
                  <Select value={recommendedTimeStart || '_none'} onValueChange={(v) => setRecommendedTimeStart(v === '_none' ? '' : v)}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium">
                      <SelectValue placeholder="Heure début" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="_none">--:--</SelectItem>
                      {Array.from({ length: 24 }, (_, h) => 
                        ['00', '15', '30', '45'].map(m => {
                          const val = `${String(h).padStart(2, '0')}:${m}`;
                          return <SelectItem key={val} value={val}>{val}</SelectItem>;
                        })
                      ).flat()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">À</Label>
                  <Select value={recommendedTimeEnd || '_none'} onValueChange={(v) => setRecommendedTimeEnd(v === '_none' ? '' : v)}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50 font-medium">
                      <SelectValue placeholder="Heure fin" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="_none">--:--</SelectItem>
                      {Array.from({ length: 24 }, (_, h) => 
                        ['00', '15', '30', '45'].map(m => {
                          const val = `${String(h).padStart(2, '0')}:${m}`;
                          return <SelectItem key={val} value={val}>{val}</SelectItem>;
                        })
                      ).flat()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description - dropdown from validated scripts OR manual */}
            <div>
              <Label>{contentType === 'video' ? 'Description' : 'Caption'}</Label>
              {availableDescriptions.length > 0 && (
                <div className="mb-2">
                  <Select onValueChange={(v) => { if (v !== '_manual') setDescription(v); }}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="📋 Choisir une description validée..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_manual">✏️ Saisir manuellement</SelectItem>
                      {availableDescriptions.map((d, i) => (
                        <SelectItem key={i} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={contentType === 'video' ? 'Description complète de la vidéo...' : 'Caption du post / carrousel...'}
                rows={5}
                className="min-h-[120px]"
              />
            </div>

            {/* Hashtags - dropdown from validated scripts OR manual */}
            <div>
              <Label className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Hashtags</Label>
              {availableHashtags.length > 0 && (
                <div className="mb-2">
                  <Select onValueChange={(v) => { if (v !== '_manual') setHashtags(v); }}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="📋 Choisir des hashtags validés..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_manual">✏️ Saisir manuellement</SelectItem>
                      {availableHashtags.map((h, i) => (
                        <SelectItem key={i} value={h.value}>
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#business #entrepreneur #motivation"
              />
              <p className="text-xs text-muted-foreground mt-1">Séparez par des espaces ou des virgules</p>
            </div>

            <Button
              onClick={editingItemId ? handleUpdate : handleCreate}
              disabled={creating || (contentType === 'video' ? !linkedVideoId : !linkedDesignTaskId)}
              className="w-full bg-violet-500 hover:bg-violet-600"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
              {editingItemId ? 'Enregistrer les modifications' : 'Planifier ce contenu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day detail dialog (existing items) */}
      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) setDetailItem(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-violet-500" />
                  {selectedDate ? format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr }) : ''}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {(detailItem as any[]).map((item: any) => {
                  const meta = item.metadata as any;
                  const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
                  const linkedVideo = clientVideos.find((v: any) => v.id === item.related_video_id);
                  const linkedDesign = clientDesignTasks.find((d: any) => d.id === item.related_design_task_id);
                  const timeStart = meta?.recommended_time_start;
                  const timeEnd = meta?.recommended_time_end;

                  return (
                    <Card key={item.id} className="border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {isVideo ? (
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Video className="h-4 w-4 text-emerald-500" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                <Palette className="h-4 w-4 text-pink-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{item.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{meta?.platform || 'instagram'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-violet-500" onClick={() => handleEditItem(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Time slot */}
                        {timeStart && timeEnd && (
                          <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-500/10 rounded-lg px-3 py-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Publier entre {timeStart} et {timeEnd}</span>
                          </div>
                        )}

                        {item.description && (
                          <p dir="auto" className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 leading-relaxed" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{item.description}</p>
                        )}

                        {meta?.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {meta.hashtags.map((h: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">#{h}</Badge>
                            ))}
                          </div>
                        )}

                        {linkedVideo && (
                          <p className="text-xs flex items-center gap-1 text-emerald-600">
                            <Video className="h-3 w-3" />Vidéo: {linkedVideo.title}
                          </p>
                        )}
                        {linkedDesign && (
                          <p className="text-xs flex items-center gap-1 text-pink-600">
                            <Palette className="h-3 w-3" />Miniature: {linkedDesign.title}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDetailItem(null);
                    resetForm();
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />Ajouter un autre contenu
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Thumbnail Selection Modal */}
      <Dialog open={showThumbnailSelector} onOpenChange={setShowThumbnailSelector}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Sélectionner une miniature
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-4 gap-4">
            {thumbnailItems.map((t) => {
              const isSelected = selectedThumbnailId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedThumbnailId(t.id);
                    setLinkedDesignTaskId(t.designTaskId);
                    setShowThumbnailSelector(false);
                  }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${
                    isSelected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-border hover:border-violet-300'
                  }`}
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt={t.label} className="w-full aspect-square object-cover group-hover:opacity-90" />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm px-2 py-2 font-medium">
                    {t.label}
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-violet-500 flex items-center justify-center ring-2 ring-white">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => {
              setLinkedDesignTaskId('');
              setSelectedThumbnailId('');
              setShowThumbnailSelector(false);
            }}>
              Retirer la sélection
            </Button>
            <Button onClick={() => setShowThumbnailSelector(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Selection Modal */}
      <Dialog open={showVideoSelector} onOpenChange={setShowVideoSelector}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Sélectionner une vidéo
            </DialogTitle>
          </DialogHeader>
          
          {/* Video preview player */}
          {previewVideoId && (
            <div className="relative rounded-xl overflow-hidden bg-black mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20 h-8 w-8 p-0"
                onClick={() => { setPreviewVideoId(null); setPreviewIframeUrl(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
              {previewLoading ? (
                <div className="w-full aspect-video flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : previewIframeUrl ? (
                <iframe
                  src={previewIframeUrl}
                  className="w-full aspect-video"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-white/60 text-sm">
                  Impossible de charger la vidéo
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
            {videoItemsWithDeliveries.map((v: any) => {
              const isSelected = linkedVideoId === v.id;
              const delivery = videoDeliveries.find((d: any) => d.video_id === v.id && d.cloudflare_stream_id);
              const streamId = delivery?.cloudflare_stream_id;
              return (
                <div
                  key={v.id}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-border hover:border-emerald-300'
                  }`}
                >
                  <div onClick={() => {
                    setLinkedVideoId(v.id);
                    setLinkedDesignTaskId('');
                    setSelectedThumbnailId('');
                    setDescription('');
                    setHashtags('');
                    setShowVideoSelector(false);
                  }}>
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Video className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-sm px-3 py-3 font-medium">
                      🎬 {v.title}
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-white">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Play button */}
                  {streamId && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (previewVideoId === streamId) {
                          setPreviewVideoId(null);
                          setPreviewIframeUrl(null);
                          return;
                        }
                        setPreviewVideoId(streamId);
                        setPreviewLoading(true);
                        setPreviewIframeUrl(null);
                        try {
                          const result = await getPlaybackUrls(streamId, 'preview');
                          if (result.success && result.iframeUrl) {
                            setPreviewIframeUrl(result.iframeUrl);
                          }
                        } catch (err) {
                          console.error('Failed to get signed URL:', err);
                        } finally {
                          setPreviewLoading(false);
                        }
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => { setShowVideoSelector(false); setPreviewVideoId(null); setPreviewIframeUrl(null); }}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

