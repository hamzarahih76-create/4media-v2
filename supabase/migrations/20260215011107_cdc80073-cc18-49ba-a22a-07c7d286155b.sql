CREATE POLICY "Admins can delete contracts"
ON public.client_contracts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'project_manager')
  )
);