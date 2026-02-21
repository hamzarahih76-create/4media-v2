-- 2. Create designer_stats table (simplified gamification)
CREATE TABLE public.designer_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_designs_delivered integer NOT NULL DEFAULT 0,
  total_on_time integer NOT NULL DEFAULT 0,
  total_late integer NOT NULL DEFAULT 0,
  total_revisions integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 5.00,
  streak_days integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on designer_stats
ALTER TABLE public.designer_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for designer_stats
CREATE POLICY "Designers can view own stats"
ON public.designer_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and PMs can view all designer stats"
ON public.designer_stats FOR SELECT
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Create designer stats on signup"
ON public.designer_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Create design_tasks table
CREATE TABLE public.design_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  assigned_to uuid,
  created_by uuid,
  title text NOT NULL,
  description text,
  client_name text,
  project_name text,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'medium',
  reward_level text DEFAULT 'standard',
  client_type text DEFAULT 'b2b',
  deadline timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  design_count integer DEFAULT 1,
  designs_completed integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on design_tasks
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for design_tasks
CREATE POLICY "Admins and PMs can manage design tasks"
ON public.design_tasks FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Designers can view assigned or created tasks"
ON public.design_tasks FOR SELECT
USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Designers can update their tasks status"
ON public.design_tasks FOR UPDATE
USING (auth.uid() = assigned_to OR auth.uid() = created_by)
WITH CHECK (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Designers can create B2C tasks"
ON public.design_tasks FOR INSERT
WITH CHECK (auth.uid() = created_by AND client_type = 'b2c');

-- 4. Create design_deliveries table
CREATE TABLE public.design_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  delivery_type text NOT NULL,
  file_path text,
  external_link text,
  link_type text,
  notes text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on design_deliveries
ALTER TABLE public.design_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for design_deliveries
CREATE POLICY "Admins and PMs can manage design deliveries"
ON public.design_deliveries FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Designers can create deliveries"
ON public.design_deliveries FOR INSERT
WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Designers can view their deliveries"
ON public.design_deliveries FOR SELECT
USING (auth.uid() = designer_id);

-- 5. Create design_review_links table (for client validation)
CREATE TABLE public.design_review_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  delivery_id uuid NOT NULL REFERENCES public.design_deliveries(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  is_active boolean NOT NULL DEFAULT true,
  views_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on design_review_links
ALTER TABLE public.design_review_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for design_review_links
CREATE POLICY "Admins and PMs can manage design review links"
ON public.design_review_links FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Anyone can view active design review links"
ON public.design_review_links FOR SELECT
USING (is_active = true AND expires_at > now());

CREATE POLICY "Designers can view their design review links"
ON public.design_review_links FOR SELECT
USING (EXISTS (
  SELECT 1 FROM design_deliveries dd
  WHERE dd.id = design_review_links.delivery_id AND dd.designer_id = auth.uid()
));

CREATE POLICY "Anyone can deactivate used design review links"
ON public.design_review_links FOR UPDATE
USING (is_active = true AND expires_at > now());

-- 6. Create design_feedback table
CREATE TABLE public.design_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_task_id uuid NOT NULL REFERENCES public.design_tasks(id) ON DELETE CASCADE,
  delivery_id uuid NOT NULL REFERENCES public.design_deliveries(id) ON DELETE CASCADE,
  review_link_id uuid REFERENCES public.design_review_links(id),
  decision text NOT NULL,
  feedback_text text,
  rating integer,
  revision_notes text,
  revision_images text[] DEFAULT '{}',
  reviewed_by text,
  validated_by_pm boolean DEFAULT false,
  reviewed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on design_feedback
ALTER TABLE public.design_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for design_feedback
CREATE POLICY "Admins and PMs can manage design feedback"
ON public.design_feedback FOR ALL
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Designers can view feedback on their deliveries"
ON public.design_feedback FOR SELECT
USING (EXISTS (
  SELECT 1 FROM design_deliveries dd
  WHERE dd.id = design_feedback.delivery_id AND dd.designer_id = auth.uid()
));

-- Allow public insert for design_feedback via review link
CREATE POLICY "Anyone can submit design feedback via review link"
ON public.design_feedback FOR INSERT
WITH CHECK (
  review_link_id IS NULL OR EXISTS (
    SELECT 1 FROM design_review_links drl
    WHERE drl.id = design_feedback.review_link_id 
    AND drl.is_active = true 
    AND drl.expires_at > now()
  )
);

-- 7. Create trigger function for new designer signup
CREATE OR REPLACE FUNCTION public.handle_new_designer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if user signed up as designer
  IF NEW.raw_user_meta_data->>'role' = 'designer' THEN
    -- Create designer stats
    INSERT INTO public.designer_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer')
    ON CONFLICT (user_id) DO NOTHING;

    -- Create team member entry
    INSERT INTO public.team_members (
      user_id,
      email,
      full_name,
      role,
      position,
      department,
      status,
      validation_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'designer',
      'Designer',
      'Design',
      'incomplete',
      'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      role = 'designer',
      position = 'Designer',
      department = 'Design',
      status = CASE 
        WHEN team_members.status = 'pending' THEN 'incomplete'
        ELSE team_members.status
      END;
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Create trigger for designer signup
DROP TRIGGER IF EXISTS on_designer_created ON auth.users;
CREATE TRIGGER on_designer_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_designer();