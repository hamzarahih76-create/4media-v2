-- First, delete duplicate user_roles keeping only the first one per user using created_at
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id 
  AND a.created_at > b.created_at;

-- Now add the unique constraint
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Recreate the trigger function
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