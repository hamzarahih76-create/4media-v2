-- Add is_answered column to track if a question has been answered
ALTER TABLE public.video_conversations 
ADD COLUMN is_answered BOOLEAN NOT NULL DEFAULT false;