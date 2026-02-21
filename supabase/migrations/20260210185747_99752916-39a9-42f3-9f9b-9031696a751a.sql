
-- 0. Create the update_updated_at function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Add 'client' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- 2. Create client_profiles table for branding & info
CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  logo_url text,
  primary_color text DEFAULT '#22c55e',
  secondary_color text DEFAULT '#022c22',
  accent_color text DEFAULT '#10b981',
  industry text,
  subscription_type text DEFAULT 'starter',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create workflow_step enum
CREATE TYPE public.workflow_step AS ENUM (
  'idea', 'script', 'filmmaking', 'editing', 'publication', 'analysis'
);

-- 4. Create content_status enum
CREATE TYPE public.content_status AS ENUM (
  'draft', 'in_progress', 'pending_review', 'validated', 'delivered', 'revision_requested'
);

-- 5. Create client_content_items table
CREATE TABLE public.client_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  workflow_step public.workflow_step NOT NULL DEFAULT 'idea',
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'idea',
  status public.content_status NOT NULL DEFAULT 'draft',
  file_url text,
  external_link text,
  related_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  related_design_task_id uuid REFERENCES public.design_tasks(id) ON DELETE SET NULL,
  related_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  created_by uuid,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Create client_analytics table
CREATE TABLE public.client_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  month date NOT NULL,
  followers_count integer,
  followers_change integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  engagement_rate numeric(5,2),
  top_content_id uuid REFERENCES public.client_content_items(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_user_id, month)
);

-- 7. Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_analytics ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies
CREATE POLICY "Clients can view own profile" ON public.client_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins and PMs can manage client profiles" ON public.client_profiles FOR ALL USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Clients can view own content" ON public.client_content_items FOR SELECT USING (auth.uid() = client_user_id);
CREATE POLICY "Admins and PMs can manage all content items" ON public.client_content_items FOR ALL USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Clients can view own analytics" ON public.client_analytics FOR SELECT USING (auth.uid() = client_user_id);
CREATE POLICY "Admins and PMs can manage all analytics" ON public.client_analytics FOR ALL USING (is_admin_or_pm(auth.uid()));

-- 9. Updated_at triggers
CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_content_items_updated_at BEFORE UPDATE ON public.client_content_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_analytics_updated_at BEFORE UPDATE ON public.client_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Indexes
CREATE INDEX idx_client_content_items_client ON public.client_content_items(client_user_id);
CREATE INDEX idx_client_content_items_step ON public.client_content_items(workflow_step);
CREATE INDEX idx_client_analytics_client_month ON public.client_analytics(client_user_id, month);

-- 11. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_content_items;
