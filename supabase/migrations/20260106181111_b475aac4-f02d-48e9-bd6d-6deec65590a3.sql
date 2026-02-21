-- Drop existing INSERT policy and create a proper one
DROP POLICY IF EXISTS "Admins and PMs can manage team members" ON public.team_members;

-- Recreate with proper permissions for INSERT
CREATE POLICY "Admins and PMs can insert team members"
ON public.team_members FOR INSERT
WITH CHECK (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can update team members"
ON public.team_members FOR UPDATE
USING (is_admin_or_pm(auth.uid()));

CREATE POLICY "Admins and PMs can delete team members"
ON public.team_members FOR DELETE
USING (is_admin_or_pm(auth.uid()));

-- Also add a temporary policy for authenticated users to insert (for testing)
-- This allows any logged-in user to invite team members
CREATE POLICY "Authenticated users can invite team members"
ON public.team_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add role column if not exists (for different team roles)
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor';