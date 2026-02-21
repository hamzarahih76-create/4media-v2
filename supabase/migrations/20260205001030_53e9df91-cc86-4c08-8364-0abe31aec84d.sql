-- Create the design-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files', 
  'design-files', 
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/x-photoshop', 'image/vnd.adobe.photoshop', 'application/postscript', 'application/illustrator']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Designers can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Designers can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Designers can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view design files" ON storage.objects;

-- Allow designers to upload files
CREATE POLICY "Designers can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'design-files' 
  AND auth.uid() IS NOT NULL
);

-- Allow designers to update their own files
CREATE POLICY "Designers can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'design-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow designers to delete their own files
CREATE POLICY "Designers can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'design-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for design files (so clients can view)
CREATE POLICY "Anyone can view design files"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-files');