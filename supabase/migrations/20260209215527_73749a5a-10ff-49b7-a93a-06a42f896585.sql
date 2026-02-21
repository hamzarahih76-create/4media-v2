
-- Allow anonymous users to view design feedback for tasks with active project review links
CREATE POLICY "Anyone can view design feedback via project review link"
ON public.design_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM design_project_review_links dprl
    WHERE dprl.design_task_id = design_feedback.design_task_id
    AND dprl.is_active = true
    AND dprl.expires_at > now()
  )
);
