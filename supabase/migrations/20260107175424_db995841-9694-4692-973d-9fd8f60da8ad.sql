-- Update default value for average_rating to 5 for new editors
ALTER TABLE public.editor_stats 
ALTER COLUMN average_rating SET DEFAULT 5;

-- Update existing editors with 0 videos to have average_rating = 5
UPDATE public.editor_stats 
SET average_rating = 5 
WHERE total_videos_delivered = 0 AND (average_rating = 0 OR average_rating IS NULL);