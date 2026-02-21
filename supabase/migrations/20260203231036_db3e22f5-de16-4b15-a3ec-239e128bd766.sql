-- Fix: Update handle_new_designer trigger to use valid status 'pending' instead of 'incomplete'
CREATE OR REPLACE FUNCTION public.handle_new_designer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Only proceed if user signed up as designer
  IF NEW.raw_user_meta_data->>'role' = 'designer' THEN
    -- Create designer stats
    INSERT INTO public.designer_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer')
    ON CONFLICT (user_id) DO NOTHING;

    -- Create team member entry with valid status 'pending'
    INSERT INTO public.team_members (
      user_id,
      email,
      full_name,
      role,
      position,
      department,
      status,
      validation_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'designer',
      'Designer',
      'Design',
      'pending',
      'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      role = 'designer',
      position = 'Designer',
      department = 'Design',
      status = CASE 
        WHEN team_members.status IN ('pending', 'inactive') THEN 'pending'
        ELSE team_members.status
      END;
  END IF;

  RETURN NEW;
END;
$$;