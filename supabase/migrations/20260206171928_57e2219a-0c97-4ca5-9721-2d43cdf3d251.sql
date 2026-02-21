
-- Create security definer function to check active review link for design deliveries
CREATE OR REPLACE FUNCTION public.design_delivery_has_active_review_link(p_design_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM design_review_links drl
    WHERE drl.design_task_id = p_design_task_id
      AND drl.is_active = true
      AND drl.expires_at > now()
  )
$$;

-- Drop the old recursive policy
DROP POLICY IF EXISTS "Anyone can view design deliveries via active review link" ON public.design_deliveries;

-- Recreate using the security definer function
CREATE POLICY "Anyone can view design deliveries via active review link"
ON public.design_deliveries
FOR SELECT
USING (design_delivery_has_active_review_link(design_task_id));
