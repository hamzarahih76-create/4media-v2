
-- Drop the old INSERT policy that checks tasks table
DROP POLICY IF EXISTS "Copywriters can create content for assigned clients" ON public.client_content_items;

-- Create new INSERT policy that checks client_profiles.copywriter_id
CREATE POLICY "Copywriters can create content for assigned clients"
ON public.client_content_items FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'copywriter'::app_role) 
  AND (
    client_user_id IN (
      SELECT cp.user_id FROM client_profiles cp WHERE cp.copywriter_id = auth.uid()
    )
    OR client_user_id IN (
      SELECT t.client_user_id FROM tasks t WHERE t.copywriter_id = auth.uid() AND t.client_user_id IS NOT NULL
    )
  )
);

-- Also update the SELECT policy for consistency
DROP POLICY IF EXISTS "Copywriters can view content of assigned clients" ON public.client_content_items;

CREATE POLICY "Copywriters can view content of assigned clients"
ON public.client_content_items FOR SELECT
USING (
  has_role(auth.uid(), 'copywriter'::app_role) 
  AND (
    client_user_id IN (
      SELECT cp.user_id FROM client_profiles cp WHERE cp.copywriter_id = auth.uid()
    )
    OR client_user_id IN (
      SELECT t.client_user_id FROM tasks t WHERE t.copywriter_id = auth.uid() AND t.client_user_id IS NOT NULL
    )
  )
);
