
CREATE POLICY "Authenticated users can delete studio locations"
  ON public.studio_locations FOR DELETE
  USING (auth.uid() IS NOT NULL);
