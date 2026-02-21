-- Create a function for admin to reply to editor questions
CREATE OR REPLACE FUNCTION public.send_admin_reply_to_editor(
  p_editor_user_id UUID,
  p_reply_message TEXT,
  p_original_question TEXT DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_video_title TEXT DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.send_admin_reply_to_editor(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;