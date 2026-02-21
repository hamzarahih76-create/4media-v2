-- Create tasks table for production workflow
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NULL,
  assigned_to UUID NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  project_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'in_review', 'revision_requested', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reward_level TEXT DEFAULT 'standard' CHECK (reward_level IN ('standard', 'high', 'premium')),
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task deliveries table (versions v1, v2, etc.)
CREATE TABLE public.task_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('file', 'link')),
  file_path TEXT,
  external_link TEXT,
  link_type TEXT CHECK (link_type IN ('drive', 'frame', 'dropbox', 'other')),
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client review links table
CREATE TABLE public.review_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.task_deliveries(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client feedback table
CREATE TABLE public.client_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_link_id UUID NOT NULL REFERENCES public.review_links(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.task_deliveries(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'revision_requested')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  revision_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Editors can view assigned tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = assigned_to);

CREATE POLICY "Admins and PMs can view all tasks" ON public.tasks
  FOR SELECT USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can manage tasks" ON public.tasks
  FOR ALL USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can update their tasks status" ON public.tasks
  FOR UPDATE USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

-- Task deliveries policies
CREATE POLICY "Editors can view their deliveries" ON public.task_deliveries
  FOR SELECT USING (auth.uid() = editor_id);

CREATE POLICY "Admins and PMs can view all deliveries" ON public.task_deliveries
  FOR SELECT USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can create deliveries" ON public.task_deliveries
  FOR INSERT WITH CHECK (auth.uid() = editor_id);

CREATE POLICY "Admins and PMs can manage deliveries" ON public.task_deliveries
  FOR ALL USING (is_admin_or_pm(auth.uid()));

-- Review links policies
CREATE POLICY "Editors can view their task review links" ON public.review_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_deliveries td
      WHERE td.id = delivery_id AND td.editor_id = auth.uid()
    )
  );

CREATE POLICY "Admins and PMs can manage review links" ON public.review_links
  FOR ALL USING (is_admin_or_pm(auth.uid()));

-- Client feedback policies (public read for review token validation)
CREATE POLICY "Admins and PMs can view all feedback" ON public.client_feedback
  FOR SELECT USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Editors can view feedback on their deliveries" ON public.client_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_deliveries td
      WHERE td.id = delivery_id AND td.editor_id = auth.uid()
    )
  );

CREATE POLICY "Admins and PMs can manage feedback" ON public.client_feedback
  FOR ALL USING (is_admin_or_pm(auth.uid()));

-- Create storage bucket for video deliveries
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('deliveries', 'deliveries', false, 524288000);

-- Storage policies for deliveries bucket
CREATE POLICY "Editors can upload deliveries" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'deliveries' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view deliveries" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'deliveries' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can manage all deliveries" ON storage.objects
  FOR ALL USING (
    bucket_id = 'deliveries' 
    AND is_admin_or_pm(auth.uid())
  );

-- Function to get next version number
CREATE OR REPLACE FUNCTION public.get_next_version_number(p_task_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM public.task_deliveries WHERE task_id = p_task_id),
    1
  );
END;
$$;

-- Function to submit delivery for review (creates review link)
CREATE OR REPLACE FUNCTION public.submit_for_review(p_delivery_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_id UUID;
  v_review_link_id UUID;
  v_token TEXT;
BEGIN
  -- Get task_id from delivery
  SELECT task_id INTO v_task_id
  FROM public.task_deliveries
  WHERE id = p_delivery_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  -- Deactivate previous review links for this task
  UPDATE public.review_links
  SET is_active = false
  WHERE task_id = v_task_id AND is_active = true;

  -- Create new review link
  INSERT INTO public.review_links (task_id, delivery_id)
  VALUES (v_task_id, p_delivery_id)
  RETURNING id, token INTO v_review_link_id, v_token;

  -- Update task status to in_review
  UPDATE public.tasks
  SET status = 'in_review', updated_at = now()
  WHERE id = v_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_link_id', v_review_link_id,
    'token', v_token
  );
END;
$$;

-- Trigger to update task updated_at
CREATE OR REPLACE FUNCTION public.update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_updated_at();