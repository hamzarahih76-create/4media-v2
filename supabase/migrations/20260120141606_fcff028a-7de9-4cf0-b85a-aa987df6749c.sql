-- Create permissions enum
CREATE TYPE public.permission_type AS ENUM (
  'manage_projects',
  'manage_team', 
  'manage_clients',
  'validate_videos',
  'manage_payments',
  'access_dashboard',
  'access_editor'
);

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission permission_type NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  )
  OR 
  -- Admins have all permissions automatically
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS permission_type[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(permission),
    ARRAY[]::permission_type[]
  )
  FROM public.user_permissions
  WHERE user_id = _user_id
$$;

-- RLS Policies
-- Admins can manage all permissions
CREATE POLICY "Admins can manage permissions"
ON public.user_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Grant default permissions to existing editors (access_editor only)
INSERT INTO public.user_permissions (user_id, permission)
SELECT ur.user_id, 'access_editor'::permission_type
FROM public.user_roles ur
WHERE ur.role = 'editor'
ON CONFLICT (user_id, permission) DO NOTHING;

-- Grant all permissions to existing admins (for explicit tracking)
INSERT INTO public.user_permissions (user_id, permission)
SELECT ur.user_id, p.permission
FROM public.user_roles ur
CROSS JOIN (
  SELECT unnest(ARRAY['manage_projects', 'manage_team', 'manage_clients', 'validate_videos', 'manage_payments', 'access_dashboard', 'access_editor']::permission_type[]) as permission
) p
WHERE ur.role = 'admin'
ON CONFLICT (user_id, permission) DO NOTHING;