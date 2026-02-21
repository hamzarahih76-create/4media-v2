
-- Create a function that syncs design task counts to client_profiles
-- This runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.sync_design_pack_to_client()
RETURNS TRIGGER AS $$
DECLARE
  target_client_user_id UUID;
  total_posts INT := 0;
  total_minis INT := 0;
  total_carousels INT := 0;
BEGIN
  -- Determine which client to sync
  IF TG_OP = 'DELETE' THEN
    target_client_user_id := OLD.client_user_id;
  ELSE
    target_client_user_id := NEW.client_user_id;
  END IF;

  -- Also handle client change on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.client_user_id IS DISTINCT FROM NEW.client_user_id AND OLD.client_user_id IS NOT NULL THEN
    -- Recalculate for the OLD client too
    SELECT
      COALESCE(SUM(
        CASE WHEN part ~ '(\d+)x\s*Post' THEN (regexp_match(part, '(\d+)x\s*Post'))[1]::INT ELSE 0 END
      ), 0),
      COALESCE(SUM(
        CASE WHEN part ~ '(\d+)x\s*Miniature' THEN (regexp_match(part, '(\d+)x\s*Miniature'))[1]::INT ELSE 0 END
      ), 0),
      COALESCE(SUM(
        CASE WHEN part ~ '(\d+)x\s*Carrousel' THEN (regexp_match(part, '(\d+)x\s*Carrousel'))[1]::INT ELSE 0 END
      ), 0)
    INTO total_posts, total_minis, total_carousels
    FROM (
      SELECT unnest(string_to_array((regexp_match(dt.description, '^\[(.+?)\]'))[1], '+')) AS part
      FROM design_tasks dt
      WHERE dt.client_user_id = OLD.client_user_id
        AND dt.status NOT IN ('cancelled')
        AND dt.description ~ '^\[.+?\]'
    ) parts;

    UPDATE client_profiles SET
      design_posts_per_month = total_posts,
      design_miniatures_per_month = total_minis,
      design_carousels_per_month = total_carousels
    WHERE user_id = OLD.client_user_id;
  END IF;

  -- Skip if no client
  IF target_client_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Recalculate totals from ALL non-cancelled design tasks for this client
  total_posts := 0;
  total_minis := 0;
  total_carousels := 0;

  SELECT
    COALESCE(SUM(
      CASE WHEN part ~ '(\d+)x\s*Post' THEN (regexp_match(part, '(\d+)x\s*Post'))[1]::INT ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN part ~ '(\d+)x\s*Miniature' THEN (regexp_match(part, '(\d+)x\s*Miniature'))[1]::INT ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN part ~ '(\d+)x\s*Carrousel' THEN (regexp_match(part, '(\d+)x\s*Carrousel'))[1]::INT ELSE 0 END
    ), 0)
  INTO total_posts, total_minis, total_carousels
  FROM (
    SELECT unnest(string_to_array((regexp_match(dt.description, '^\[(.+?)\]'))[1], '+')) AS part
    FROM design_tasks dt
    WHERE dt.client_user_id = target_client_user_id
      AND dt.status NOT IN ('cancelled')
      AND dt.description ~ '^\[.+?\]'
  ) parts;

  UPDATE client_profiles SET
    design_posts_per_month = total_posts,
    design_miniatures_per_month = total_minis,
    design_carousels_per_month = total_carousels
  WHERE user_id = target_client_user_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on design_tasks
DROP TRIGGER IF EXISTS trg_sync_design_pack ON design_tasks;
CREATE TRIGGER trg_sync_design_pack
  AFTER INSERT OR UPDATE OR DELETE ON design_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_design_pack_to_client();
