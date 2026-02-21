
-- Update the status check constraint to include pending_signature
ALTER TABLE public.client_contracts DROP CONSTRAINT IF EXISTS client_contracts_status_check;
ALTER TABLE public.client_contracts ADD CONSTRAINT client_contracts_status_check 
  CHECK (status IN ('draft', 'pending_signature', 'signed', 'expired', 'cancelled'));
