-- Allow anonymous/public uploads for client revision files
-- This is needed because clients access via review links without authentication

-- Policy for clients to upload revision audio via review links
CREATE POLICY "Clients can upload revision audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'deliveries' 
  AND (storage.foldername(name))[1] = 'revision-audio'
);

-- Policy for clients to upload revision images via review links
CREATE POLICY "Clients can upload revision images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'deliveries' 
  AND (storage.foldername(name))[1] = 'revision-images'
);

-- Allow reading revision files for signed URL generation
CREATE POLICY "Anyone can read revision files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deliveries'
  AND (
    (storage.foldername(name))[1] = 'revision-audio'
    OR (storage.foldername(name))[1] = 'revision-images'
  )
);