-- Update notify_video_status_change to also notify admins for validation and revision events
CREATE OR REPLACE FUNCTION public.notify_video_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_editor_id UUID;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_video_title TEXT;
  v_task_title TEXT;
  v_project_name TEXT;
  v_client_name TEXT;
  v_context_prefix TEXT;
BEGIN
  -- Get video and task info
  v_video_title := NEW.title;
  v_editor_id := NEW.assigned_to;
  
  SELECT title, COALESCE(project_name, 'Projet'), COALESCE(client_name, 'Client') 
  INTO v_task_title, v_project_name, v_client_name 
  FROM public.tasks WHERE id = NEW.task_id;
  
  -- Build context prefix
  v_context_prefix := v_project_name || ' • ' || v_client_name || ' - ';
  
  -- Get all admin/PM user IDs
  SELECT ARRAY_AGG(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role IN ('admin', 'project_manager');

  -- Status change notifications
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Editor submits for review (active -> review_admin)
    IF NEW.status = 'review_admin' AND OLD.status IN ('active', 'late', 'revision_requested') THEN
      -- Notify all admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'video_submitted',
            'Vidéo soumise pour validation',
            v_context_prefix || 'La vidéo "' || v_video_title || '" est prête pour review.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
    -- Admin sends to client (review_admin -> review_client)
    IF NEW.status = 'review_client' AND OLD.status = 'review_admin' THEN
      -- Notify editor that video was approved and sent to client
      IF v_editor_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_editor_id,
          'video_sent_to_client',
          'Vidéo envoyée au client',
          v_context_prefix || 'Votre vidéo "' || v_video_title || '" a été validée et envoyée au client.',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
        );
      END IF;
      -- Also notify admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'video_sent_to_client',
            'Vidéo envoyée au client',
            v_context_prefix || 'La vidéo "' || v_video_title || '" a été envoyée au client pour review.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
    -- Revision requested (review_admin/review_client -> revision_requested)
    IF NEW.status = 'revision_requested' THEN
      -- Notify editor
      IF v_editor_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_editor_id,
          'revision_requested',
          'Révision demandée',
          v_context_prefix || 'Des modifications ont été demandées sur la vidéo "' || v_video_title || '".',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
        );
      END IF;
      -- Also notify admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'revision_requested',
            'Révision demandée',
            v_context_prefix || 'Des modifications ont été demandées sur la vidéo "' || v_video_title || '".',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
    -- Video completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      -- Notify editor
      IF v_editor_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_editor_id,
          'video_completed',
          'Vidéo validée !',
          v_context_prefix || 'La vidéo "' || v_video_title || '" a été approuvée par le client.',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
        );
      END IF;
      -- Notify admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'video_completed',
            'Vidéo validée par le client',
            v_context_prefix || 'La vidéo "' || v_video_title || '" a été approuvée par le client.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$;