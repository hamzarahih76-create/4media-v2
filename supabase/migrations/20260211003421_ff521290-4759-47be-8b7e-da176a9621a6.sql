
-- Create storage bucket for client profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view client avatars (public bucket)
CREATE POLICY "Client avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-avatars');

-- Allow authenticated users (admins) to upload client avatars
CREATE POLICY "Admins can upload client avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-avatars' AND auth.role() = 'authenticated');

-- Allow authenticated users to update client avatars
CREATE POLICY "Admins can update client avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-avatars' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete client avatars
CREATE POLICY "Admins can delete client avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-avatars' AND auth.role() = 'authenticated');
