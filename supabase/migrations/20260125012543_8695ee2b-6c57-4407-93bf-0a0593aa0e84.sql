-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Enable realtime for video_deliveries table (for tracking new deliveries)
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_deliveries;

-- Enable realtime for task_deliveries table
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_deliveries;

-- Enable realtime for editor_stats table (for performance updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.editor_stats;