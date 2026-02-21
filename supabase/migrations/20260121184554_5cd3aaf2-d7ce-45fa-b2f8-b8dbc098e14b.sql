-- Create trigger for video assignment notifications
CREATE TRIGGER on_video_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_video_assignment();

-- Also add trigger for video status changes
CREATE TRIGGER on_video_status_change
  AFTER UPDATE OF status ON public.videos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_video_status_change();