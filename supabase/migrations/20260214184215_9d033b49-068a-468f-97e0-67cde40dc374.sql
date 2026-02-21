
-- Add dedicated columns for source files link and editor instructions on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_files_link TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS editor_instructions TEXT;
