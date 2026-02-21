CREATE OR REPLACE FUNCTION public.send_editor_question_to_admins(
  p_question text,
  p_video_id uuid DEFAULT NULL::uuid,
  p_task_id uuid DEFAULT NULL::uuid,
  p_project_name text DEFAULT NULL::text,
  p_video_title text DEFAULT NULL::text,
  p_client_name text DEFAULT NULL::text,
  p_editor_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_notification_id UUID;
  v_count INTEGER := 0;
  v_sender_id UUID;
  v_sender_name TEXT;
  v_actual_task_id UUID;
BEGIN
  v_sender_id := auth.uid();
  
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM public.team_members
  WHERE user_id = v_sender_id;
  
  -- Resolve actual task_id: if video_id is provided, get task_id from video
  IF p_video_id IS NOT NULL THEN
    SELECT task_id INTO v_actual_task_id
    FROM public.videos
    WHERE id = p_video_id;
  ELSE
    v_actual_task_id := p_task_id;
  END IF;
  
  -- Only insert into video_conversations if we have a valid video_id or task_id
  IF p_video_id IS NOT NULL OR v_actual_task_id IS NOT NULL THEN
    INSERT INTO public.video_conversations (video_id, task_id, sender_id, sender_type, sender_name, message)
    VALUES (p_video_id, v_actual_task_id, v_sender_id, 'editor', COALESCE(v_sender_name, p_editor_name, 'Éditeur'), p_question);
  END IF;

  -- Get all admin user IDs EXCEPT the sender (to avoid self-notification)
  SELECT ARRAY_AGG(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin' AND user_id != v_sender_id;

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) IS NULL THEN
    -- No other admins to notify, just return success
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Message enregistré (aucun autre admin à notifier)',
      'notifications_sent', 0
    );
  END IF;

  -- Create notification for each admin (except sender)
  FOREACH v_admin_id IN ARRAY v_admin_ids
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_admin_id, 
      'editor_question', 
      '❓ Question d''un éditeur',
      p_question,
      '/pm',
      jsonb_build_object(
        'video_id', p_video_id,
        'task_id', v_actual_task_id,
        'project_name', p_project_name,
        'video_title', p_video_title,
        'client_name', p_client_name,
        'editor_name', COALESCE(v_sender_name, p_editor_name),
        'requires_email', true
      )
    )
    RETURNING id INTO v_notification_id;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Notifications envoyées aux administrateurs',
    'notifications_sent', v_count
  );
END;
$function$;