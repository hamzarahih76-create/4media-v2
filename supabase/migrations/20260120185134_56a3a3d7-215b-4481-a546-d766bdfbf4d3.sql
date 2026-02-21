-- Create a function to handle new team member signups via /join/team
CREATE OR REPLACE FUNCTION public.handle_new_team_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val text;
  user_department text;
  user_position text;
BEGIN
  -- Get metadata from new user
  user_role_val := NEW.raw_user_meta_data->>'role';
  user_department := NEW.raw_user_meta_data->>'department';
  user_position := NEW.raw_user_meta_data->>'position';
  
  -- Only process if this is a team_member signup (from /join/team)
  IF user_role_val = 'team_member' THEN
    -- Create user_role as project_manager (they need admin approval to activate)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'project_manager')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create team_member entry with pending status
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
      NEW.raw_user_meta_data->>'full_name',
      'project_manager',
      user_department,
      user_position,
      'pending',
      'pending'
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = NEW.id,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', team_members.full_name),
      department = COALESCE(user_department, team_members.department),
      position = COALESCE(user_position, team_members.position);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_team_member_signup ON auth.users;
CREATE TRIGGER on_team_member_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team_signup();