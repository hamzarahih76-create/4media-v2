
-- =====================================================
-- OPERATIONAL RULES FOR XP SYSTEM
-- =====================================================

-- 1. Add performance tracking columns to editor_stats
ALTER TABLE public.editor_stats 
ADD COLUMN IF NOT EXISTS last_evaluation_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS consecutive_late_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_xp_change integer DEFAULT 0;

-- 2. Create function to calculate 30-day performance score
CREATE OR REPLACE FUNCTION public.calculate_30day_performance(p_editor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_deliveries INTEGER;
  v_on_time_deliveries INTEGER;
  v_late_deliveries INTEGER;
  v_total_xp_earned INTEGER;
  v_total_xp_lost INTEGER;
  v_net_xp INTEGER;
  v_on_time_rate NUMERIC;
BEGIN
  -- Get 30-day transaction summary
  SELECT 
    COUNT(*) FILTER (WHERE action_type = 'task_delivered'),
    COALESCE(SUM(xp_amount) FILTER (WHERE xp_amount > 0), 0),
    COALESCE(ABS(SUM(xp_amount) FILTER (WHERE xp_amount < 0)), 0)
  INTO v_total_deliveries, v_total_xp_earned, v_total_xp_lost
  FROM public.xp_transactions
  WHERE editor_id = p_editor_id
    AND created_at >= NOW() - INTERVAL '30 days';

  -- Get on-time stats from editor_stats
  SELECT total_on_time, total_late
  INTO v_on_time_deliveries, v_late_deliveries
  FROM public.editor_stats
  WHERE user_id = p_editor_id;

  v_net_xp := v_total_xp_earned - v_total_xp_lost;
  
  IF v_total_deliveries > 0 THEN
    v_on_time_rate := (v_on_time_deliveries::NUMERIC / GREATEST(v_on_time_deliveries + v_late_deliveries, 1)) * 100;
  ELSE
    v_on_time_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'total_deliveries', v_total_deliveries,
    'on_time_deliveries', v_on_time_deliveries,
    'late_deliveries', v_late_deliveries,
    'xp_earned', v_total_xp_earned,
    'xp_lost', v_total_xp_lost,
    'net_xp', v_net_xp,
    'on_time_rate', ROUND(v_on_time_rate, 1)
  );
END;
$$;

-- 3. Create function to evaluate and potentially demote level
CREATE OR REPLACE FUNCTION public.evaluate_level_stability(p_editor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_current_level INTEGER;
  v_current_xp INTEGER;
  v_current_rank editor_rank;
  v_consecutive_late INTEGER;
  v_performance jsonb;
  v_should_demote BOOLEAN := false;
  v_demotion_reason TEXT := '';
  v_new_level INTEGER;
  v_new_rank editor_rank;
  v_xp_penalty INTEGER := 0;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only Admin/PM can trigger evaluation
  IF NOT public.is_admin_or_pm(v_caller_id) THEN
    RAISE EXCEPTION 'Only Admin or Project Manager can evaluate level stability';
  END IF;

  -- Get current stats
  SELECT level, xp, rank, consecutive_late_count
  INTO v_current_level, v_current_xp, v_current_rank, v_consecutive_late
  FROM public.editor_stats
  WHERE user_id = p_editor_id;

  -- Get 30-day performance
  v_performance := public.calculate_30day_performance(p_editor_id);

  -- Rule 1: 3+ consecutive late deliveries = level instability
  IF v_consecutive_late >= 3 THEN
    v_should_demote := true;
    v_demotion_reason := 'Too many consecutive late deliveries';
    v_xp_penalty := GREATEST(100 * v_consecutive_late, 300); -- Escalating penalty
  END IF;

  -- Rule 2: Elite ranks (platinum/diamond) need >80% on-time rate
  IF v_current_rank IN ('platinum', 'diamond') AND (v_performance->>'on_time_rate')::NUMERIC < 80 THEN
    v_should_demote := true;
    v_demotion_reason := 'On-time rate below 80% required for elite rank';
    v_xp_penalty := GREATEST(v_xp_penalty, 500);
  END IF;

  -- Rule 3: Negative net XP in 30 days = potential demotion
  IF (v_performance->>'net_xp')::INTEGER < -200 THEN
    v_should_demote := true;
    v_demotion_reason := COALESCE(v_demotion_reason || '; ', '') || 'Significant XP loss in 30 days';
    v_xp_penalty := GREATEST(v_xp_penalty, ABS((v_performance->>'net_xp')::INTEGER) / 2);
  END IF;

  -- Apply demotion if needed
  IF v_should_demote AND v_xp_penalty > 0 THEN
    -- Apply XP penalty
    UPDATE public.editor_stats
    SET 
      xp = GREATEST(0, xp - v_xp_penalty),
      last_evaluation_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = p_editor_id
    RETURNING xp INTO v_current_xp;

    -- Recalculate level and rank
    v_new_level := public.calculate_level_from_xp(v_current_xp);
    v_new_rank := public.calculate_rank_from_level(v_new_level);

    UPDATE public.editor_stats
    SET level = v_new_level, rank = v_new_rank
    WHERE user_id = p_editor_id;

    -- Log the demotion
    INSERT INTO public.xp_transactions (editor_id, task_id, action_type, xp_amount, reason, validated_by)
    VALUES (p_editor_id, NULL, 'manual_adjustment', -v_xp_penalty, 'Level stability evaluation: ' || v_demotion_reason, v_caller_id);

    RETURN jsonb_build_object(
      'demoted', true,
      'reason', v_demotion_reason,
      'xp_penalty', v_xp_penalty,
      'old_level', v_current_level,
      'new_level', v_new_level,
      'old_rank', v_current_rank,
      'new_rank', v_new_rank,
      'performance', v_performance
    );
  END IF;

  -- Update evaluation date even if no demotion
  UPDATE public.editor_stats
  SET last_evaluation_date = CURRENT_DATE
  WHERE user_id = p_editor_id;

  RETURN jsonb_build_object(
    'demoted', false,
    'current_level', v_current_level,
    'current_rank', v_current_rank,
    'performance', v_performance
  );
END;
$$;

-- 4. Update complete_task_delivery to track consecutive late
CREATE OR REPLACE FUNCTION public.complete_task_delivery(
  p_editor_id uuid, 
  p_task_id uuid, 
  p_base_xp integer, 
  p_is_on_time boolean, 
  p_is_urgent boolean,
  p_revision_count integer DEFAULT 0, 
  p_quality_rating integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_total_xp INTEGER := p_base_xp;
  v_breakdown JSONB := '[]'::jsonb;
  v_result JSONB;
  v_consecutive_late INTEGER;
BEGIN
  v_caller_id := auth.uid();
  
  -- CRITICAL: Only Admin/PM can validate deliveries
  IF NOT public.is_admin_or_pm(v_caller_id) THEN
    RAISE EXCEPTION 'Only Admin or Project Manager can validate deliveries';
  END IF;
  
  -- Base XP for delivery
  v_breakdown := v_breakdown || jsonb_build_object('type', 'task_delivered', 'xp', p_base_xp);
  
  -- On-time bonus (+20%) or Late penalty (-30%)
  IF p_is_on_time THEN
    v_total_xp := v_total_xp + ROUND(p_base_xp * 0.20);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'on_time_bonus', 'xp', ROUND(p_base_xp * 0.20));
  ELSE
    -- Late penalty is more severe
    v_total_xp := v_total_xp - ROUND(p_base_xp * 0.30);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'late_penalty', 'xp', -ROUND(p_base_xp * 0.30));
  END IF;
  
  -- Urgent task bonus (+50%)
  IF p_is_urgent THEN
    v_total_xp := v_total_xp + ROUND(p_base_xp * 0.50);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'urgent_bonus', 'xp', ROUND(p_base_xp * 0.50));
  END IF;
  
  -- Revision penalties (-15% per revision after first) - increased penalty
  IF p_revision_count > 1 THEN
    v_total_xp := v_total_xp - ROUND(p_base_xp * 0.15 * (p_revision_count - 1));
    v_breakdown := v_breakdown || jsonb_build_object('type', 'revision_penalty', 'xp', -ROUND(p_base_xp * 0.15 * (p_revision_count - 1)));
  END IF;
  
  -- Quality bonus (5 stars = +25%)
  IF p_quality_rating = 5 THEN
    v_total_xp := v_total_xp + ROUND(p_base_xp * 0.25);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'quality_bonus', 'xp', ROUND(p_base_xp * 0.25));
  ELSIF p_quality_rating <= 2 THEN
    -- Poor quality penalty (-20%)
    v_total_xp := v_total_xp - ROUND(p_base_xp * 0.20);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'quality_penalty', 'xp', -ROUND(p_base_xp * 0.20));
  END IF;
  
  -- Track consecutive late deliveries
  IF p_is_on_time THEN
    v_consecutive_late := 0;
  ELSE
    SELECT consecutive_late_count + 1 INTO v_consecutive_late
    FROM public.editor_stats WHERE user_id = p_editor_id;
  END IF;
  
  -- Update delivery stats
  UPDATE public.editor_stats
  SET 
    total_videos_delivered = total_videos_delivered + 1,
    total_on_time = total_on_time + CASE WHEN p_is_on_time THEN 1 ELSE 0 END,
    total_late = total_late + CASE WHEN NOT p_is_on_time THEN 1 ELSE 0 END,
    total_revisions = total_revisions + p_revision_count,
    consecutive_late_count = v_consecutive_late,
    last_activity_date = CURRENT_DATE,
    streak_days = CASE 
      WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
      WHEN last_activity_date = CURRENT_DATE THEN streak_days
      ELSE 1
    END
  WHERE user_id = p_editor_id;
  
  -- Grant the XP (this also updates level/rank)
  v_result := public.grant_xp(
    p_editor_id,
    p_task_id,
    'task_delivered',
    v_total_xp,
    'Task delivery with bonuses/penalties'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'total_xp', v_total_xp,
    'breakdown', v_breakdown,
    'level_up', (v_result->>'level_up')::boolean,
    'new_level', (v_result->>'new_level')::integer,
    'new_rank', v_result->>'new_rank',
    'consecutive_late', v_consecutive_late
  );
END;
$$;

-- 5. Create function for streak bonus (daily login reward)
CREATE OR REPLACE FUNCTION public.claim_daily_streak_bonus(p_editor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_bonus_xp INTEGER;
  v_result JSONB;
BEGIN
  -- Get current streak info
  SELECT last_activity_date, streak_days
  INTO v_last_activity, v_current_streak
  FROM public.editor_stats
  WHERE user_id = p_editor_id;
  
  -- Check if already claimed today
  IF v_last_activity = CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'Already claimed today',
      'current_streak', v_current_streak
    );
  END IF;
  
  -- Calculate streak
  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    v_current_streak := 1; -- Reset streak
  END IF;
  
  -- Bonus XP based on streak (5 XP base + 2 per streak day, max 50)
  v_bonus_xp := LEAST(5 + (v_current_streak * 2), 50);
  
  -- Update streak
  UPDATE public.editor_stats
  SET 
    streak_days = v_current_streak,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_editor_id;
  
  -- Use system grant (bypass PM check for self-claim streak)
  INSERT INTO public.xp_transactions (editor_id, task_id, action_type, xp_amount, reason, validated_by)
  VALUES (p_editor_id, NULL, 'streak_bonus', v_bonus_xp, 'Daily streak bonus (Day ' || v_current_streak || ')', NULL);
  
  -- Update XP
  UPDATE public.editor_stats
  SET xp = xp + v_bonus_xp
  WHERE user_id = p_editor_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'streak_days', v_current_streak,
    'bonus_xp', v_bonus_xp
  );
END;
$$;

-- 6. Ensure RLS policies are strict for editor_stats
DROP POLICY IF EXISTS "Only system can modify stats" ON public.editor_stats;

CREATE POLICY "Only system functions can modify stats" 
ON public.editor_stats 
FOR UPDATE 
USING (false); -- No direct updates allowed, only via security definer functions
