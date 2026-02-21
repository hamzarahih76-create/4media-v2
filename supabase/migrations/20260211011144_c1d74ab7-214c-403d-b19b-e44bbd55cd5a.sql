-- Create a security definer function to check client ownership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_client_of_task(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND client_user_id = auth.uid()
  );
$$;

-- Drop and recreate the policy using the function
DROP POLICY "Clients can view their project videos" ON public.videos;

CREATE POLICY "Clients can view their project videos"
ON public.videos FOR SELECT
USING (public.is_client_of_task(task_id));
