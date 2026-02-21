
-- Create client_contracts table
CREATE TABLE public.client_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL,
  pack_type TEXT NOT NULL CHECK (pack_type IN ('8_videos', '12_videos', '16_videos')),
  pack_price NUMERIC NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months IN (4, 8, 12)),
  total_amount NUMERIC NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_activity TEXT,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'expired', 'cancelled')),
  contract_start_date DATE,
  contract_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;

-- Clients can view their own contracts
CREATE POLICY "Clients can view own contracts"
ON public.client_contracts FOR SELECT
USING (auth.uid() = client_user_id);

-- Clients can create their own contracts
CREATE POLICY "Clients can create own contracts"
ON public.client_contracts FOR INSERT
WITH CHECK (auth.uid() = client_user_id);

-- Clients can update their own contracts (for signing)
CREATE POLICY "Clients can update own contracts"
ON public.client_contracts FOR UPDATE
USING (auth.uid() = client_user_id);

-- Admins and PMs can view all contracts
CREATE POLICY "Admins can view all contracts"
ON public.client_contracts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'project_manager')
  )
);

-- Admins can update any contract
CREATE POLICY "Admins can update all contracts"
ON public.client_contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'project_manager')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_client_contracts_updated_at
BEFORE UPDATE ON public.client_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_contracts;
