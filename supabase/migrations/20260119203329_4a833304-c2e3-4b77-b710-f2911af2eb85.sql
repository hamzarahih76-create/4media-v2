-- Fix RLS policy to be more restrictive (only service role can insert via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- The create_notification function is SECURITY DEFINER so it bypasses RLS
-- No direct INSERT policy needed for regular users