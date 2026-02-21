
-- Create a trigger function that auto-updates design_tasks when feedback is approved
CREATE OR REPLACE FUNCTION public.auto_update_design_task_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_task_description TEXT;
  v_design_count INT;
  v_approved_count INT;
  v_all_approved BOOLEAN;
BEGIN
  -- Only process approved feedback
  IF NEW.decision != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get task info
  SELECT description, design_count INTO v_task_description, v_design_count
  FROM design_tasks
  WHERE id = NEW.design_task_id;

  -- Count unique approved labels
  SELECT COUNT(DISTINCT (regexp_match(dd.notes, '^\[(.+?)\]'))[1])
  INTO v_approved_count
  FROM design_feedback df
  JOIN design_deliveries dd ON dd.id = df.delivery_id
  WHERE df.design_task_id = NEW.design_task_id
    AND df.decision = 'approved'
    AND dd.notes IS NOT NULL
    AND dd.notes ~ '^\[.+?\]';

  -- Fallback: if design_count is 0 or null, parse from description
  IF v_design_count IS NULL OR v_design_count = 0 THEN
    v_design_count := 0;
    -- Parse entries like [3x Post + 2x Miniature]
    DECLARE
      desc_match TEXT;
      entries TEXT[];
      entry TEXT;
      cnt INT;
    BEGIN
      desc_match := (regexp_match(v_task_description, '^\[(.+?)\]'))[1];
      IF desc_match IS NOT NULL THEN
        entries := string_to_array(desc_match, '+');
        FOREACH entry IN ARRAY entries LOOP
          cnt := (regexp_match(trim(entry), '(\d+)x'))[1]::INT;
          IF cnt IS NOT NULL THEN
            v_design_count := v_design_count + cnt;
          END IF;
        END LOOP;
      END IF;
    END;
  END IF;

  v_all_approved := v_design_count > 0 AND v_approved_count >= v_design_count;

  -- Update the task
  UPDATE design_tasks
  SET 
    designs_completed = v_approved_count,
    status = CASE WHEN v_all_approved THEN 'completed' ELSE status END,
    completed_at = CASE WHEN v_all_approved THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = NEW.design_task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_update_design_task_on_feedback ON design_feedback;
CREATE TRIGGER trg_auto_update_design_task_on_feedback
  AFTER INSERT ON design_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_design_task_on_feedback();
