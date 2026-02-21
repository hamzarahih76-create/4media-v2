-- Update video_status enum to include new statuses
-- First, let's update any existing statuses to the new format
UPDATE public.videos SET status = 'review_admin' WHERE status = 'in_review';

-- Remove priority column from videos table
ALTER TABLE public.videos DROP COLUMN IF EXISTS priority;

-- Create a function to automatically mark videos as late
CREATE OR REPLACE FUNCTION public.check_and_update_late_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.videos
  SET status = 'late', updated_at = now()
  WHERE status = 'active' 
    AND deadline IS NOT NULL 
    AND deadline < now();
END;
$$;

-- Create a trigger function to check late status on video read/update
CREATE OR REPLACE FUNCTION public.auto_update_late_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.deadline IS NOT NULL AND NEW.deadline < now() THEN
    NEW.status := 'late';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update late status on any update
DROP TRIGGER IF EXISTS check_late_status_trigger ON public.videos;
CREATE TRIGGER check_late_status_trigger
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_late_status();

-- Update the submit_video_for_review function to use review_admin status
CREATE OR REPLACE FUNCTION public.submit_video_for_review(p_delivery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Create new review link (for admin use only at this stage)
  INSERT INTO public.video_review_links (video_id, delivery_id)
  VALUES (v_video_id, p_delivery_id)
  RETURNING id, token INTO v_review_link_id, v_token;

  -- Update video status to review_admin (NOT review_client yet)
  UPDATE public.videos
  SET status = 'review_admin', updated_at = now()
  WHERE id = v_video_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_link_id', v_review_link_id,
    'token', v_token
  );
END;
$$;

-- Create function to send video to client (admin action)
CREATE OR REPLACE FUNCTION public.send_video_to_client(p_video_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_review_link_id UUID;
  v_token TEXT;
BEGIN
  -- Verify caller is admin or PM
  IF NOT public.is_admin_or_pm(auth.uid()) THEN
    RAISE EXCEPTION 'Only Admin or Project Manager can send videos to client';
  END IF;

  -- Get the active review link token
  SELECT id, token INTO v_review_link_id, v_token
  FROM public.video_review_links
  WHERE video_id = p_video_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_review_link_id IS NULL THEN
    RAISE EXCEPTION 'No active review link found for this video';
  END IF;

  -- Update video status to review_client
  UPDATE public.videos
  SET status = 'review_client', updated_at = now()
  WHERE id = p_video_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_link_id', v_review_link_id,
    'token', v_token
  );
END;
$$;