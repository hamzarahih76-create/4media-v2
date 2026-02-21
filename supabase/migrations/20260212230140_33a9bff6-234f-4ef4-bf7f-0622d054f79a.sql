-- Allow clients to view design deliveries for their planning items
CREATE POLICY "Clients can view design deliveries for their content"
ON public.design_deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_content_items cci
    WHERE cci.related_design_task_id = design_deliveries.design_task_id
      AND cci.client_user_id = auth.uid()
      AND cci.workflow_step = 'planning'
  )
);

-- Allow clients to view video deliveries for their planning items
CREATE POLICY "Clients can view video deliveries for their content"
ON public.video_deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_content_items cci
    WHERE cci.related_video_id = video_deliveries.video_id
      AND cci.client_user_id = auth.uid()
      AND cci.workflow_step = 'planning'
  )
);