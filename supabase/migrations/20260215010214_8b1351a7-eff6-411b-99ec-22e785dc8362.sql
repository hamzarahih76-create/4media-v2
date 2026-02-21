
-- Add client identification fields to client_contracts
ALTER TABLE public.client_contracts
  ADD COLUMN IF NOT EXISTS client_full_name TEXT,
  ADD COLUMN IF NOT EXISTS client_address TEXT,
  ADD COLUMN IF NOT EXISTS client_city TEXT,
  ADD COLUMN IF NOT EXISTS client_legal_status TEXT, -- 'personne_physique' or 'societe'
  ADD COLUMN IF NOT EXISTS client_cin TEXT,
  ADD COLUMN IF NOT EXISTS client_raison_sociale TEXT,
  ADD COLUMN IF NOT EXISTS client_ice TEXT,
  ADD COLUMN IF NOT EXISTS client_siege_address TEXT,
  ADD COLUMN IF NOT EXISTS client_representant_legal TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signing_ip TEXT;
