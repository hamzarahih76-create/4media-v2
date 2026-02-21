
-- 1. Fix team_members INSERT: only admins/PMs can invite, not anyone authenticated
DROP POLICY IF EXISTS "Anyone authenticated can invite" ON public.team_members;
CREATE POLICY "Admins and PMs can invite team members"
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_pm(auth.uid()));

-- 2. Allow PMs (with manage_team permission) to manage user_permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;
CREATE POLICY "Admins and PMs can manage permissions"
  ON public.user_permissions
  FOR ALL
  TO authenticated
  USING (is_admin_or_pm(auth.uid()))
  WITH CHECK (is_admin_or_pm(auth.uid()));

-- 3. Tighten user_roles: allow PMs to view all roles (needed for team management)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins and PMs can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (is_admin_or_pm(auth.uid()))
  WITH CHECK (is_admin_or_pm(auth.uid()));
