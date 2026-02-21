-- Add audio path column to video_feedback for client audio messages
ALTER TABLE public.video_feedback 
ADD COLUMN IF NOT EXISTS revision_audio_path TEXT DEFAULT NULL;

-- Add audio path column to client_feedback as well for consistency
ALTER TABLE public.client_feedback 
ADD COLUMN IF NOT EXISTS revision_audio_path TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.video_feedback.revision_audio_path IS 'Path to audio file in storage for voice revision requests';
COMMENT ON COLUMN public.client_feedback.revision_audio_path IS 'Path to audio file in storage for voice revision requests';