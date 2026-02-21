
-- Add copywriter_id to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS copywriter_id uuid;

-- Trigger function for new copywriter signup
CREATE OR REPLACE FUNCTION public.handle_new_copywriter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := NEW.raw_user_meta_data->>'role';
  
  IF v_role = 'copywriter' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'copywriter')
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.team_members (user_id, email, full_name, role, status, validation_status)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'copywriter', 'pending', 'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      status = 'pending',
      validation_status = 'pending';
    
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_permissions (user_id, permission)
    VALUES (NEW.id, 'access_copywriter')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_copywriter_signup ON auth.users;
CREATE TRIGGER on_copywriter_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_copywriter();

-- RLS: Copywriters can view their assigned tasks
CREATE POLICY "Copywriters can view their assigned tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'copywriter') AND copywriter_id = auth.uid());

-- RLS: Copywriters can view assigned client profiles
CREATE POLICY "Copywriters can view assigned client profiles"
  ON public.client_profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'copywriter') AND 
    user_id IN (SELECT client_user_id FROM public.tasks WHERE copywriter_id = auth.uid() AND client_user_id IS NOT NULL)
  );

-- RLS: Copywriters CRUD on client_content_items
CREATE POLICY "Copywriters can view content of assigned clients"
  ON public.client_content_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'copywriter') AND 
    client_user_id IN (SELECT client_user_id FROM public.tasks WHERE copywriter_id = auth.uid() AND client_user_id IS NOT NULL)
  );

CREATE POLICY "Copywriters can create content for assigned clients"
  ON public.client_content_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'copywriter') AND 
    client_user_id IN (SELECT client_user_id FROM public.tasks WHERE copywriter_id = auth.uid() AND client_user_id IS NOT NULL)
  );

CREATE POLICY "Copywriters can update content they created"
  ON public.client_content_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'copywriter') AND created_by = auth.uid());

CREATE POLICY "Copywriters can delete content they created"
  ON public.client_content_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'copywriter') AND created_by = auth.uid());

-- RLS: Copywriters can read their own team_members entry
CREATE POLICY "Copywriters can view own team member"
  ON public.team_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'copywriter') AND user_id = auth.uid());

-- RLS: Copywriters can read videos of their assigned tasks  
CREATE POLICY "Copywriters can view videos of assigned tasks"
  ON public.videos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'copywriter') AND 
    task_id IN (SELECT id FROM public.tasks WHERE copywriter_id = auth.uid())
  );
