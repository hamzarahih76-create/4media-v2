-- Add new columns to team_members for complete profile data
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS id_card_url TEXT,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_validated_by UUID,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'submitted', 'validated', 'rejected'));

-- Update existing active members to be validated
UPDATE public.team_members
SET validation_status = 'validated'
WHERE status = 'active' AND validation_status = 'pending';

-- Create storage bucket for editor documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'editor-documents', 
  'editor-documents', 
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for editor-documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'editor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'editor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'editor-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all editor documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'editor-documents'
  AND public.is_admin_or_pm(auth.uid())
);