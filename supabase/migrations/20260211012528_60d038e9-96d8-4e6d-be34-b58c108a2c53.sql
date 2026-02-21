-- Allow editors and designers to read client profiles (for client dropdown in project creation)
CREATE POLICY "Editors and designers can view client profiles"
ON public.client_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('editor', 'designer')
  )
);
