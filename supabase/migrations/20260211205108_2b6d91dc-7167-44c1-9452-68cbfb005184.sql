-- Allow clients to update status of their own content items (validate/request modification)
CREATE POLICY "Clients can update their own content items"
ON public.client_content_items FOR UPDATE
USING (auth.uid() = client_user_id)
WITH CHECK (auth.uid() = client_user_id);