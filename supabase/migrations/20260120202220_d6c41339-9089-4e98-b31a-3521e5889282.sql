-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_editor ON auth.users;

-- Create improved function that handles editor signup completely
CREATE OR REPLACE FUNCTION public.handle_new_editor()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an editor signup (role = 'editor')
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') = 'editor' THEN
    
    -- Create editor stats
    INSERT INTO public.editor_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Assign default editor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'editor')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create team_member entry with pending status for admin validation
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
      'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = NEW.id,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', team_members.full_name),
      status = 'pending',
      validation_status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created_editor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_editor();