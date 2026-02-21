
-- Fix the slow tasks policy that directly queries videos + video_review_links
-- This causes cross-table RLS evaluation chains that slow everything down

-- Create a SECURITY DEFINER function to check if a task has an active video review link
CREATE OR REPLACE FUNCTION public.task_has_active_video_review_link(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM videos v
    JOIN video_review_links vrl ON vrl.video_id = v.id
    WHERE v.task_id = p_task_id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
  OR EXISTS (
    SELECT 1
    FROM review_links rl
    WHERE rl.task_id = p_task_id
    AND rl.is_active = true
    AND rl.expires_at > now()
  )
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Anyone can view tasks via active video review link" ON public.tasks;

CREATE POLICY "Anyone can view tasks via active video review link"
ON public.tasks
FOR SELECT
USING (task_has_active_video_review_link(id));

-- Also fix the UPDATE policy on tasks that directly queries review_links
DROP POLICY IF EXISTS "Anyone can update task status via review" ON public.tasks;

CREATE OR REPLACE FUNCTION public.task_has_active_review_link_fn(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM review_links rl
    WHERE rl.task_id = p_task_id
    AND rl.is_active = true
    AND rl.expires_at > now()
  )
$$;

CREATE POLICY "Anyone can update task status via review"
ON public.tasks
FOR UPDATE
USING (task_has_active_review_link_fn(id));
