
CREATE TABLE public.studio_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view studio locations"
  ON public.studio_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert studio locations"
  ON public.studio_locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed existing locations from client_profiles
INSERT INTO public.studio_locations (name)
SELECT DISTINCT studio_location FROM public.client_profiles
WHERE studio_location IS NOT NULL AND studio_location != ''
ON CONFLICT (name) DO NOTHING;
