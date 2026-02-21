
ALTER TABLE public.client_contracts DROP CONSTRAINT client_contracts_duration_months_check;
ALTER TABLE public.client_contracts DROP CONSTRAINT client_contracts_pack_type_check;

-- Allow any positive duration
ALTER TABLE public.client_contracts ADD CONSTRAINT client_contracts_duration_months_check CHECK (duration_months > 0);

-- Allow custom pack type too
ALTER TABLE public.client_contracts ADD CONSTRAINT client_contracts_pack_type_check CHECK (pack_type IN ('8_videos', '12_videos', '16_videos', 'custom'));
