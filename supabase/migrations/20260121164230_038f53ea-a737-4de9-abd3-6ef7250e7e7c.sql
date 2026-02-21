-- Create trigger to notify admins when editor profiles change status
CREATE OR REPLACE FUNCTION public.notify_editor_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_editor_name TEXT;
BEGIN
  v_editor_name := COALESCE(NEW.full_name, NEW.email);
  
  -- Get all admin user IDs
  SELECT ARRAY_AGG(user_id) INTO v_admin_ids
  FROM public.user_roles
  WHERE role = 'admin';

  -- Editor submits profile for validation (incomplete -> submitted)
  IF OLD.validation_status = 'incomplete' AND NEW.validation_status = 'submitted' THEN
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        PERFORM public.create_notification(
          v_admin_id,
          'editor_profile_submitted',
          'Nouveau profil à valider',
          'L''éditeur "' || v_editor_name || '" a soumis son profil pour validation.',
          '/pm',
          jsonb_build_object('editor_id', NEW.id, 'editor_name', v_editor_name, 'editor_email', NEW.email, 'requires_email', true)
        );
      END LOOP;
    END IF;
  END IF;

  -- Editor profile validated/accepted (pending + submitted -> active + validated)
  IF OLD.validation_status != 'validated' AND NEW.validation_status = 'validated' THEN
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        -- Only notify if admin didn't do it themselves
        IF v_admin_id != NEW.admin_validated_by THEN
          PERFORM public.create_notification(
            v_admin_id,
            'editor_profile_validated',
            'Éditeur activé',
            'L''éditeur "' || v_editor_name || '" a été accepté et activé.',
            '/pm',
            jsonb_build_object('editor_id', NEW.id, 'editor_name', v_editor_name, 'editor_email', NEW.email, 'requires_email', false)
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Also notify the editor
    IF NEW.user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'profile_validated',
        'Profil validé !',
        'Votre profil a été validé. Vous pouvez maintenant accéder à votre dashboard.',
        '/editor',
        jsonb_build_object('requires_email', false)
      );
    END IF;
  END IF;

  -- Editor suspended
  IF OLD.status != 'inactive' AND NEW.status = 'inactive' THEN
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        PERFORM public.create_notification(
          v_admin_id,
          'editor_suspended',
          'Éditeur suspendu',
          'L''éditeur "' || v_editor_name || '" a été suspendu.',
          '/pm',
          jsonb_build_object('editor_id', NEW.id, 'editor_name', v_editor_name, 'requires_email', false)
        );
      END LOOP;
    END IF;
  END IF;

  -- Editor reactivated
  IF OLD.status = 'inactive' AND NEW.status = 'active' THEN
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        PERFORM public.create_notification(
          v_admin_id,
          'editor_reactivated',
          'Éditeur réactivé',
          'L''éditeur "' || v_editor_name || '" a été réactivé.',
          '/pm',
          jsonb_build_object('editor_id', NEW.id, 'editor_name', v_editor_name, 'requires_email', false)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_editor_profile_change ON public.team_members;

-- Create trigger
CREATE TRIGGER on_editor_profile_change
  AFTER UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_editor_profile_change();