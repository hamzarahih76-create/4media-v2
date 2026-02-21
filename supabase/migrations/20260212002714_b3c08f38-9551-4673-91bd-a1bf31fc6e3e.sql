
-- Fix video_conversations policy that directly queries videos and tasks
-- This causes cross-table RLS evaluation chains

-- Create SECURITY DEFINER function for editor video conversation access
CREATE OR REPLACE FUNCTION public.can_editor_view_conversation(p_video_id uuid, p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (p_video_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM videos WHERE id = p_video_id AND assigned_to = auth.uid()
    ))
    OR 
    (p_task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks WHERE id = p_task_id AND (assigned_to = auth.uid() OR created_by = auth.uid())
    ))
$$;

-- Drop and recreate the policy
DROP POLICY IF EXISTS "Editors can view conversations on their videos" ON public.video_conversations;

CREATE POLICY "Editors can view conversations on their videos"
ON public.video_conversations
FOR SELECT
USING (can_editor_view_conversation(video_id, task_id));
