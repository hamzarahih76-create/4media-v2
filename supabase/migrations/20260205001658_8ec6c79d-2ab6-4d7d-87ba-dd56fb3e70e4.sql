-- Allow designers to create review links for their own deliveries
CREATE POLICY "Designers can create review links for their deliveries"
ON design_review_links FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM design_deliveries dd
    WHERE dd.id = design_review_links.delivery_id
    AND dd.designer_id = auth.uid()
  )
);

-- Allow anyone (including anonymous clients) to view design tasks via active review link
CREATE POLICY "Anyone can view design tasks via active review link"
ON design_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM design_review_links drl
    WHERE drl.design_task_id = design_tasks.id
    AND drl.is_active = true
    AND drl.expires_at > now()
  )
);

-- Allow anyone to view design deliveries via active review link
CREATE POLICY "Anyone can view design deliveries via active review link"
ON design_deliveries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM design_review_links drl
    WHERE drl.design_task_id = design_deliveries.design_task_id
    AND drl.is_active = true
    AND drl.expires_at > now()
  )
);

-- Allow anyone to update design task status via review link (for client feedback)
CREATE POLICY "Anyone can update design task status via review link"
ON design_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM design_review_links drl
    WHERE drl.design_task_id = design_tasks.id
    AND drl.is_active = true
    AND drl.expires_at > now()
  )
);