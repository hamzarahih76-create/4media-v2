-- Update calculate_30day_performance to return 100% on-time rate when no videos delivered
CREATE OR REPLACE FUNCTION public.calculate_30day_performance(p_editor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_deliveries INTEGER;
  v_on_time_deliveries INTEGER;
  v_late_deliveries INTEGER;
  v_total_xp_earned INTEGER;
  v_total_xp_lost INTEGER;
  v_net_xp INTEGER;
  v_on_time_rate NUMERIC;
  v_total_videos INTEGER;
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
  SELECT total_on_time, total_late, total_videos_delivered
  INTO v_on_time_deliveries, v_late_deliveries, v_total_videos
  FROM public.editor_stats
  WHERE user_id = p_editor_id;

  v_net_xp := v_total_xp_earned - v_total_xp_lost;
  
  -- If no videos delivered yet, show 100% on-time rate (perfect score for new editors)
  IF v_total_videos = 0 OR v_total_videos IS NULL THEN
    v_on_time_rate := 100;
  ELSIF (v_on_time_deliveries + v_late_deliveries) > 0 THEN
    v_on_time_rate := (v_on_time_deliveries::NUMERIC / (v_on_time_deliveries + v_late_deliveries)) * 100;
  ELSE
    v_on_time_rate := 100;
  END IF;

  RETURN jsonb_build_object(
    'total_deliveries', v_total_deliveries,
    'on_time_deliveries', COALESCE(v_on_time_deliveries, 0),
    'late_deliveries', COALESCE(v_late_deliveries, 0),
    'xp_earned', v_total_xp_earned,
    'xp_lost', v_total_xp_lost,
    'net_xp', v_net_xp,
    'on_time_rate', ROUND(v_on_time_rate, 1),
    'total_videos', COALESCE(v_total_videos, 0)
  );
END;
$function$;