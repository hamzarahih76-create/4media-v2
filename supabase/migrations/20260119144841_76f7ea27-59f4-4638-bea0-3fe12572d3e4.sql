
-- Drop existing restrictive policies on videos for admin/PM
DROP POLICY IF EXISTS "Admins and PMs can manage videos" ON public.videos;

-- Create new permissive policy for admin/PM to see ALL videos
CREATE POLICY "Admins and PMs can view all videos"
ON public.videos
FOR SELECT
USING (is_admin_or_pm(auth.uid()));

-- Create new permissive policy for admin/PM to manage ALL videos
CREATE POLICY "Admins and PMs can manage all videos"
ON public.videos
FOR ALL
USING (is_admin_or_pm(auth.uid()))
WITH CHECK (is_admin_or_pm(auth.uid()));

-- Drop existing policy on video_deliveries for admin/PM SELECT
DROP POLICY IF EXISTS "Admins and PMs can manage video deliveries" ON public.video_deliveries;

-- Create new permissive policy for admin/PM to see ALL video deliveries
CREATE POLICY "Admins and PMs can view all video deliveries"
ON public.video_deliveries
FOR SELECT
USING (is_admin_or_pm(auth.uid()));

-- Create new permissive policy for admin/PM to manage ALL video deliveries
CREATE POLICY "Admins and PMs can manage all video deliveries"
ON public.video_deliveries
FOR ALL
USING (is_admin_or_pm(auth.uid()))
WITH CHECK (is_admin_or_pm(auth.uid()));

-- Also fix video_review_links to allow admin/PM full access
DROP POLICY IF EXISTS "Admins and PMs can manage video review links" ON public.video_review_links;

CREATE POLICY "Admins and PMs can view all video review links"
ON public.video_review_links
FOR SELECT
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can manage all video review links"
ON public.video_review_links
FOR ALL
USING (is_admin_or_pm(auth.uid()))
WITH CHECK (is_admin_or_pm(auth.uid()));

-- Fix video_feedback as well
DROP POLICY IF EXISTS "Admins and PMs can manage video feedback" ON public.video_feedback;

CREATE POLICY "Admins and PMs can view all video feedback"
ON public.video_feedback
FOR SELECT
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can manage all video feedback"
ON public.video_feedback
FOR ALL
USING (is_admin_or_pm(auth.uid()))
WITH CHECK (is_admin_or_pm(auth.uid()));
