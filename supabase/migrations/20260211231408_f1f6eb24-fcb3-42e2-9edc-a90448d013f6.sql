
-- Update design_task_has_active_review_link to also check design_project_review_links
CREATE OR REPLACE FUNCTION public.design_task_has_active_review_link(task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM design_review_links drl
    WHERE drl.design_task_id = task_id
      AND drl.is_active = true
      AND drl.expires_at > now()
  )
  OR EXISTS (
    SELECT 1
    FROM design_project_review_links dprl
    WHERE dprl.design_task_id = task_id
      AND dprl.is_active = true
      AND dprl.expires_at > now()
  )
$$;

-- Update design_delivery_has_active_review_link to also check design_project_review_links
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
  OR EXISTS (
    SELECT 1
    FROM design_project_review_links dprl
    WHERE dprl.design_task_id = p_design_task_id
      AND dprl.is_active = true
      AND dprl.expires_at > now()
  )
$$;
