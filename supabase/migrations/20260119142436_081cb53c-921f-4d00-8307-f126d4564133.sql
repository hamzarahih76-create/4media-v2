-- Function to submit video delivery for review
CREATE OR REPLACE FUNCTION public.submit_video_for_review(p_delivery_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_video_id UUID;
  v_review_link_id UUID;
  v_token TEXT;
BEGIN
  -- Get video_id from delivery
  SELECT video_id INTO v_video_id
  FROM public.video_deliveries
  WHERE id = p_delivery_id;

  IF v_video_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  -- Deactivate previous review links for this video
  UPDATE public.video_review_links
  SET is_active = false
  WHERE video_id = v_video_id AND is_active = true;

  -- Create new review link
  INSERT INTO public.video_review_links (video_id, delivery_id)
  VALUES (v_video_id, p_delivery_id)
  RETURNING id, token INTO v_review_link_id, v_token;

  -- Update video status to in_review
  UPDATE public.videos
  SET status = 'in_review', updated_at = now()
  WHERE id = v_video_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_link_id', v_review_link_id,
    'token', v_token
  );
END;
$function$;