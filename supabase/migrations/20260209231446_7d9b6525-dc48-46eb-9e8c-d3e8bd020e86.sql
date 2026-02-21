-- Allow designers to create project review links for their own tasks
CREATE POLICY "Designers can create project review links for their tasks"
ON public.design_project_review_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM design_tasks dt
    WHERE dt.id = design_project_review_links.design_task_id
    AND dt.assigned_to = auth.uid()
  )
);

-- Allow designers to read their own project review links
CREATE POLICY "Designers can read their project review links"
ON public.design_project_review_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM design_tasks dt
    WHERE dt.id = design_project_review_links.design_task_id
    AND dt.assigned_to = auth.uid()
  )
);