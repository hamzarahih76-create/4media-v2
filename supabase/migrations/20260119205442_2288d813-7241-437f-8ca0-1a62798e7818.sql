-- Fix notification triggers to handle NULL project_name and client_name gracefully

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
            v_context_prefix || 'La vidéo "' || v_video_title || '" a été approuvée.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
    -- Video late
    IF NEW.status = 'late' AND OLD.status != 'late' THEN
      -- Notify editor
      IF v_editor_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_editor_id,
          'video_late',
          '⚠️ Vidéo en retard',
          v_context_prefix || 'La vidéo "' || v_video_title || '" a dépassé sa deadline.',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
        );
      END IF;
      -- Notify admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'video_late',
            '⚠️ Vidéo en retard',
            v_context_prefix || 'La vidéo "' || v_video_title || '" a dépassé sa deadline.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'editor_id', v_editor_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_video_delivery function
CREATE OR REPLACE FUNCTION public.notify_video_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_video_title TEXT;
  v_editor_name TEXT;
  v_task_id UUID;
  v_project_name TEXT;
  v_client_name TEXT;
  v_context_prefix TEXT;
BEGIN
  -- Get video info
  SELECT v.title, v.task_id INTO v_video_title, v_task_id
  FROM public.videos v WHERE v.id = NEW.video_id;
  
  -- Get project and client name from task with fallbacks
  SELECT COALESCE(project_name, 'Projet'), COALESCE(client_name, 'Client') 
  INTO v_project_name, v_client_name
  FROM public.tasks WHERE id = v_task_id;
  
  -- Build context prefix
  v_context_prefix := COALESCE(v_project_name, 'Projet') || ' • ' || COALESCE(v_client_name, 'Client') || ' - ';
  
  -- Get editor name
  SELECT full_name INTO v_editor_name
  FROM public.team_members WHERE user_id = NEW.editor_id;
  
  -- Get all admin/PM user IDs
  SELECT ARRAY_AGG(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role IN ('admin', 'project_manager');

  -- Notify admins of new delivery
  IF v_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
      PERFORM public.create_notification(
        v_admin_id,
        'new_delivery',
        'Nouvelle livraison',
        v_context_prefix || COALESCE(v_editor_name, 'Un éditeur') || ' a livré la version ' || NEW.version_number || ' de "' || COALESCE(v_video_title, 'une vidéo') || '".',
        '/pm',
        jsonb_build_object('video_id', NEW.video_id, 'delivery_id', NEW.id, 'version', NEW.version_number, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Update notify_video_assignment function
CREATE OR REPLACE FUNCTION public.notify_video_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_video_title TEXT;
  v_project_name TEXT;
  v_client_name TEXT;
  v_context_prefix TEXT;
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    v_video_title := NEW.title;
    
    -- Get project and client name from task with fallbacks
    SELECT COALESCE(project_name, 'Projet'), COALESCE(client_name, 'Client') 
    INTO v_project_name, v_client_name
    FROM public.tasks WHERE id = NEW.task_id;
    
    -- Build context prefix
    v_context_prefix := v_project_name || ' • ' || v_client_name || ' - ';
    
    PERFORM public.create_notification(
      NEW.assigned_to,
      'video_assigned',
      'Nouvelle vidéo assignée',
      v_context_prefix || 'La vidéo "' || v_video_title || '" vous a été assignée.',
      '/editor',
      jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'project_name', v_project_name, 'client_name', v_client_name, 'video_title', v_video_title, 'requires_email', true)
    );
  END IF;

  RETURN NEW;
END;
$$;