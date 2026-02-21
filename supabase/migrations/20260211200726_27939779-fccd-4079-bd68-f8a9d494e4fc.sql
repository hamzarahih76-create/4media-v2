-- Fix infinite recursion between tasks and videos policies

-- 1. Create a security definer function to check if user is copywriter of a task
CREATE OR REPLACE FUNCTION public.is_copywriter_of_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND copywriter_id = auth.uid()
  )
$$;

-- 2. Create a security definer function to check if editor has assigned videos in task
CREATE OR REPLACE FUNCTION public.has_assigned_video_in_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM videos WHERE task_id = p_task_id AND assigned_to = auth.uid()
  )
$$;

-- 3. Drop and recreate the problematic policies on videos
DROP POLICY IF EXISTS "Copywriters can view videos of assigned tasks" ON public.videos;
CREATE POLICY "Copywriters can view videos of assigned tasks"
ON public.videos
FOR SELECT
USING (is_copywriter_of_task(task_id));

DROP POLICY IF EXISTS "Clients can view their project videos" ON public.videos;
CREATE POLICY "Clients can view their project videos"
ON public.videos
FOR SELECT
USING (is_client_of_task(task_id));

-- 4. Drop and recreate the problematic policy on tasks
DROP POLICY IF EXISTS "Editors can view tasks with assigned videos" ON public.tasks;
CREATE POLICY "Editors can view tasks with assigned videos"
ON public.tasks
FOR SELECT
USING (has_assigned_video_in_task(id));

-- 5. Fix copywriter tasks policy to use security definer
DROP POLICY IF EXISTS "Copywriters can view their assigned tasks" ON public.tasks;
CREATE POLICY "Copywriters can view their assigned tasks"
ON public.tasks
FOR SELECT
USING (copywriter_id = auth.uid());