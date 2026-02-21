
-- Drop the problematic policy on videos that causes recursion with tasks
DROP POLICY IF EXISTS "Copywriters can view videos of their clients" ON public.videos;

-- Create a security definer function to get client_user_id from a task
-- This bypasses RLS on tasks, breaking the recursion cycle
CREATE OR REPLACE FUNCTION public.get_task_client_user_id(p_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_user_id FROM tasks WHERE id = p_task_id
$$;

-- Re-create the policy using security definer functions only (no direct table access)
CREATE POLICY "Copywriters can view videos of their clients"
ON public.videos
FOR SELECT
USING (
  is_copywriter_of_client(get_task_client_user_id(task_id))
);
