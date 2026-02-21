-- Add unique constraint on email for team_members
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_email_unique UNIQUE (email);