-- Fix infinite recursion in design_review_links RLS policies
-- The issue: design_tasks policies reference design_review_links, and vice versa

-- Drop the problematic policies on design_tasks that cause recursion
DROP POLICY IF EXISTS "Anyone can view design tasks via active review link" ON design_tasks;
DROP POLICY IF EXISTS "Anyone can update design task status via review link" ON design_tasks;

-- Create a security definer function to check for active review links without RLS
CREATE OR REPLACE FUNCTION public.design_task_has_active_review_link(task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM design_review_links drl
    WHERE drl.design_task_id = task_id
      AND drl.is_active = true
      AND drl.expires_at > now()
  )
$$;

-- Recreate the policies using the security definer function
CREATE POLICY "Anyone can view design tasks via active review link"
ON design_tasks FOR SELECT
USING (public.design_task_has_active_review_link(id));

CREATE POLICY "Anyone can update design task status via review link"
ON design_tasks FOR UPDATE
USING (public.design_task_has_active_review_link(id));