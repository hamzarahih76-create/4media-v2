-- Allow clients to view videos linked to their projects
CREATE POLICY "Clients can view their project videos"
ON public.videos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = videos.task_id
    AND t.client_user_id = auth.uid()
  )
);
