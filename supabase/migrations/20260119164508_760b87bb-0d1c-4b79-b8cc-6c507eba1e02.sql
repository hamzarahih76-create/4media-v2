-- Add revision_images column to video_feedback table
ALTER TABLE public.video_feedback
ADD COLUMN revision_images text[] DEFAULT '{}';

-- Add revision_images column to client_feedback table  
ALTER TABLE public.client_feedback
ADD COLUMN revision_images text[] DEFAULT '{}';