-- Drop existing restrictive policies on videos table
DROP POLICY IF EXISTS "Admins and PMs can manage all videos" ON public.videos;
DROP POLICY IF EXISTS "Admins and PMs can view all videos" ON public.videos;
DROP POLICY IF EXISTS "Anyone can update video status via review" ON public.videos;
DROP POLICY IF EXISTS "Editors can update their assigned videos status" ON public.videos;
DROP POLICY IF EXISTS "Editors can view assigned videos" ON public.videos;

-- Recreate as PERMISSIVE policies (default - allows OR logic between policies)
CREATE POLICY "Admins and PMs can manage all videos" 
ON public.videos 
FOR ALL 
USING (is_admin_or_pm(auth.uid()))
WITH CHECK (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can view all videos" 
ON public.videos 
FOR SELECT 
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Anyone can update video status via review" 
ON public.videos 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM video_review_links vrl
  WHERE vrl.video_id = videos.id 
    AND vrl.is_active = true 
    AND vrl.expires_at > now()
));

CREATE POLICY "Editors can update their assigned videos status" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Editors can view assigned videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = assigned_to);