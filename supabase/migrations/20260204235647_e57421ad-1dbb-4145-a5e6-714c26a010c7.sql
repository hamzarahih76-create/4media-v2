-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-files', 'design-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for design-files bucket
CREATE POLICY "Designers can upload their design files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'design-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Designers can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'design-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and PMs can view all design files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'design-files' 
  AND is_admin_or_pm(auth.uid())
);

CREATE POLICY "Designers can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'design-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);