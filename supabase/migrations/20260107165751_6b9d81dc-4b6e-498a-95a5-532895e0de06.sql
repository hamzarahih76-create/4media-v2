-- Allow editors to update their own team_member record for profile completion
CREATE POLICY "Editors can update own profile fields"
ON public.team_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());