
-- 1. Fix community_messages: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can read community messages" ON public.community_messages;
CREATE POLICY "Authenticated users can read community messages"
ON public.community_messages FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. Fix client_profiles: restrict editor/designer access to only clients of their assigned tasks
DROP POLICY IF EXISTS "Editors and designers can view client profiles" ON public.client_profiles;

CREATE POLICY "Editors can view profiles of assigned clients"
ON public.client_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('editor', 'designer')
  )
  AND (
    user_id IN (
      SELECT t.client_user_id FROM tasks t WHERE t.assigned_to = auth.uid() AND t.client_user_id IS NOT NULL
    )
    OR user_id IN (
      SELECT t.client_user_id FROM tasks t 
      JOIN videos v ON v.task_id = t.id 
      WHERE v.assigned_to = auth.uid() AND t.client_user_id IS NOT NULL
    )
    OR user_id IN (
      SELECT dt.client_user_id FROM design_tasks dt WHERE dt.assigned_to = auth.uid() AND dt.client_user_id IS NOT NULL
    )
  )
);
