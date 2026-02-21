-- Drop the recursive policy
DROP POLICY "Clients can view their project videos" ON public.videos;

-- Recreate without referencing tasks table (use a direct subquery on task_id)
CREATE POLICY "Clients can view their project videos"
ON public.videos FOR SELECT
USING (
  task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.client_user_id = auth.uid()
  )
);
