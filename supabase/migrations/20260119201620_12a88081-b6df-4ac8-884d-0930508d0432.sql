-- Create community_messages table for real-time chat
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_rank TEXT DEFAULT 'bronze',
  channel TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read messages
CREATE POLICY "Anyone can read community messages" 
ON public.community_messages 
FOR SELECT 
USING (true);

-- Policy: Authenticated users can insert their own messages
CREATE POLICY "Authenticated users can insert messages" 
ON public.community_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" 
ON public.community_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_community_messages_channel ON public.community_messages(channel);
CREATE INDEX idx_community_messages_created_at ON public.community_messages(created_at DESC);

-- Enable realtime for community_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;