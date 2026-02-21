import { useState, useMemo, useEffect } from 'react';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientMonth } from '@/hooks/useClientMonth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  CalendarDays, ChevronLeft, ChevronRight, Video, Hash,
  Loader2, Copy, Download, Check, Palette, Instagram, Youtube, Music2,
  Clock, Send, ArrowRight, CalendarClock, Image as ImageIcon, Play, MapPin
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { getPlaybackUrls } from '@/lib/api/cloudflareStream';

const PLATFORM_ICONS: Record<string, any> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
};

export default function ClientPlanning() {
  const { selectedMonth: globalMonth } = useClientMonth();
  const { profile } = useClientProfile(globalMonth);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const primaryColor = profile?.primary_color || '#22c55e';
  const [currentMonth, setCurrentMonth] = useState(globalMonth);
  
  // Sync planning calendar with global month selector
  useEffect(() => {
    setCurrentMonth(globalMonth);
  }, [globalMonth]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailItems, setDetailItems] = useState<any[] | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [rescheduleItemId, setRescheduleItemId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [showShootingInfo, setShowShootingInfo] = useState(false);

  // Fetch planning items
  const { data: planningItems = [], isLoading } = useQuery({
    queryKey: ['client-planning', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_content_items')
        .select('*')
        .eq('client_user_id', user.id)
        .eq('workflow_step', 'planning')
        .in('status', ['validated', 'delivered', 'pending_review'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch video deliveries for download
  const videoIds = planningItems.filter((i: any) => i.related_video_id).map((i: any) => i.related_video_id);
  const { data: videoDeliveries = [] } = useQuery({
    queryKey: ['client-planning-video-deliveries', videoIds],
    queryFn: async () => {
      if (videoIds.length === 0) return [];
      const { data } = await supabase
        .from('video_deliveries')
        .select('video_id, cloudflare_stream_id, external_link, file_path')
        .in('video_id', videoIds)
        .order('version_number', { ascending: false });
      return data || [];
    },
    enabled: videoIds.length > 0,
  });

  // Fetch design deliveries for download
  const designIds = planningItems.filter((i: any) => i.related_design_task_id).map((i: any) => i.related_design_task_id);
  const { data: designDeliveries = [] } = useQuery({
    queryKey: ['client-planning-design-deliveries', designIds],
    queryFn: async () => {
      if (designIds.length === 0) return [];
      const { data } = await supabase
        .from('design_deliveries')
        .select('id, design_task_id, file_path, external_link')
        .in('design_task_id', designIds)
        .order('version_number', { ascending: false });
      return data || [];
    },
    enabled: designIds.length > 0,
  });

  // Fetch signed URLs for video previews and thumbnails
  const [signedVideoUrls, setSignedVideoUrls] = useState<Record<string, { iframeUrl?: string; thumbnail?: string }>>({});
  
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const deliveriesWithCf = videoDeliveries.filter((d: any) => d.cloudflare_stream_id);
      if (deliveriesWithCf.length === 0) return;
      
      const results: Record<string, { iframeUrl?: string; thumbnail?: string }> = {};
      await Promise.all(deliveriesWithCf.map(async (d: any) => {
        try {
          const res = await getPlaybackUrls(d.cloudflare_stream_id);
          if (res.success) {
            results[d.video_id] = {
              iframeUrl: res.iframeUrl,
              thumbnail: res.thumbnail,
            };
          }
        } catch {}
      }));
      setSignedVideoUrls(prev => ({ ...prev, ...results }));
    };
    fetchSignedUrls();
  }, [videoDeliveries]);

  // Group by date
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

  // Calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, currentMonth)) return;
    const dateKey = format(day, 'yyyy-MM-dd');
    const items = itemsByDate.get(dateKey);
    if (items && items.length > 0) {
      setSelectedDate(day);
      setDetailItems(items);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié !');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const triggerDownload = async (url: string, fileName: string) => {
    try {
      toast.info('Téléchargement en cours...');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Téléchargement terminé !');
    } catch {
      // Fallback: open as link with download attribute
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadVideo = async (videoId: string) => {
    const delivery = videoDeliveries.find((d: any) => d.video_id === videoId);
    if (!delivery) { toast.error('Aucune vidéo disponible'); return; }

    if (delivery.cloudflare_stream_id) {
      try {
        const { data } = await supabase.functions.invoke('cloudflare-stream-download', {
          body: { videoId, fromPlanning: true }
        });
        if (data?.downloadUrl) {
          await triggerDownload(data.downloadUrl, data.fileName || 'video.mp4');
          return;
        }
      } catch {}
    }
    if (delivery.external_link) {
      await triggerDownload(delivery.external_link, 'video.mp4');
    } else {
      toast.error('Lien de téléchargement non disponible');
    }
  };

  const handleDownloadDesign = async (designTaskId: string, selectedDeliveryId?: string) => {
    const delivery = selectedDeliveryId
      ? designDeliveries.find((d: any) => d.id === selectedDeliveryId)
      : designDeliveries.find((d: any) => d.design_task_id === designTaskId);
    if (!delivery) { toast.error('Aucun design disponible'); return; }
    if (delivery.file_path) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${delivery.file_path}`;
      const fileName = delivery.file_path.split('/').pop() || 'miniature.png';
      await triggerDownload(url, fileName);
    } else if (delivery.external_link) {
      await triggerDownload(delivery.external_link, 'miniature.png');
    } else {
      toast.error('Lien de téléchargement non disponible');
    }
  };

  const handlePublish = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('client_content_items')
        .update({ status: 'delivered' })
        .eq('id', itemId);
      if (error) throw error;
      toast.success('Marqué comme publié ✅');
      queryClient.invalidateQueries({ queryKey: ['client-planning', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['client-content-items', user?.id] });
      // Refresh detail items
      if (detailItems) {
        setDetailItems(prev => prev?.map(i => i.id === itemId ? { ...i, status: 'delivered' } : i) || null);
      }
    } catch {
      toast.error('Erreur');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleItemId || !rescheduleDate) return;
    setRescheduling(true);
    try {
      // Find the item to get its current metadata
      const item = planningItems.find((i: any) => i.id === rescheduleItemId);
      if (!item) throw new Error('Item non trouvé');
      const meta = { ...(item.metadata as any), publication_date: rescheduleDate };
      
      const { error } = await supabase
        .from('client_content_items')
        .update({ metadata: meta as any })
        .eq('id', rescheduleItemId);
      if (error) throw error;
      toast.success(`Reporté au ${format(new Date(rescheduleDate + 'T00:00:00'), 'dd MMMM yyyy', { locale: fr })}`);
      setRescheduleItemId(null);
      setRescheduleDate('');
      setDetailItems(null);
      setSelectedDate(null);
      queryClient.invalidateQueries({ queryKey: ['client-planning', user?.id] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setRescheduling(false);
    }
  };

  const monthItemCount = planningItems.filter((i: any) => {
    const d = (i.metadata as any)?.publication_date;
    return d && d.startsWith(format(currentMonth, 'yyyy-MM'));
  }).length;

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Planning</h1>
          <p className="text-muted-foreground">Votre calendrier de publications</p>
        </div>

        {/* Prochain tournage banner */}
        {profile?.next_shooting_date && (
          <Card 
            className="border-l-4 cursor-pointer hover:shadow-md transition-shadow" 
            style={{ borderLeftColor: primaryColor }}
            onClick={() => setShowShootingInfo(true)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor + '15' }}>
                <CalendarClock className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Prochain tournage</p>
                <p className="text-lg font-bold">
                  {format(new Date(profile.next_shooting_date), "EEEE dd MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
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

            {/* Calendar */}
            <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden" style={{ backgroundColor: primaryColor + '20' }}>
              {weekDays.map(d => (
                <div key={d} className="bg-card text-center py-2 text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayItems = itemsByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);
                const hasContent = dayItems.length > 0 && isCurrentMonth;
                const isShootingDay = profile?.next_shooting_date && isCurrentMonth &&
                  format(new Date(profile.next_shooting_date), 'yyyy-MM-dd') === dateKey;

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={`bg-card min-h-[85px] p-1.5 transition-colors ${
                      !isCurrentMonth ? 'opacity-20' : hasContent ? 'cursor-pointer hover:bg-accent/50' : ''
                    }`}
                    style={{
                      ...(isCurrentDay ? { boxShadow: `inset 0 0 0 2px ${primaryColor}` } : {}),
                      ...(isShootingDay ? { backgroundColor: '#f59e0b15' } : {}),
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${isCurrentDay ? '' : 'text-muted-foreground'}`} style={isCurrentDay ? { color: primaryColor } : {}}>
                        {format(day, 'd')}
                      </span>
                      {hasContent && (
                        <span className="text-[10px] rounded-full px-1.5" style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                          {dayItems.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {isShootingDay && (
                        <div 
                          className="text-[10px] truncate rounded px-1 py-0.5 bg-amber-500/15 text-amber-700 font-medium cursor-pointer hover:bg-amber-500/25 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setShowShootingInfo(true); }}
                        >
                          🎥 Tournage {profile?.next_shooting_date ? format(new Date(profile.next_shooting_date), 'HH:mm') : ''}
                        </div>
                      )}
                      {dayItems.slice(0, isShootingDay ? 1 : 2).map((item: any) => {
                        const meta = item.metadata as any;
                        const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
                        const isPublished = item.status === 'delivered';
                        return (
                          <div
                            key={item.id}
                            className={`text-[10px] truncate rounded px-1 py-0.5 ${
                              isPublished ? 'bg-blue-500/10 text-blue-600' :
                              isVideo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-pink-500/10 text-pink-600'
                            }`}
                          >
                            {isPublished ? '✅' : isVideo ? '🎬' : '🎨'} {item.title}
                          </div>
                        );
                      })}
                      {dayItems.length > (isShootingDay ? 1 : 2) && (
                        <p className="text-[9px] text-muted-foreground pl-1">+{dayItems.length - (isShootingDay ? 1 : 2)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <p className="text-sm text-muted-foreground">
              📅 {monthItemCount} publication{monthItemCount > 1 ? 's' : ''} prévue{monthItemCount > 1 ? 's' : ''} ce mois
            </p>
          </>
        )}
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!detailItems} onOpenChange={(v) => { if (!v) { setDetailItems(null); setSelectedDate(null); setRescheduleItemId(null); } }}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          {detailItems && selectedDate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 capitalize">
                  <CalendarDays className="h-5 w-5" style={{ color: primaryColor }} />
                  {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {detailItems.map((item: any) => {
                   const meta = item.metadata as any;
                   const isVideo = meta?.content_subtype === 'video' || item.related_video_id;
                   const PlatformIcon = meta?.platform ? (PLATFORM_ICONS[meta.platform] || CalendarDays) : CalendarDays;
                   const hashtagList = meta?.hashtags || [];
                   const hashtagsText = hashtagList.length > 0 ? hashtagList.map((h: string) => `#${h}`).join(' ') : (meta?.hashtags_text || '');
                   const descriptionText = item.description || meta?.description || '';
                   const isPublished = item.status === 'delivered';
                   const timeStart = meta?.recommended_time_start;
                   const timeEnd = meta?.recommended_time_end;

                  return (
                    <Card key={item.id} className="border-border/50" style={{ borderLeftWidth: 4, borderLeftColor: isPublished ? '#3b82f6' : isVideo ? '#10b981' : '#ec4899' }}>
                      <CardContent className="p-5 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isVideo ? (
                              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Video className="h-5 w-5 text-emerald-500" />
                              </div>
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                <Palette className="h-5 w-5 text-pink-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold">{item.title}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <PlatformIcon className="h-3 w-3" />
                                <span className="capitalize">{meta?.platform || 'instagram'}</span>
                              </div>
                            </div>
                          </div>
                          {isPublished ? (
                            <Badge className="bg-blue-500/10 text-blue-600 border-0">✅ Publié</Badge>
                          ) : (
                            <Badge className={isVideo ? 'bg-emerald-500/10 text-emerald-500 border-0' : 'bg-pink-500/10 text-pink-500 border-0'}>
                              {isVideo ? 'Vidéo' : 'Design'}
                            </Badge>
                          )}
                        </div>

                        {/* Recommended time slot */}
                        {timeStart && timeEnd && (
                          <div className="flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-600 rounded-lg px-3 py-2">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Heure recommandée : <strong>{timeStart} – {timeEnd}</strong></span>
                          </div>
                        )}

                        {/* Video Preview */}
                        {item.related_video_id && signedVideoUrls[item.related_video_id]?.iframeUrl && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Play className="h-3 w-3" /> Aperçu vidéo
                            </Label>
                            <div className="rounded-lg overflow-hidden bg-black aspect-video">
                              <iframe
                                src={signedVideoUrls[item.related_video_id].iframeUrl}
                                className="w-full h-full"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        )}

                        {/* Thumbnail Preview - Only show copywriter-selected design, fallback to Cloudflare thumbnail */}
                        {item.related_design_task_id ? (() => {
                          const selectedDeliveryId = (item.metadata as any)?.selected_thumbnail_delivery_id;
                          const delivery = selectedDeliveryId
                            ? designDeliveries.find((d: any) => d.id === selectedDeliveryId)
                            : designDeliveries.find((d: any) => d.design_task_id === item.related_design_task_id);
                          const previewUrl = delivery?.file_path 
                            ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${delivery.file_path}`
                            : null;
                          return previewUrl ? (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" /> Miniature
                              </Label>
                              <img
                                src={previewUrl}
                                alt="Miniature"
                                className="rounded-lg w-full max-h-48 object-cover"
                              />
                            </div>
                          ) : null;
                        })() : (
                          item.related_video_id && signedVideoUrls[item.related_video_id]?.thumbnail && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" /> Miniature
                              </Label>
                              <img
                                src={signedVideoUrls[item.related_video_id].thumbnail}
                                alt="Miniature"
                                className="rounded-lg w-full max-h-48 object-cover"
                              />
                            </div>
                          )
                        )}

                        {/* Description / Caption */}
                         {descriptionText && (
                           <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <Label className="text-xs text-muted-foreground">
                                 {isVideo ? 'Description' : 'Caption'}
                               </Label>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-7 text-xs gap-1"
                                 onClick={() => handleCopy(descriptionText, `desc-${item.id}`)}
                               >
                                 {copiedField === `desc-${item.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                 {copiedField === `desc-${item.id}` ? 'Copié' : 'Copier'}
                               </Button>
                             </div>
                             <p dir="auto" className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3 leading-relaxed" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{descriptionText}</p>
                           </div>
                         )}

                        {/* Hashtags */}
                        {hashtagsText && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Hash className="h-3 w-3" />Hashtags
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleCopy(hashtagsText, `hash-${item.id}`)}
                              >
                                {copiedField === `hash-${item.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedField === `hash-${item.id}` ? 'Copié' : 'Copier'}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {hashtagList.map((h: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">#{h}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                          {/* Download video */}
                          {item.related_video_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleDownloadVideo(item.related_video_id)}
                            >
                              <Download className="h-4 w-4" />
                              Vidéo
                            </Button>
                          )}
                          {/* Download thumbnail */}
                          {item.related_design_task_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleDownloadDesign(item.related_design_task_id, (item.metadata as any)?.selected_thumbnail_delivery_id)}
                            >
                              <Download className="h-4 w-4" />
                              Miniature
                            </Button>
                          )}
                          {/* Copy all */}
                          {(descriptionText || hashtagsText) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleCopy(
                                `${descriptionText}${hashtagsText ? '\n\n' + hashtagsText : ''}`,
                                `all-${item.id}`
                              )}
                            >
                              <Copy className="h-4 w-4" />
                              {copiedField === `all-${item.id}` ? 'Copié !' : 'Copier tout'}
                            </Button>
                          )}
                          {/* Publish */}
                          {!isPublished && (
                            <Button
                              size="sm"
                              className="gap-2"
                              style={{ backgroundColor: primaryColor }}
                              onClick={() => handlePublish(item.id)}
                            >
                              <Send className="h-4 w-4" />
                              Publier
                            </Button>
                          )}
                          {/* Reschedule */}
                          {!isPublished && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setRescheduleItemId(rescheduleItemId === item.id ? null : item.id);
                                setRescheduleDate('');
                              }}
                            >
                              <CalendarClock className="h-4 w-4" />
                              Reporter
                            </Button>
                          )}
                        </div>

                        {/* Reschedule date picker */}
                        {rescheduleItemId === item.id && (
                          <div className="flex items-center gap-2 pt-2 bg-muted/30 rounded-lg p-3">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              disabled={!rescheduleDate || rescheduling}
                              onClick={handleReschedule}
                              style={{ backgroundColor: primaryColor }}
                            >
                              {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Shooting Info Dialog */}
      <Dialog open={showShootingInfo} onOpenChange={setShowShootingInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              🎬 Votre session de tournage
            </DialogTitle>
          </DialogHeader>

          {profile?.next_shooting_date && (
            <div className="space-y-5">
              {/* Date & Time */}
              <div className="rounded-xl p-4 border" style={{ backgroundColor: primaryColor + '08', borderColor: primaryColor + '30' }}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor + '15' }}>
                    <CalendarClock className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & heure</p>
                    <p className="text-lg font-bold capitalize">
                      {format(new Date(profile.next_shooting_date), "EEEE dd MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="text-base font-semibold" style={{ color: primaryColor }}>
                      {format(new Date(profile.next_shooting_date), "HH'h'mm")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Studio Location */}
              {(profile as any)?.studio_location && (
                <div className="rounded-xl p-4 border bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lieu de tournage</p>
                      <p className="text-sm font-semibold">{(profile as any).studio_location}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText((profile as any).studio_location);
                      toast.success('Adresse copiée !');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Preparation Tips */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  ✅ Préparation avant la session
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: primaryColor }} />
                    <div>
                      <p className="font-medium">Arrivez 30 minutes en avance</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Pour vous installer, préparer le setup et vous mettre à l'aise avant le début du tournage.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                    <span className="text-base mt-0.5">👔</span>
                    <div>
                      <p className="font-medium">Préparez vos tenues et vêtements</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Apportez plusieurs tenues différentes pour varier les looks sur vos contenus. Évitez les motifs trop fins et les logos visibles.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                    <span className="text-base mt-0.5">💡</span>
                    <div>
                      <p className="font-medium">Revoyez vos scripts</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Familiarisez-vous avec les sujets à tourner pour être fluide et naturel devant la caméra.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50">
                    <span className="text-base mt-0.5">🎯</span>
                    <div>
                      <p className="font-medium">Apportez vos accessoires</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Produits, outils, ou tout élément visuel pertinent pour illustrer vos contenus.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-destructive">
                  ⚠️ Politique d'annulation
                </h3>
                <p className="text-sm text-muted-foreground">
                  En cas d'annulation de la session de tournage, un <span className="font-bold text-foreground">montant de 50% du prix de réservation du studio</span> sera facturé. 
                  Nous vous recommandons de nous prévenir au minimum <span className="font-bold text-foreground">48h à l'avance</span> pour tout changement.
                </p>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setShowShootingInfo(false)}
              >
                J'ai compris ✓
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
