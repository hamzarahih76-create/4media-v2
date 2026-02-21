
-- Add account_status to client_profiles for validation workflow
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Add domain/activity field for self-registered clients
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS domain_activity text;

-- Add avatar_url for client profile photo
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comment: existing clients default to 'active', new self-registered will be 'pending'
