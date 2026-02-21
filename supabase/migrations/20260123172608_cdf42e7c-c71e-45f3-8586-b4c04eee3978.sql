-- Create or replace the function to check and update late videos
-- This function also creates notifications for newly late videos
CREATE OR REPLACE FUNCTION public.check_and_update_late_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    video_record RECORD;
    editor_email TEXT;
    editor_name TEXT;
    notification_id UUID;
    project_name TEXT;
    client_name TEXT;
BEGIN
    -- Find all videos that should be marked as late
    -- Conditions: status is 'active', started_at + allowed_duration has passed
    FOR video_record IN 
        SELECT v.id, v.title, v.assigned_to, v.status, v.started_at, 
               v.allowed_duration_minutes, v.task_id,
               t.title as task_title, t.client_name as task_client_name
        FROM videos v
        LEFT JOIN tasks t ON t.id = v.task_id
        WHERE v.status = 'active'
          AND v.started_at IS NOT NULL
          AND v.started_at + (COALESCE(v.allowed_duration_minutes, 300) * INTERVAL '1 minute') < NOW()
    LOOP
        -- Update video status to late
        UPDATE videos 
        SET status = 'late', updated_at = NOW()
        WHERE id = video_record.id;
        
        -- Get editor info
        SELECT tm.email, tm.full_name INTO editor_email, editor_name
        FROM team_members tm
        WHERE tm.user_id = video_record.assigned_to;
        
        project_name := video_record.task_title;
        client_name := video_record.task_client_name;
        
        -- Create notification for the editor
        IF video_record.assigned_to IS NOT NULL THEN
            INSERT INTO notifications (
                user_id, type, title, message, link, metadata
            ) VALUES (
                video_record.assigned_to,
                'video_late',
                '⚠️ Vidéo en retard',
                'La vidéo "' || video_record.title || '" est maintenant en retard. Veuillez la livrer dès que possible.',
                '/editor',
                jsonb_build_object(
                    'video_id', video_record.id,
                    'video_title', video_record.title,
                    'project_name', project_name,
                    'client_name', client_name,
                    'requires_email', true
                )
            )
            RETURNING id INTO notification_id;
            
            -- Trigger email notification via edge function
            -- This will be handled by the realtime subscription or cron job
            RAISE NOTICE 'Created late notification % for video %', notification_id, video_record.id;
        END IF;
        
        -- Also notify admins
        -- Get admin user_ids from user_roles
        FOR video_record IN 
            SELECT ur.user_id 
            FROM user_roles ur 
            WHERE ur.role IN ('admin', 'project_manager')
        LOOP
            INSERT INTO notifications (
                user_id, type, title, message, link, metadata
            ) VALUES (
                video_record.user_id,
                'video_late',
                '⚠️ Vidéo en retard',
                'La vidéo "' || video_record.title || '" assignée à ' || COALESCE(editor_name, 'un éditeur') || ' est en retard.',
                '/pm',
                jsonb_build_object(
                    'video_id', video_record.id,
                    'video_title', video_record.title,
                    'project_name', project_name,
                    'client_name', client_name,
                    'editor_name', editor_name,
                    'requires_email', true
                )
            );
        END LOOP;
    END LOOP;
END;
$$;

-- Create a trigger that fires when video status changes to late
CREATE OR REPLACE FUNCTION public.on_video_becomes_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    editor_email TEXT;
    editor_name TEXT;
    notification_id UUID;
    project_name TEXT;
    client_name TEXT;
    admin_record RECORD;
BEGIN
    -- Only trigger when status changes TO 'late'
    IF NEW.status = 'late' AND (OLD.status IS NULL OR OLD.status != 'late') THEN
        -- Get task info
        SELECT t.title, t.client_name INTO project_name, client_name
        FROM tasks t WHERE t.id = NEW.task_id;
        
        -- Get editor info
        SELECT tm.email, tm.full_name INTO editor_email, editor_name
        FROM team_members tm WHERE tm.user_id = NEW.assigned_to;
        
        -- Create notification for the editor
        IF NEW.assigned_to IS NOT NULL THEN
            INSERT INTO notifications (
                user_id, type, title, message, link, metadata
            ) VALUES (
                NEW.assigned_to,
                'video_late',
                '⚠️ Vidéo en retard',
                'La vidéo "' || NEW.title || '" est maintenant en retard. Veuillez la livrer dès que possible.',
                '/editor',
                jsonb_build_object(
                    'video_id', NEW.id,
                    'video_title', NEW.title,
                    'project_name', project_name,
                    'client_name', client_name,
                    'requires_email', true
                )
            )
            RETURNING id INTO notification_id;
        END IF;
        
        -- Notify all admins and PMs
        FOR admin_record IN 
            SELECT ur.user_id 
            FROM user_roles ur 
            WHERE ur.role IN ('admin', 'project_manager')
        LOOP
            INSERT INTO notifications (
                user_id, type, title, message, link, metadata
            ) VALUES (
                admin_record.user_id,
                'video_late',
                '⚠️ Vidéo en retard',
                'La vidéo "' || NEW.title || '" assignée à ' || COALESCE(editor_name, 'un éditeur') || ' est en retard.',
                '/pm',
                jsonb_build_object(
                    'video_id', NEW.id,
                    'video_title', NEW.title,
                    'project_name', project_name,
                    'client_name', client_name,
                    'editor_name', editor_name,
                    'requires_email', true
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_video_becomes_late ON videos;
CREATE TRIGGER trigger_video_becomes_late
    AFTER UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION on_video_becomes_late();