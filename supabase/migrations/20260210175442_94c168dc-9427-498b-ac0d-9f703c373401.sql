
-- Create video_project_review_links table (same pattern as design_project_review_links)
CREATE TABLE public.video_project_review_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_project_review_links ENABLE ROW LEVEL SECURITY;

-- Admins/PMs can manage links
CREATE POLICY "Admins and PMs can manage video project review links"
ON public.video_project_review_links
FOR ALL
USING (public.is_admin_or_pm(auth.uid()));

-- Anyone can read active links by token (for anonymous client access)
CREATE POLICY "Anyone can view active video project review links by token"
ON public.video_project_review_links
FOR SELECT
USING (is_active = true);

-- Anyone can update view count on active links
CREATE POLICY "Anyone can update view count on active links"
ON public.video_project_review_links
FOR UPDATE
USING (is_active = true)
WITH CHECK (is_active = true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_project_review_links;
