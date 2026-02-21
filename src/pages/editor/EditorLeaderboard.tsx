import { useState, useEffect, useMemo } from 'react';
import { EditorLayout } from '@/components/layout/EditorLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy,
  Medal,
  Crown,
  Star,
  TrendingUp,
  Eye,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { startOfWeek, startOfMonth, isAfter, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EditorRanking {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_videos_validated: number;
  average_rating: number;
  position: number;
}

interface EditorReview {
  id: string;
  rating: number;
  feedback_text: string | null;
  reviewed_at: string;
  task_title: string;
}

export default function EditorLeaderboard() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<EditorRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('month');
  
  // Reviews modal state
  const [selectedEditor, setSelectedEditor] = useState<EditorRanking | null>(null);
  const [editorReviews, setEditorReviews] = useState<EditorReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);
      try {
        // Fetch all active editors from team_members
        const { data: editors, error: editorsError } = await supabase
          .from('team_members')
          .select('id, user_id, full_name, avatar_url')
          .eq('status', 'active')
          .in('role', ['editor', 'senior_editor', 'lead_editor']);

        if (editorsError) throw editorsError;

        // Fetch all validated tasks (completed with feedback)
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select(`
            id,
            assigned_to,
            completed_at,
            client_feedback(rating)
          `)
          .eq('status', 'completed')
          .not('completed_at', 'is', null);

        if (tasksError) throw tasksError;

        // Calculate date filter
        const now = new Date();
        let filterDate: Date | null = null;
        if (timeFilter === 'week') {
          filterDate = startOfWeek(now, { weekStartsOn: 1 });
        } else if (timeFilter === 'month') {
          filterDate = startOfMonth(now);
        }

        // Count validated videos per editor
        const editorStats = new Map<string, { count: number; ratings: number[] }>();

        (tasks || []).forEach((task: any) => {
          if (!task.assigned_to) return;
          
          // Apply time filter
          if (filterDate && task.completed_at) {
            const completedDate = new Date(task.completed_at);
            if (!isAfter(completedDate, filterDate)) return;
          }

          const stats = editorStats.get(task.assigned_to) || { count: 0, ratings: [] };
          stats.count += 1;
          
          // Get rating if available
          if (task.client_feedback && task.client_feedback.length > 0) {
            const rating = task.client_feedback[0]?.rating;
            if (rating) stats.ratings.push(rating);
          }
          
          editorStats.set(task.assigned_to, stats);
        });

        // Build rankings
        const formattedRankings: EditorRanking[] = (editors || [])
          .map((editor: any) => {
            const stats = editorStats.get(editor.user_id) || { count: 0, ratings: [] };
            const avgRating = stats.ratings.length > 0 
              ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length 
              : 5;
            
            return {
              id: editor.id,
              user_id: editor.user_id || '',
              full_name: editor.full_name || 'Éditeur',
              avatar_url: editor.avatar_url,
              total_videos_validated: stats.count,
              average_rating: avgRating,
              position: 0,
            };
          })
          .sort((a, b) => b.total_videos_validated - a.total_videos_validated)
          .map((editor, index) => ({
            ...editor,
            position: index + 1,
          }));

        setRankings(formattedRankings);
      } catch (error) {
        console.error('Error fetching rankings:', error);
        // Fallback mock data
        setRankings([
          { id: '1', user_id: '1', full_name: 'Sarah M.', avatar_url: null, total_videos_validated: 45, average_rating: 4.9, position: 1 },
          { id: '2', user_id: '2', full_name: 'Ahmed K.', avatar_url: null, total_videos_validated: 38, average_rating: 4.8, position: 2 },
          { id: '3', user_id: '3', full_name: 'Marie L.', avatar_url: null, total_videos_validated: 32, average_rating: 4.7, position: 3 },
          { id: '4', user_id: '4', full_name: 'Jean P.', avatar_url: null, total_videos_validated: 28, average_rating: 4.6, position: 4 },
          { id: '5', user_id: '5', full_name: 'Fatima Z.', avatar_url: null, total_videos_validated: 25, average_rating: 4.9, position: 5 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [timeFilter]);

  const fetchEditorReviews = async (editor: EditorRanking) => {
    setSelectedEditor(editor);
    setIsLoadingReviews(true);
    setEditorReviews([]);

    try {
      // First get videos assigned to this editor
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id, title')
        .eq('assigned_to', editor.user_id);

      if (videosError) throw videosError;
      if (!videos || videos.length === 0) {
        setEditorReviews([]);
        return;
      }

      const videoIds = videos.map(v => v.id);
      const videoMap = new Map(videos.map(v => [v.id, v.title]));

      // Fetch reviews from video_feedback table
      const { data: feedbacks, error } = await supabase
        .from('video_feedback')
        .select('id, rating, feedback_text, reviewed_at, video_id')
        .in('video_id', videoIds)
        .eq('decision', 'approved')
        .not('rating', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const reviews: EditorReview[] = (feedbacks || []).map((f: any) => ({
        id: f.id,
        rating: f.rating,
        feedback_text: f.feedback_text,
        reviewed_at: f.reviewed_at,
        task_title: videoMap.get(f.video_id) || 'Vidéo',
      }));

      setEditorReviews(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setEditorReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const myRanking = useMemo(() => {
    return rankings.find(r => r.user_id === user?.id) || null;
  }, [rankings, user?.id]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRowStyle = (position: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-primary/10 border-l-4 border-l-primary';
    }
    switch (position) {
      case 1:
        return 'bg-yellow-50 dark:bg-yellow-950/20';
      case 2:
        return 'bg-gray-50 dark:bg-gray-900/30';
      case 3:
        return 'bg-amber-50 dark:bg-amber-950/20';
      default:
        return 'hover:bg-muted/50';
    }
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'week':
        return 'cette semaine';
      case 'month':
        return 'ce mois';
      default:
        return 'depuis le début';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <EditorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7 text-yellow-500" />
              Classement
            </h1>
            <p className="text-muted-foreground">
              Comparez vos performances avec les autres éditeurs ({getTimeFilterLabel()})
            </p>
          </div>
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="week">Semaine</TabsTrigger>
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="all">Tout</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* My Position Card */}
        {myRanking && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    #{myRanking.position}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Votre position</p>
                    <p className="text-sm text-muted-foreground">
                      sur {rankings.length} éditeurs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{myRanking.total_videos_validated}</p>
                    <p className="text-muted-foreground">Vidéos validées</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold flex items-center gap-1 justify-center">
                      <Star className="h-5 w-5 text-yellow-500" />
                      {myRanking.average_rating.toFixed(1)}
                    </p>
                    <p className="text-muted-foreground">Note moyenne</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Rankings Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Classement par vidéos validées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Chargement du classement...
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Aucun éditeur à afficher
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header row */}
                <div className="flex items-center gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                  <span className="w-12 text-center">#</span>
                  <span className="flex-1">Éditeur</span>
                  <span className="w-32 text-center">Vidéos validées</span>
                  <span className="w-24 text-center">Note</span>
                  <span className="w-24 text-center">Avis</span>
                </div>

                {/* Rankings list */}
                {rankings.map((editor) => {
                  const isCurrentUser = editor.user_id === user?.id;
                  return (
                    <div
                      key={editor.id}
                      className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${getRowStyle(editor.position, isCurrentUser)}`}
                    >
                      {/* Position */}
                      <div className="w-12 flex items-center justify-center">
                        {getRankIcon(editor.position) || (
                          <span className="text-lg font-bold text-muted-foreground">
                            {editor.position}
                          </span>
                        )}
                      </div>

                      {/* Editor info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={editor.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {editor.full_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                            {editor.full_name}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Vous
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Videos count */}
                      <div className="w-32 text-center">
                        <span className={`text-xl font-bold ${editor.position <= 3 ? 'text-primary' : ''}`}>
                          {editor.total_videos_validated}
                        </span>
                        <span className="text-muted-foreground ml-1 text-sm">vidéos</span>
                      </div>

                      {/* Rating */}
                      <div className="w-24 flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{editor.average_rating.toFixed(1)}</span>
                      </div>

                      {/* View Reviews Button */}
                      <div className="w-24 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => fetchEditorReviews(editor)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews Modal */}
      <Dialog open={!!selectedEditor} onOpenChange={() => setSelectedEditor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEditor && (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedEditor.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedEditor.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedEditor.full_name}</p>
                    <p className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      {selectedEditor.average_rating.toFixed(1)} · {selectedEditor.total_videos_validated} vidéos
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            {isLoadingReviews ? (
              <div className="py-8 text-center text-muted-foreground">
                Chargement des avis...
              </div>
            ) : editorReviews.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Aucun avis disponible</p>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                {editorReviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      {renderStars(review.rating)}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(review.reviewed_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {review.task_title}
                    </p>
                    {review.feedback_text && (
                      <p className="text-sm italic">"{review.feedback_text}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </EditorLayout>
  );
}
