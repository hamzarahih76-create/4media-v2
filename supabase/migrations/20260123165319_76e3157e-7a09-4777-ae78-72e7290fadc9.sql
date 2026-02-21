-- Add cloudflare_stream_id column to video_deliveries table
ALTER TABLE public.video_deliveries 
ADD COLUMN IF NOT EXISTS cloudflare_stream_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_deliveries_cloudflare_stream_id 
ON public.video_deliveries(cloudflare_stream_id);

-- Add comment for documentation
COMMENT ON COLUMN public.video_deliveries.cloudflare_stream_id IS 'Cloudflare Stream video ID for direct streaming and downloads';