-- Add unique constraint on user_id for team_members (to support ON CONFLICT)
ALTER TABLE public.team_members ADD CONSTRAINT team_members_user_id_unique UNIQUE (user_id);