
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Copywriters can view videos of their clients" ON public.videos;

-- Create a security definer function to check copywriter-client relationship
-- This bypasses RLS on client_profiles and tasks, breaking the recursion
CREATE OR REPLACE FUNCTION public.is_copywriter_of_client(p_client_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_profiles
    WHERE user_id = p_client_user_id
    AND copywriter_id = auth.uid()
  )
$$;

-- Re-create the policy using the security definer function
CREATE POLICY "Copywriters can view videos of their clients"
ON public.videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = videos.task_id
    AND t.client_user_id IS NOT NULL
    AND is_copywriter_of_client(t.client_user_id)
  )
);

-- Also fix the copywriter policy on client_profiles to avoid recursion
-- Drop the one that queries tasks (causes recursion)
DROP POLICY IF EXISTS "Copywriters can view assigned client profiles" ON public.client_profiles;
