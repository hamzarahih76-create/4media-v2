-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "Anyone can view videos via active review link" ON public.videos;
DROP POLICY IF EXISTS "Anyone can view tasks via active video review link" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can view video deliveries via active review link" ON public.video_deliveries;

-- Créer une fonction security definer pour vérifier les liens de revue actifs
CREATE OR REPLACE FUNCTION public.has_active_review_link(p_video_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM video_review_links
    WHERE video_id = p_video_id
    AND is_active = true
    AND expires_at > now()
  )
$$;

-- Fonction pour vérifier si une task a un lien de revue actif via ses vidéos
CREATE OR REPLACE FUNCTION public.task_has_active_review_link(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM video_review_links vrl
    JOIN videos v ON v.id = vrl.video_id
    WHERE v.task_id = p_task_id
    AND vrl.is_active = true
    AND vrl.expires_at > now()
  )
$$;

-- Recréer les policies avec les fonctions security definer
CREATE POLICY "Anyone can view videos via active review link"
ON public.videos
FOR SELECT
USING (public.has_active_review_link(id));

CREATE POLICY "Anyone can view tasks via active video review link"
ON public.tasks
FOR SELECT
USING (public.task_has_active_review_link(id));

CREATE POLICY "Anyone can view video deliveries via active review link"
ON public.video_deliveries
FOR SELECT
USING (public.has_active_review_link(video_id));