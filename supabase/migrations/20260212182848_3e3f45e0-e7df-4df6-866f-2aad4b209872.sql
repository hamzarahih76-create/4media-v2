
-- Create trigger function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_full_name text;
BEGIN
  -- Extract role from user metadata
  user_role := NEW.raw_user_meta_data ->> 'role';
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');

  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  -- Handle editor signup
  IF user_role = 'editor' THEN
    -- Create user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'editor')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create team member
    INSERT INTO public.team_members (email, user_id, full_name, role, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'Video Editor', 'incomplete', 'incomplete')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = COALESCE(EXCLUDED.full_name, team_members.full_name);

    -- Create editor stats
    INSERT INTO public.editor_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Handle designer signup
  IF user_role = 'designer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'Designer', 'incomplete', 'incomplete')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = COALESCE(EXCLUDED.full_name, team_members.full_name);

    INSERT INTO public.designer_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Handle copywriter signup
  IF user_role = 'copywriter' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'copywriter')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'Copywriter', 'incomplete', 'incomplete')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = COALESCE(EXCLUDED.full_name, team_members.full_name);
  END IF;

  -- Handle project_manager / team signup
  IF user_role = 'project_manager' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'project_manager')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'Project Manager', 'pending', 'pending')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = COALESCE(EXCLUDED.full_name, team_members.full_name);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- Also ensure unique constraint on editor_stats.user_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'editor_stats_user_id_key'
  ) THEN
    ALTER TABLE public.editor_stats ADD CONSTRAINT editor_stats_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure unique constraint on designer_stats.user_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'designer_stats_user_id_key'
  ) THEN
    ALTER TABLE public.designer_stats ADD CONSTRAINT designer_stats_user_id_key UNIQUE (user_id);
  END IF;
END $$;
