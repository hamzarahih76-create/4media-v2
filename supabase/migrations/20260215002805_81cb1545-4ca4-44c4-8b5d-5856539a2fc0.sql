
-- Allow admins/PMs to create contracts for any client
CREATE POLICY "Admins can create contracts for clients"
ON public.client_contracts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'project_manager')
  )
);
