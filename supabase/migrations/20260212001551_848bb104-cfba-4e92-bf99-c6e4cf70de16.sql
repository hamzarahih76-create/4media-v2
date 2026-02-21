
-- Allow copywriters to see videos of clients assigned to them via client_profiles
CREATE POLICY "Copywriters can view videos of their clients"
ON public.videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM tasks t
    JOIN client_profiles cp ON cp.user_id = t.client_user_id
    WHERE t.id = videos.task_id 
    AND cp.copywriter_id = auth.uid()
  )
);
