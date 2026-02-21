
-- Drop the restrictive SELECT policy and replace with a simpler one for all authenticated users
DROP POLICY IF EXISTS "Team members can view client rushes" ON public.client_rushes;

CREATE POLICY "Authenticated users can view client rushes"
ON public.client_rushes
FOR SELECT
USING (auth.uid() IS NOT NULL);
