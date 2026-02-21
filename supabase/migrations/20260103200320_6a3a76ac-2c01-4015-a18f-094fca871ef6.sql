
-- Fix search_path for calculate_level_from_xp
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp_amount integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_level INTEGER;
BEGIN
  SELECT COALESCE(MAX(level), 1)
  INTO calculated_level
  FROM public.level_config
  WHERE xp_required <= xp_amount;
  
  RETURN calculated_level;
END;
$$;

-- Fix search_path for calculate_rank_from_level
CREATE OR REPLACE FUNCTION public.calculate_rank_from_level(level_num integer)
RETURNS editor_rank
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_rank editor_rank;
BEGIN
  SELECT COALESCE(rank, 'bronze')
  INTO calculated_rank
  FROM public.level_config
  WHERE level = level_num;
  
  RETURN COALESCE(calculated_rank, 'bronze');
END;
$$;
