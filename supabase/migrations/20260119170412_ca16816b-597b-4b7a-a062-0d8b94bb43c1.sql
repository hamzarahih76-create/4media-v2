-- Allow anonymous users (clients via review link) to insert feedback
CREATE POLICY "Anyone can submit video feedback via review link"
ON public.video_feedback
FOR INSERT
WITH CHECK (
  -- Verify the review link exists and is active
  EXISTS (
    SELECT 1 FROM public.video_review_links vrl
    WHERE vrl.id = review_link_id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
);

-- Allow anonymous users to insert client feedback via review link
CREATE POLICY "Anyone can submit client feedback via review link"
ON public.client_feedback
FOR INSERT
WITH CHECK (
  -- Verify the review link exists and is active
  EXISTS (
    SELECT 1 FROM public.review_links rl
    WHERE rl.id = review_link_id
    AND rl.is_active = true
    AND rl.expires_at > now()
  )
);

-- Allow anonymous users to update video status via review link
CREATE POLICY "Anyone can update video status via review"
ON public.videos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.video_review_links vrl
    WHERE vrl.video_id = videos.id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
);

-- Allow anonymous users to deactivate review links they're using
CREATE POLICY "Anyone can deactivate used video review links"
ON public.video_review_links
FOR UPDATE
USING (is_active = true AND expires_at > now());

-- Allow anonymous users to view and update review links for counter
CREATE POLICY "Anyone can view active video review links"
ON public.video_review_links
FOR SELECT
USING (is_active = true AND expires_at > now());

-- Allow anonymous users to update task review links  
CREATE POLICY "Anyone can deactivate used review links"
ON public.review_links
FOR UPDATE
USING (is_active = true AND expires_at > now());

-- Allow anonymous users to view active review links
CREATE POLICY "Anyone can view active review links"
ON public.review_links
FOR SELECT
USING (is_active = true AND expires_at > now());

-- Allow anonymous to update task status via review
CREATE POLICY "Anyone can update task status via review"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.review_links rl
    WHERE rl.task_id = tasks.id
    AND rl.is_active = true
    AND rl.expires_at > now()
  )
);