
-- Fix 1: Restrict profiles table - only own profile or admin/PM
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admin/PM can view all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR is_admin_or_pm(auth.uid())
);

-- Fix 2: Restrict team_members table - only own record or admin/PM
DROP POLICY IF EXISTS "Authenticated can view team members" ON public.team_members;
CREATE POLICY "Users can view own record or admin/PM can view all"
ON public.team_members FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin_or_pm(auth.uid())
);

-- Fix 3: Restrict tasks table review link policy - hide client_name/project_name
-- We can't do field-level RLS, so instead restrict to only needed fields via a view
-- For now, tighten the policy to require a valid active review link match
DROP POLICY IF EXISTS "Anyone can view tasks via active video review link" ON public.tasks;
CREATE POLICY "Anyone can view tasks via active video review link"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.video_review_links vrl ON vrl.video_id = v.id
    WHERE v.task_id = tasks.id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
  OR EXISTS (
    SELECT 1 FROM public.review_links rl
    WHERE rl.task_id = tasks.id
    AND rl.is_active = true
    AND rl.expires_at > now()
  )
);

-- Fix 4: Restrict deliveries storage bucket - only task owner or admin/PM
DROP POLICY IF EXISTS "Authenticated users can view deliveries" ON storage.objects;
CREATE POLICY "Users can view own task deliveries or admin/PM can view all"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deliveries' AND (
    is_admin_or_pm(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id::text = (storage.foldername(name))[1] AND t.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.videos v WHERE v.id::text = (storage.foldername(name))[1] AND v.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.design_tasks dt WHERE dt.id::text = (storage.foldername(name))[1] AND dt.assigned_to = auth.uid()
    )
  )
);
