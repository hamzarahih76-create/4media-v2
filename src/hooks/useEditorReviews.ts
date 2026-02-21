import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EditorReview {
  id: string;
  rating: number | null;
  feedback_text: string | null;
  reviewed_at: string;
  video_title: string | null;
}

export function useEditorReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['editor-reviews', user?.id],
    queryFn: async (): Promise<EditorReview[]> => {
      if (!user?.id) return [];

      // Get all videos assigned to this editor
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id, title')
        .eq('assigned_to', user.id);

      if (videosError) throw videosError;
      if (!videos || videos.length === 0) return [];

      const videoIds = videos.map(v => v.id);
      const videoMap = new Map(videos.map(v => [v.id, v.title]));

      // Get feedback for these videos
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('video_feedback')
        .select('id, rating, feedback_text, reviewed_at, video_id')
        .in('video_id', videoIds)
        .eq('decision', 'approved')
        .not('rating', 'is', null)
        .order('reviewed_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      return (feedbacks || []).map(feedback => ({
        id: feedback.id,
        rating: feedback.rating,
        feedback_text: feedback.feedback_text,
        reviewed_at: feedback.reviewed_at,
        video_title: videoMap.get(feedback.video_id) || null,
      }));
    },
    enabled: !!user?.id,
  });
}
