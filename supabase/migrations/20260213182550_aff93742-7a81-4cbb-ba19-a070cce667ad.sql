ALTER TABLE public.client_profiles 
ALTER COLUMN next_shooting_date TYPE timestamp with time zone USING next_shooting_date::timestamp with time zone;