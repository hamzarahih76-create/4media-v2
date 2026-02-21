-- Policy pour permettre aux clients de voir les vidéos via un lien de revue actif
CREATE POLICY "Anyone can view videos via active review link"
ON public.videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_review_links vrl
    WHERE vrl.video_id = videos.id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
);

-- Policy pour permettre aux clients de voir les tasks via un lien de revue actif
CREATE POLICY "Anyone can view tasks via active video review link"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_review_links vrl
    JOIN videos v ON v.id = vrl.video_id
    WHERE v.task_id = tasks.id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
);

-- Policy pour permettre aux clients de voir les deliveries via un lien de revue actif
CREATE POLICY "Anyone can view video deliveries via active review link"
ON public.video_deliveries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM video_review_links vrl
    WHERE vrl.video_id = video_deliveries.video_id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
);