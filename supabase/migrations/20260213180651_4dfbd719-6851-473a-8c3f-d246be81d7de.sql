
-- Add internal brief and workflow fields to client_profiles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS strategic_description text,
  ADD COLUMN IF NOT EXISTS visual_identity_notes text,
  ADD COLUMN IF NOT EXISTS positioning text,
  ADD COLUMN IF NOT EXISTS videos_per_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS studio_location text,
  ADD COLUMN IF NOT EXISTS shooting_day text,
  ADD COLUMN IF NOT EXISTS next_shooting_date date,
  ADD COLUMN IF NOT EXISTS project_end_date date,
  ADD COLUMN IF NOT EXISTS client_objectives text,
  ADD COLUMN IF NOT EXISTS tone_style text;

-- Add comment for documentation
COMMENT ON COLUMN public.client_profiles.workflow_status IS 'Current workflow step: idea, script, filmmaking, editing, publication, analysis';
COMMENT ON COLUMN public.client_profiles.strategic_description IS 'Internal strategic brief written by admin';
COMMENT ON COLUMN public.client_profiles.visual_identity_notes IS 'Brand identity: colors, tone, style notes';
COMMENT ON COLUMN public.client_profiles.positioning IS 'Client market positioning';
COMMENT ON COLUMN public.client_profiles.videos_per_month IS 'Number of videos per month in contract';
COMMENT ON COLUMN public.client_profiles.studio_location IS 'Studio or shooting location';
COMMENT ON COLUMN public.client_profiles.shooting_day IS 'Preferred shooting day of the week';
COMMENT ON COLUMN public.client_profiles.next_shooting_date IS 'Next planned shooting date';
COMMENT ON COLUMN public.client_profiles.project_end_date IS 'Project/contract end date';
COMMENT ON COLUMN public.client_profiles.client_objectives IS 'Client goals and objectives';
COMMENT ON COLUMN public.client_profiles.tone_style IS 'Communication tone and visual style';
