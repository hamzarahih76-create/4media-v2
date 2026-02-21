
-- Table for project-level review links (read-only client view of entire project)
CREATE TABLE public.design_project_review_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  design_task_id UUID NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  views_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT design_project_review_links_token_key UNIQUE (token)
);

-- Enable RLS
ALTER TABLE public.design_project_review_links ENABLE ROW LEVEL SECURITY;

-- Admins/PMs can manage
CREATE POLICY "Admins and PMs can manage project review links"
  ON public.design_project_review_links
  FOR ALL
  USING (public.is_admin_or_pm(auth.uid()));

-- Anyone can read active links by token (for public client access)
CREATE POLICY "Anyone can read active project review links by token"
  ON public.design_project_review_links
  FOR SELECT
  USING (is_active = true);

-- Allow anonymous updates for view count tracking
CREATE POLICY "Anyone can update view count"
  ON public.design_project_review_links
  FOR UPDATE
  USING (is_active = true)
  WITH CHECK (is_active = true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_project_review_links;

-- Index for token lookup
CREATE INDEX idx_design_project_review_links_token ON public.design_project_review_links(token);
CREATE INDEX idx_design_project_review_links_task ON public.design_project_review_links(design_task_id);
