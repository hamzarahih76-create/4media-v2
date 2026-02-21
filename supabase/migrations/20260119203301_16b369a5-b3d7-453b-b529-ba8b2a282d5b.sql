-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function for video status changes
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
BEGIN
  -- Get video and task info
  v_video_title := NEW.title;
  v_editor_id := NEW.assigned_to;
  
  SELECT title INTO v_task_title FROM public.tasks WHERE id = NEW.task_id;
  
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
            'La vidéo "' || v_video_title || '" est prête pour review.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
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
          'Votre vidéo "' || v_video_title || '" a été validée et envoyée au client.',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
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
          'Des modifications ont été demandées sur la vidéo "' || v_video_title || '".',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
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
          'La vidéo "' || v_video_title || '" a été approuvée par le client.',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
        );
      END IF;
      -- Notify admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'video_completed',
            'Vidéo validée par le client',
            'La vidéo "' || v_video_title || '" a été approuvée.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
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
          'La vidéo "' || v_video_title || '" a dépassé sa deadline.',
          '/editor',
          jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
        );
      END IF;
      -- Notify admins
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
          PERFORM public.create_notification(
            v_admin_id,
            'video_late',
            '⚠️ Vidéo en retard',
            'La vidéo "' || v_video_title || '" est en retard.',
            '/pm',
            jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'editor_id', v_editor_id, 'requires_email', true)
          );
        END LOOP;
      END IF;
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for video status changes
CREATE TRIGGER trigger_notify_video_status_change
  AFTER UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_video_status_change();

-- Trigger function for new video deliveries
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
BEGIN
  -- Get video title
  SELECT title INTO v_video_title FROM public.videos WHERE id = NEW.video_id;
  
  -- Get editor name
  SELECT full_name INTO v_editor_name FROM public.team_members WHERE user_id = NEW.editor_id;
  
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
        COALESCE(v_editor_name, 'Un éditeur') || ' a livré la version ' || NEW.version_number || ' de "' || COALESCE(v_video_title, 'une vidéo') || '".',
        '/pm',
        jsonb_build_object('video_id', NEW.video_id, 'delivery_id', NEW.id, 'version', NEW.version_number, 'requires_email', true)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for video deliveries
CREATE TRIGGER trigger_notify_video_delivery
  AFTER INSERT ON public.video_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_video_delivery();

-- Trigger for video assignment
CREATE OR REPLACE FUNCTION public.notify_video_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_video_title TEXT;
  v_task_title TEXT;
BEGIN
  -- Only trigger when assigned_to changes from NULL or to a different user
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    v_video_title := NEW.title;
    SELECT title INTO v_task_title FROM public.tasks WHERE id = NEW.task_id;
    
    PERFORM public.create_notification(
      NEW.assigned_to,
      'video_assigned',
      'Nouvelle vidéo assignée',
      'Vous avez été assigné à la vidéo "' || v_video_title || '".',
      '/editor',
      jsonb_build_object('video_id', NEW.id, 'task_id', NEW.task_id, 'requires_email', true)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for video assignment
CREATE TRIGGER trigger_notify_video_assignment
  AFTER UPDATE ON public.videos
  FOR EACH ROW
  WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION public.notify_video_assignment();