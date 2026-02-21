import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Eye,
  Play,
  Edit3,
  Sparkles,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logo from '@/assets/4media-logo-transparent.png';

interface VideoOverviewData {
  taskTitle: string;
  clientName: string | null;
  deadline: string | null;
  videoCount: number;
  videosCompleted: number;
  taskId: string;
  videos: VideoItemOverview[];
}

interface VideoItemOverview {
  id: string;
  title: string;
  status: string;
  isValidated: boolean;
  deadline: string | null;
  hasDelivery: boolean;
  hasReviewLink: boolean;
}

const getVideoStatusConfig = (video: VideoItemOverview) => {
  if (video.isValidated || video.status === 'completed') {
    return { label: 'Validée ✅', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' };
  }
  if (video.status === 'review_client') {
    return { label: 'En attente de votre avis', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-500' };
  }
  if (video.status === 'revision_requested') {
    return { label: 'Révision en cours', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' };
  }
  if (video.status === 'review_admin') {
    return { label: 'En préparation', color: 'text-muted-foreground', bg: 'bg-muted border-muted', dot: 'bg-muted-foreground' };
  }
  return { label: 'En cours', color: 'text-muted-foreground', bg: 'bg-muted border-muted', dot: 'bg-muted-foreground' };
};

export default function VideoProjectOverview() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<VideoOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        // Fetch project review link
        const { data: link, error: linkError } = await supabase
          .from('video_project_review_links')
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
          .from('video_project_review_links')
          .update({
            views_count: link.views_count + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('id', link.id);

        // Fetch task
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', link.task_id)
          .single();

        if (taskError || !task) {
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        // Fetch all videos for this task
        const { data: videos } = await supabase
          .from('videos')
          .select('*')
          .eq('task_id', task.id)
          .order('created_at', { ascending: true });

        // Check which videos have deliveries
        const videoIds = (videos || []).map(v => v.id);
        let deliveryMap = new Map<string, boolean>();
        let reviewLinkMap = new Map<string, boolean>();

        if (videoIds.length > 0) {
          const { data: deliveries } = await supabase
            .from('video_deliveries')
            .select('video_id')
            .in('video_id', videoIds);
          
          deliveries?.forEach(d => deliveryMap.set(d.video_id, true));

          const { data: reviewLinks } = await supabase
            .from('video_review_links')
            .select('video_id')
            .in('video_id', videoIds)
            .eq('is_active', true);
          
          reviewLinks?.forEach(rl => reviewLinkMap.set(rl.video_id, true));
        }

        const videosCompleted = (videos || []).filter(v => v.is_validated).length;

        setData({
          taskTitle: task.title,
          clientName: task.client_name,
          deadline: task.deadline,
          videoCount: task.video_count || (videos || []).length,
          videosCompleted,
          taskId: task.id,
          videos: (videos || []).map(v => ({
            id: v.id,
            title: v.title,
            status: v.status,
            isValidated: v.is_validated || false,
            deadline: v.deadline,
            hasDelivery: deliveryMap.has(v.id),
            hasReviewLink: reviewLinkMap.has(v.id),
          })),
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

  const handleVideoClick = (video: VideoItemOverview) => {
    // Only allow clicking if the video is in a client-viewable state
    const clientViewable = ['review_client', 'revision_requested', 'completed'];
    if (clientViewable.includes(video.status) || video.isValidated) {
      // Navigate to the delivery page
      navigate(`/delivery/${video.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-emerald-200/60">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (isInvalid || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900/80 border-emerald-500/20">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 mx-auto text-red-400" />
            <h2 className="text-xl font-bold text-white">Lien invalide ou expiré</h2>
            <p className="text-emerald-200/60 text-sm">
              Ce lien de projet n'est plus actif. Veuillez contacter votre gestionnaire de projet pour obtenir un nouveau lien.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = data.videoCount > 0
    ? Math.round((data.videosCompleted / data.videoCount) * 100)
    : 0;

  const approvedCount = data.videos.filter(v => v.isValidated).length;
  const reviewCount = data.videos.filter(v => v.status === 'review_client').length;
  const revisionCount = data.videos.filter(v => v.status === 'revision_requested').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950">
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-xl"
            style={{
              width: 80 + i * 30,
              height: 80 + i * 30,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 12}%`,
              animation: `float ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="4Media" className="h-10 mx-auto mb-6 opacity-80" />
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {data.taskTitle}
          </h1>
          {data.clientName && (
            <p className="text-emerald-300/60 text-lg">{data.clientName}</p>
          )}
          {data.deadline && (
            <p className="text-emerald-200/40 text-sm mt-2">
              Deadline : {format(new Date(data.deadline), 'dd MMMM yyyy', { locale: fr })}
            </p>
          )}
        </div>

        {/* Progress Card */}
        <Card className="mb-8 bg-slate-900/60 border-emerald-500/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-emerald-200/60 text-sm font-medium">Progression du projet</span>
              <span className="text-white font-bold text-lg">{data.videosCompleted}/{data.videoCount}</span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-3 bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-400"
            />
            <div className="flex items-center justify-between mt-3 text-xs text-emerald-200/40">
              <span>{progressPercentage}% complété</span>
              <div className="flex gap-4">
                {approvedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    {approvedCount} validée{approvedCount > 1 ? 's' : ''}
                  </span>
                )}
                {reviewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-blue-400" />
                    {reviewCount} en attente
                  </span>
                )}
                {revisionCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Edit3 className="h-3 w-3 text-amber-400" />
                    {revisionCount} en révision
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Videos List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-emerald-200/40 uppercase tracking-wider mb-4">
            Vidéos du projet
          </h2>
          {data.videos
            .sort((a, b) => {
              const numA = parseInt(a.title.match(/\d+/)?.[0] || '0', 10);
              const numB = parseInt(b.title.match(/\d+/)?.[0] || '0', 10);
              if (numA !== numB) return numA - numB;
              return a.title.localeCompare(b.title);
            })
            .map((video, index) => {
              const statusConfig = getVideoStatusConfig(video);
              const isClickable = ['review_client', 'revision_requested', 'completed'].includes(video.status) || video.isValidated;

              return (
                <Card
                  key={video.id}
                  className={cn(
                    'bg-slate-900/60 border-emerald-500/10 backdrop-blur-sm transition-all duration-200',
                    isClickable && 'cursor-pointer hover:bg-slate-800/60 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5',
                    !isClickable && 'opacity-60'
                  )}
                  onClick={() => handleVideoClick(video)}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-4">
                      {/* Video Icon / Number */}
                      <div className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                        video.isValidated ? 'bg-emerald-500/20' : 'bg-slate-800'
                      )}>
                        {video.isValidated ? (
                          <CheckCircle className="h-6 w-6 text-emerald-400" />
                        ) : isClickable ? (
                          <Play className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Video className="h-5 w-5 text-emerald-200/30" />
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">{video.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', statusConfig.dot)} />
                          <span className={cn('text-sm', statusConfig.color)}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Action indicator */}
                      {isClickable && (
                        <div className="shrink-0">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Eye className="h-4 w-4 text-emerald-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pb-8">
          <p className="text-emerald-200/30 text-xs">
            Propulsé par 4Media • {format(new Date(), 'yyyy')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}
