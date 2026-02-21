-- Add client_type column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN client_type text DEFAULT 'b2b' CHECK (client_type IN ('b2b', 'b2c', 'international'));