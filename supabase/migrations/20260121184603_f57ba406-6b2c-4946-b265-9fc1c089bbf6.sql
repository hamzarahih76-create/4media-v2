-- Create function to trigger email sending via webhook
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only send email if requires_email is true in metadata
  IF NEW.metadata IS NOT NULL AND (NEW.metadata->>'requires_email')::boolean = true THEN
    -- Call the Edge Function to send email
    -- This is done via pg_net extension if available, otherwise we rely on client-side triggering
    -- For now, we mark this notification as needing email processing
    -- The client or a cron job can pick this up
    NULL; -- Placeholder for pg_net call
  END IF;
  
  RETURN NEW;
END;
$function$;