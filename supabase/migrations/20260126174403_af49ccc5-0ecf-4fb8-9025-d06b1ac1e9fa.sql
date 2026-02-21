-- Add column to store Cloudflare audio ID in video_feedback table
ALTER TABLE public.video_feedback 
ADD COLUMN IF NOT EXISTS cloudflare_audio_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.video_feedback.cloudflare_audio_id IS 'Cloudflare Stream ID for the revision audio message';

-- Also add to client_feedback table for consistency
ALTER TABLE public.client_feedback 
ADD COLUMN IF NOT EXISTS cloudflare_audio_id TEXT;

COMMENT ON COLUMN public.client_feedback.cloudflare_audio_id IS 'Cloudflare Stream ID for the revision audio message';