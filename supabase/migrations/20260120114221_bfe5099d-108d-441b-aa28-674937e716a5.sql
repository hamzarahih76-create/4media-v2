-- Add total_production_time_minutes column to track average production time
ALTER TABLE public.editor_stats
ADD COLUMN IF NOT EXISTS total_production_time_minutes integer NOT NULL DEFAULT 0;

-- Create or replace function to update editor stats when a video is completed
CREATE OR REPLACE FUNCTION public.update_editor_stats_on_video_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_editor_id uuid;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_production_time_minutes integer;
  v_was_on_time boolean;
  v_deadline timestamptz;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_editor_id := NEW.assigned_to;
    v_started_at := NEW.started_at;
    v_completed_at := COALESCE(NEW.completed_at, now());
    v_deadline := NEW.deadline;
    
    -- Calculate production time in minutes
    IF v_started_at IS NOT NULL THEN
      v_production_time_minutes := EXTRACT(EPOCH FROM (v_completed_at - v_started_at)) / 60;
    ELSE
      v_production_time_minutes := 0;
    END IF;
    
    -- Check if delivery was on time
    v_was_on_time := (v_deadline IS NULL) OR (v_completed_at <= v_deadline);
    
    -- Update editor stats
    INSERT INTO public.editor_stats (user_id, total_videos_delivered, total_on_time, total_production_time_minutes, updated_at)
    VALUES (v_editor_id, 1, CASE WHEN v_was_on_time THEN 1 ELSE 0 END, v_production_time_minutes, now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_videos_delivered = editor_stats.total_videos_delivered + 1,
      total_on_time = editor_stats.total_on_time + CASE WHEN v_was_on_time THEN 1 ELSE 0 END,
      total_late = editor_stats.total_late + CASE WHEN NOT v_was_on_time THEN 1 ELSE 0 END,
      total_production_time_minutes = editor_stats.total_production_time_minutes + v_production_time_minutes,
      last_activity_date = CURRENT_DATE,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on videos table
DROP TRIGGER IF EXISTS update_editor_stats_on_video_completion_trigger ON public.videos;
CREATE TRIGGER update_editor_stats_on_video_completion_trigger
  AFTER UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_editor_stats_on_video_completion();

-- Add unique constraint on user_id for upsert to work
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'editor_stats_user_id_unique') THEN
    ALTER TABLE public.editor_stats ADD CONSTRAINT editor_stats_user_id_unique UNIQUE (user_id);
  END IF;
END $$;