-- Enable realtime for video_feedback table so client messages show +1 badge in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_feedback;