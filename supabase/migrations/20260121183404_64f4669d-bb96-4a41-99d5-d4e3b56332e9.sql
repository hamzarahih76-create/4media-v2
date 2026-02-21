-- Create table for video conversations between editors and admins
CREATE TABLE public.video_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('editor', 'admin')),
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_conversations ENABLE ROW LEVEL SECURITY;

-- Policies: Editors can see messages on their assigned videos
CREATE POLICY "Editors can view conversations on their videos"
ON public.video_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = video_conversations.video_id
    AND v.assigned_to = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = video_conversations.task_id
    AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
  )
);

-- Admins and PMs can view all conversations
CREATE POLICY "Admins and PMs can view all conversations"
ON public.video_conversations
FOR SELECT
USING (is_admin_or_pm(auth.uid()));

-- Admins and PMs can manage conversations
CREATE POLICY "Admins and PMs can manage conversations"
ON public.video_conversations
FOR ALL
USING (is_admin_or_pm(auth.uid()));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_conversations;

-- Update the send_editor_question_to_admins function to also store the message
CREATE OR REPLACE FUNCTION public.send_editor_question_to_admins(
  p_question TEXT,
  p_video_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_video_title TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_editor_name TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_notification_id UUID;
  v_count INTEGER := 0;
  v_sender_id UUID;
  v_sender_name TEXT;
BEGIN
  v_sender_id := auth.uid();
  
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM public.team_members
  WHERE user_id = v_sender_id;
  
  -- Store the message in video_conversations
  INSERT INTO public.video_conversations (video_id, task_id, sender_id, sender_type, sender_name, message)
  VALUES (p_video_id, p_task_id, v_sender_id, 'editor', COALESCE(v_sender_name, p_editor_name, 'Éditeur'), p_question);

  -- Get all admin user IDs
  SELECT ARRAY_AGG(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin';

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Aucun administrateur trouvé';
  END IF;

  -- Create notification for each admin
  FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_admin_id,
      'editor_question',
      '❓ Question d''un éditeur',
      p_question,
      '/pm',
      jsonb_build_object(
        'project_name', COALESCE(p_project_name, 'Projet inconnu'),
        'client_name', p_client_name,
        'video_title', p_video_title,
        'video_id', p_video_id,
        'task_id', p_task_id,
        'editor_name', COALESCE(v_sender_name, p_editor_name, 'Éditeur'),
        'requires_email', true
      )
    )
    RETURNING id INTO v_notification_id;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'notifications_sent', v_count
  );
END;
$$;

-- Update the send_admin_reply_to_editor function to also store the message
CREATE OR REPLACE FUNCTION public.send_admin_reply_to_editor(
  p_editor_user_id UUID,
  p_reply_message TEXT,
  p_original_question TEXT DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_video_title TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_video_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_admin_name TEXT;
  v_notification_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Verify caller is admin or PM
  IF NOT public.is_admin_or_pm(v_caller_id) THEN
    RAISE EXCEPTION 'Seuls les admins peuvent répondre';
  END IF;
  
  -- Get admin name
  SELECT full_name INTO v_admin_name
  FROM public.team_members
  WHERE user_id = v_caller_id;
  
  -- Store the message in video_conversations
  INSERT INTO public.video_conversations (video_id, task_id, sender_id, sender_type, sender_name, message)
  VALUES (p_video_id, p_task_id, v_caller_id, 'admin', COALESCE(v_admin_name, 'Admin'), p_reply_message);
  
  -- Create notification for the editor
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    p_editor_user_id,
    'admin_reply',
    '💬 Réponse de l''admin',
    p_reply_message,
    '/editor',
    jsonb_build_object(
      'project_name', p_project_name,
      'client_name', p_client_name,
      'video_title', p_video_title,
      'video_id', p_video_id,
      'task_id', p_task_id,
      'original_question', p_original_question,
      'admin_name', COALESCE(v_admin_name, 'Admin'),
      'requires_email', true
    )
  )
  RETURNING id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.send_admin_reply_to_editor(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;