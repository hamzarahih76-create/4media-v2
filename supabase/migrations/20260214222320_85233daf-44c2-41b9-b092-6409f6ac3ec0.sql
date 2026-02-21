
-- Add financial tracking fields to client_profiles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS total_contract numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_received numeric DEFAULT 0;
