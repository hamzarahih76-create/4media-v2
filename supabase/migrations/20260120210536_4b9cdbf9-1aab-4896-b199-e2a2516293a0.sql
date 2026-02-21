-- First, drop the existing check constraint and add a new one that includes 'incomplete'
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_validation_status_check;

ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_validation_status_check 
CHECK (validation_status IN ('incomplete', 'pending', 'submitted', 'validated', 'rejected'));

-- Now update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if the role is 'editor'
  IF NEW.raw_user_meta_data->>'role' = 'editor' THEN
    -- Create user_role entry
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'editor')
    ON CONFLICT (user_id) DO NOTHING;

    -- Create or update team_members entry with 'incomplete' validation_status
    -- This ensures the editor doesn't appear in the PM validation queue until they complete their profile
    INSERT INTO public.team_members (
      user_id,
      email,
      full_name,
      role,
      department,
      position,
      status,
      validation_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'editor',
      'Production',
      'Video Editor',
      'pending',
      'incomplete'
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = NEW.id,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', team_members.full_name),
      status = 'pending',
      validation_status = CASE 
        WHEN team_members.validation_status IN ('submitted', 'validated') THEN team_members.validation_status
        ELSE 'incomplete'
      END;

    -- Create editor_stats entry
    INSERT INTO public.editor_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Update existing editors who have 'pending' validation_status but haven't completed their profile
UPDATE public.team_members 
SET validation_status = 'incomplete'
WHERE role = 'editor' 
  AND validation_status = 'pending'
  AND profile_completed_at IS NULL;