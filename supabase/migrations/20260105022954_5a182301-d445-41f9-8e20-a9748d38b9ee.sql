-- Fix security warnings: Add search_path to functions
CREATE OR REPLACE FUNCTION public.get_next_version_number(p_task_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM public.task_deliveries WHERE task_id = p_task_id),
    1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;