-- Create a function to send editor questions to all admins
-- This bypasses RLS to allow editors to notify admins
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
BEGIN
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
        'editor_name', COALESCE(p_editor_name, 'Éditeur'),
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.send_editor_question_to_admins(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;