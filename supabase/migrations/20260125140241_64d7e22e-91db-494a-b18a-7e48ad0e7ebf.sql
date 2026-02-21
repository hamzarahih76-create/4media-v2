-- Supprimer les triggers en doublon qui causent les notifications en double

-- Supprimer le doublon pour notify_video_status_change
DROP TRIGGER IF EXISTS trigger_notify_video_status_change ON public.videos;

-- Supprimer le doublon pour notify_video_assignment  
DROP TRIGGER IF EXISTS trigger_notify_video_assignment ON public.videos;