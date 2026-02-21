-- Fix: Add explicit INSERT policy for admins and PMs on videos table
-- The current "ALL" policy might not work correctly for inserts in some cases

-- First, ensure there's no conflicting INSERT-specific policy
DROP POLICY IF EXISTS "Admins and PMs can insert videos" ON public.videos;

-- Create explicit INSERT policy for admins and PMs
CREATE POLICY "Admins and PMs can insert videos"
ON public.videos
FOR INSERT
WITH CHECK (is_admin_or_pm(auth.uid()));