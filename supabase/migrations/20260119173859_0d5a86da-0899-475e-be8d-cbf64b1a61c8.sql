-- Allow editors to view tasks that have videos assigned to them
CREATE POLICY "Editors can view tasks with assigned videos"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.task_id = tasks.id 
    AND videos.assigned_to = auth.uid()
  )
);