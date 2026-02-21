
-- Change token column to use shorter text tokens instead of UUIDs
-- For video_project_review_links
ALTER TABLE public.video_project_review_links 
  ALTER COLUMN token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  ALTER COLUMN token TYPE text;

-- For design_project_review_links  
ALTER TABLE public.design_project_review_links
  ALTER COLUMN token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  ALTER COLUMN token TYPE text;

-- For video_review_links (individual video delivery links)
ALTER TABLE public.video_review_links
  ALTER COLUMN token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  ALTER COLUMN token TYPE text;

-- For design_review_links
ALTER TABLE public.design_review_links
  ALTER COLUMN token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  ALTER COLUMN token TYPE text;

-- For review_links (task delivery links)
ALTER TABLE public.review_links
  ALTER COLUMN token SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  ALTER COLUMN token TYPE text;
