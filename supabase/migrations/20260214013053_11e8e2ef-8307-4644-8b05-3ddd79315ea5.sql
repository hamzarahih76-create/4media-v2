
-- Update the signup trigger to handle client self-registration
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_full_name text;
  user_domain text;
BEGIN
  user_role := NEW.raw_user_meta_data ->> 'role';
  user_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  user_domain := NEW.raw_user_meta_data ->> 'domain_activity';

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  IF user_role = 'editor' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'editor')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, department, position, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'editor', 'Post-Production', 'Video Editor', 'pending', 'incomplete')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = EXCLUDED.full_name,
      role = 'editor',
      status = 'pending',
      validation_status = 'incomplete';

    INSERT INTO public.editor_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF user_role = 'designer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, department, position, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'designer', 'Design', 'Designer', 'pending', 'incomplete')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = EXCLUDED.full_name,
      role = 'designer',
      status = 'pending',
      validation_status = 'incomplete';

    INSERT INTO public.designer_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF user_role = 'copywriter' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'copywriter')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'copywriter', 'pending', 'pending')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = EXCLUDED.full_name;
  END IF;

  IF user_role = 'project_manager' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'project_manager')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.team_members (email, user_id, full_name, role, status, validation_status)
    VALUES (NEW.email, NEW.id, user_full_name, 'project_manager', 'pending', 'pending')
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = EXCLUDED.full_name;
  END IF;

  -- Handle client self-registration
  IF user_role = 'client' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.client_profiles (user_id, company_name, contact_name, email, domain_activity, account_status)
    VALUES (NEW.id, user_full_name, user_full_name, NEW.email, COALESCE(user_domain, ''), 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
