-- Create video status enum
DO $$ BEGIN
  CREATE TYPE video_status AS ENUM ('new', 'active', 'in_progress', 'in_review', 'revision_requested', 'completed', 'late', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create videos table (unit of work within a task/project)
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline TIMESTAMP WITH TIME ZONE,
  allowed_duration_minutes INTEGER DEFAULT 300, -- 5h default
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  validation_rating INTEGER CHECK (validation_rating >= 1 AND validation_rating <= 5),
  revision_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video deliveries table
CREATE TABLE public.video_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES auth.users(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  delivery_type TEXT NOT NULL,
  file_path TEXT,
  external_link TEXT,
  link_type TEXT,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video review links table
CREATE TABLE public.video_review_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.video_deliveries(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  views_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Create video feedback table
CREATE TABLE public.video_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.video_deliveries(id) ON DELETE CASCADE,
  review_link_id UUID NOT NULL REFERENCES public.video_review_links(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  revision_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add video_count and videos_completed to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS videos_completed INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_feedback ENABLE ROW LEVEL SECURITY;

-- Videos policies
CREATE POLICY "Admins and PMs can manage videos"
ON public.videos FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can view assigned videos"
ON public.videos FOR SELECT
USING (auth.uid() = assigned_to);

CREATE POLICY "Editors can update their assigned videos status"
ON public.videos FOR UPDATE
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Video deliveries policies
CREATE POLICY "Admins and PMs can manage video deliveries"
ON public.video_deliveries FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can create video deliveries"
ON public.video_deliveries FOR INSERT
WITH CHECK (auth.uid() = editor_id);

CREATE POLICY "Editors can view their video deliveries"
ON public.video_deliveries FOR SELECT
USING (auth.uid() = editor_id);

-- Video review links policies
CREATE POLICY "Admins and PMs can manage video review links"
ON public.video_review_links FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can view their video review links"
ON public.video_review_links FOR SELECT
USING (EXISTS (
  SELECT 1 FROM video_deliveries vd
  WHERE vd.id = video_review_links.delivery_id AND vd.editor_id = auth.uid()
));

-- Video feedback policies
CREATE POLICY "Admins and PMs can manage video feedback"
ON public.video_feedback FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can view feedback on their videos"
ON public.video_feedback FOR SELECT
USING (EXISTS (
  SELECT 1 FROM video_deliveries vd
  WHERE vd.id = video_feedback.delivery_id AND vd.editor_id = auth.uid()
));

-- Function to update task progress when videos are validated
CREATE OR REPLACE FUNCTION public.update_task_video_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the task's videos_completed count
  UPDATE tasks
  SET videos_completed = (
    SELECT COUNT(*) FROM videos 
    WHERE task_id = NEW.task_id AND is_validated = TRUE
  ),
  status = CASE
    WHEN (SELECT COUNT(*) FROM videos WHERE task_id = NEW.task_id AND is_validated = TRUE) = 
         (SELECT video_count FROM tasks WHERE id = NEW.task_id)
    THEN 'completed'
    ELSE status
  END,
  completed_at = CASE
    WHEN (SELECT COUNT(*) FROM videos WHERE task_id = NEW.task_id AND is_validated = TRUE) = 
         (SELECT video_count FROM tasks WHERE id = NEW.task_id)
    THEN now()
    ELSE completed_at
  END,
  updated_at = now()
  WHERE id = NEW.task_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update task progress
CREATE TRIGGER on_video_validated
  AFTER UPDATE OF is_validated ON public.videos
  FOR EACH ROW
  WHEN (NEW.is_validated = TRUE)
  EXECUTE FUNCTION public.update_task_video_progress();

-- Enable realtime for videos table
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;

-- Create indexes for performance
CREATE INDEX idx_videos_task_id ON public.videos(task_id);
CREATE INDEX idx_videos_assigned_to ON public.videos(assigned_to);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_video_deliveries_video_id ON public.video_deliveries(video_id);
CREATE INDEX idx_video_deliveries_editor_id ON public.video_deliveries(editor_id);