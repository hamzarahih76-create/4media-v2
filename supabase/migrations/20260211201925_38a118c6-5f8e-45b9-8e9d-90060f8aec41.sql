-- Add copywriter_id to client_profiles
ALTER TABLE public.client_profiles ADD COLUMN copywriter_id uuid NULL;

-- Allow copywriters to view clients assigned to them
CREATE POLICY "Copywriters can view clients assigned to them"
ON public.client_profiles
FOR SELECT
USING (copywriter_id = auth.uid());