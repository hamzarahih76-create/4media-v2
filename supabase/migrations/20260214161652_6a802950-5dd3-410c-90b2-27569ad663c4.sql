
ALTER TABLE public.client_profiles 
  ADD COLUMN IF NOT EXISTS design_posts_per_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS design_miniatures_per_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS design_logos_per_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS design_carousels_per_month integer DEFAULT 0;
