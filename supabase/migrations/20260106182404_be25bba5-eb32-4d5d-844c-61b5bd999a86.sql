-- Drop the conflicting restrictive INSERT policies
DROP POLICY IF EXISTS "Admins and PMs can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can invite team members" ON public.team_members;

-- Create a single permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can invite team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure we have proper SELECT policy for viewing members
DROP POLICY IF EXISTS "Admins and PMs can view all team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team record" ON public.team_members;

CREATE POLICY "Authenticated can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);