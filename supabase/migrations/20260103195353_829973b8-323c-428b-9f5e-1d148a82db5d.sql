-- =====================================================
-- 4MEDIA XP & LEVEL SYSTEM - Complete Schema
-- =====================================================

-- 1. Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'project_manager', 'editor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create editor_rank enum
CREATE TYPE public.editor_rank AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- 3. Create xp_action_type enum for tracking XP changes
CREATE TYPE public.xp_action_type AS ENUM (
  'task_delivered',
  'on_time_bonus',
  'late_penalty',
  'revision_penalty',
  'quality_bonus',
  'urgent_bonus',
  'streak_bonus',
  'achievement_unlock',
  'manual_adjustment'
);

-- 4. User roles table (security-first approach)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Editor stats table (stores XP, level, rank, streak)
CREATE TABLE public.editor_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  rank editor_rank NOT NULL DEFAULT 'bronze',
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_videos_delivered INTEGER NOT NULL DEFAULT 0,
  total_on_time INTEGER NOT NULL DEFAULT 0,
  total_late INTEGER NOT NULL DEFAULT 0,
  total_revisions INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(2,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.editor_stats ENABLE ROW LEVEL SECURITY;

-- 6. XP transactions log (immutable audit trail)
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID, -- optional reference to task
  action_type xp_action_type NOT NULL,
  xp_amount INTEGER NOT NULL, -- positive or negative
  reason TEXT NOT NULL,
  validated_by UUID REFERENCES auth.users(id), -- PM/Admin who validated
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Achievements definitions
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- lucide icon name
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL, -- 'streak', 'deliveries', 'rating', 'level', 'on_time_rate'
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 8. Editor achievements (unlocked achievements)
CREATE TABLE public.editor_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (editor_id, achievement_id)
);

ALTER TABLE public.editor_achievements ENABLE ROW LEVEL SECURITY;

-- 9. Level thresholds configuration
CREATE TABLE public.level_config (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL,
  rank editor_rank NOT NULL,
  perks TEXT[], -- array of perks unlocked at this level
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.level_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or PM
CREATE OR REPLACE FUNCTION public.is_admin_or_pm(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'project_manager')
  )
$$;

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  calculated_level INTEGER;
BEGIN
  SELECT COALESCE(MAX(level), 1)
  INTO calculated_level
  FROM public.level_config
  WHERE xp_required <= xp_amount;
  
  RETURN calculated_level;
END;
$$;

-- Function to calculate rank from level
CREATE OR REPLACE FUNCTION public.calculate_rank_from_level(level_num INTEGER)
RETURNS editor_rank
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  calculated_rank editor_rank;
BEGIN
  SELECT COALESCE(rank, 'bronze')
  INTO calculated_rank
  FROM public.level_config
  WHERE level = level_num;
  
  RETURN COALESCE(calculated_rank, 'bronze');
END;
$$;

-- =====================================================
-- XP MANAGEMENT FUNCTIONS (Only callable by Admin/PM)
-- =====================================================

-- Grant XP to an editor (with validation)
CREATE OR REPLACE FUNCTION public.grant_xp(
  p_editor_id UUID,
  p_task_id UUID,
  p_action_type xp_action_type,
  p_xp_amount INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_new_rank editor_rank;
  v_old_level INTEGER;
BEGIN
  -- Get caller ID
  v_caller_id := auth.uid();
  
  -- Check if caller is Admin or PM
  IF NOT public.is_admin_or_pm(v_caller_id) THEN
    RAISE EXCEPTION 'Only Admin or Project Manager can grant XP';
  END IF;
  
  -- Get current level
  SELECT level INTO v_old_level
  FROM public.editor_stats
  WHERE user_id = p_editor_id;
  
  -- Insert XP transaction
  INSERT INTO public.xp_transactions (editor_id, task_id, action_type, xp_amount, reason, validated_by)
  VALUES (p_editor_id, p_task_id, p_action_type, p_xp_amount, p_reason, v_caller_id);
  
  -- Update editor stats
  UPDATE public.editor_stats
  SET 
    xp = GREATEST(0, xp + p_xp_amount), -- Never go below 0
    updated_at = now()
  WHERE user_id = p_editor_id
  RETURNING xp INTO v_new_xp;
  
  -- Calculate new level and rank
  v_new_level := public.calculate_level_from_xp(v_new_xp);
  v_new_rank := public.calculate_rank_from_level(v_new_level);
  
  -- Update level and rank if changed
  UPDATE public.editor_stats
  SET 
    level = v_new_level,
    rank = v_new_rank
  WHERE user_id = p_editor_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'new_rank', v_new_rank,
    'level_up', v_new_level > COALESCE(v_old_level, 1)
  );
END;
$$;

-- Complete task delivery (calculates all bonuses/penalties)
CREATE OR REPLACE FUNCTION public.complete_task_delivery(
  p_editor_id UUID,
  p_task_id UUID,
  p_base_xp INTEGER,
  p_is_on_time BOOLEAN,
  p_is_urgent BOOLEAN,
  p_revision_count INTEGER DEFAULT 0,
  p_quality_rating INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_total_xp INTEGER := p_base_xp;
  v_breakdown JSONB := '[]'::jsonb;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  
  -- Only Admin/PM can validate deliveries
  IF NOT public.is_admin_or_pm(v_caller_id) THEN
    RAISE EXCEPTION 'Only Admin or Project Manager can validate deliveries';
  END IF;
  
  -- Base XP for delivery
  v_breakdown := v_breakdown || jsonb_build_object('type', 'task_delivered', 'xp', p_base_xp);
  
  -- On-time bonus (+20%)
  IF p_is_on_time THEN
    v_total_xp := v_total_xp + ROUND(p_base_xp * 0.20);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'on_time_bonus', 'xp', ROUND(p_base_xp * 0.20));
  ELSE
    -- Late penalty (-30%)
    v_total_xp := v_total_xp - ROUND(p_base_xp * 0.30);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'late_penalty', 'xp', -ROUND(p_base_xp * 0.30));
  END IF;
  
  -- Urgent task bonus (+50%)
  IF p_is_urgent THEN
    v_total_xp := v_total_xp + ROUND(p_base_xp * 0.50);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'urgent_bonus', 'xp', ROUND(p_base_xp * 0.50));
  END IF;
  
  -- Revision penalties (-10% per revision after first)
  IF p_revision_count > 1 THEN
    v_total_xp := v_total_xp - ROUND(p_base_xp * 0.10 * (p_revision_count - 1));
    v_breakdown := v_breakdown || jsonb_build_object('type', 'revision_penalty', 'xp', -ROUND(p_base_xp * 0.10 * (p_revision_count - 1)));
  END IF;
  
  -- Quality bonus (5 stars = +25%)
  IF p_quality_rating = 5 THEN
    v_total_xp := v_total_xp + ROUND(p_base_xp * 0.25);
    v_breakdown := v_breakdown || jsonb_build_object('type', 'quality_bonus', 'xp', ROUND(p_base_xp * 0.25));
  END IF;
  
  -- Update delivery stats
  UPDATE public.editor_stats
  SET 
    total_videos_delivered = total_videos_delivered + 1,
    total_on_time = total_on_time + CASE WHEN p_is_on_time THEN 1 ELSE 0 END,
    total_late = total_late + CASE WHEN NOT p_is_on_time THEN 1 ELSE 0 END,
    total_revisions = total_revisions + p_revision_count,
    last_activity_date = CURRENT_DATE,
    streak_days = CASE 
      WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
      WHEN last_activity_date = CURRENT_DATE THEN streak_days
      ELSE 1
    END
  WHERE user_id = p_editor_id;
  
  -- Grant the XP
  v_result := public.grant_xp(
    p_editor_id,
    p_task_id,
    'task_delivered',
    v_total_xp,
    'Task delivery with bonuses/penalties'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'total_xp', v_total_xp,
    'breakdown', v_breakdown,
    'level_up', (v_result->>'level_up')::boolean,
    'new_level', (v_result->>'new_level')::integer
  );
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- User roles: Users can view their own role, Admins can manage
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Editor stats: Editors can view own stats, Admins/PMs can view all
CREATE POLICY "Editors can view own stats" ON public.editor_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and PMs can view all stats" ON public.editor_stats
  FOR SELECT USING (public.is_admin_or_pm(auth.uid()));

CREATE POLICY "Only system can modify stats" ON public.editor_stats
  FOR UPDATE USING (false); -- Stats modified via security definer functions only

CREATE POLICY "Create stats on signup" ON public.editor_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP transactions: Editors can view own, Admins/PMs can view all
CREATE POLICY "Editors can view own XP history" ON public.xp_transactions
  FOR SELECT USING (auth.uid() = editor_id);

CREATE POLICY "Admins and PMs can view all XP history" ON public.xp_transactions
  FOR SELECT USING (public.is_admin_or_pm(auth.uid()));

-- No direct insert/update - only via security definer functions
CREATE POLICY "No direct XP manipulation" ON public.xp_transactions
  FOR INSERT WITH CHECK (false);

-- Achievements: Everyone can view definitions
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage achievements" ON public.achievements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Editor achievements: Editors can view own, Admins can view all
CREATE POLICY "Editors can view own achievements" ON public.editor_achievements
  FOR SELECT USING (auth.uid() = editor_id);

CREATE POLICY "Admins can view all achievements" ON public.editor_achievements
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Level config: Everyone can view
CREATE POLICY "Anyone can view level config" ON public.level_config
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage level config" ON public.level_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SEED DATA: Level Configuration
-- =====================================================

INSERT INTO public.level_config (level, xp_required, rank, perks) VALUES
  (1, 0, 'bronze', ARRAY['Accès aux tâches standard']),
  (2, 500, 'bronze', ARRAY['Badge Bronze visible']),
  (3, 1200, 'bronze', ARRAY['Historique des performances']),
  (4, 2000, 'silver', ARRAY['Accès aux tâches prioritaires']),
  (5, 3000, 'silver', ARRAY['Badge Silver visible', 'Bonus streak x1.1']),
  (6, 4500, 'silver', ARRAY['Visibilité sur les projets VIP']),
  (7, 6500, 'gold', ARRAY['Accès aux clients premium']),
  (8, 9000, 'gold', ARRAY['Badge Gold visible', 'Bonus streak x1.2']),
  (9, 12000, 'gold', ARRAY['Choix des projets']),
  (10, 16000, 'platinum', ARRAY['Tâches urgentes en priorité']),
  (11, 21000, 'platinum', ARRAY['Badge Platinum visible', 'Bonus streak x1.3']),
  (12, 27000, 'platinum', ARRAY['Mentorat des nouveaux']),
  (13, 35000, 'diamond', ARRAY['Accès complet', 'Bonus streak x1.5']),
  (14, 45000, 'diamond', ARRAY['Badge Diamond visible']),
  (15, 60000, 'diamond', ARRAY['Statut Elite', 'Tous les privilèges']);

-- =====================================================
-- SEED DATA: Achievements
-- =====================================================

INSERT INTO public.achievements (code, name, description, icon, rarity, xp_reward, requirement_type, requirement_value) VALUES
  ('first_delivery', 'Première Livraison', 'Livrer votre première vidéo', 'Video', 'common', 50, 'deliveries', 1),
  ('speed_demon', 'Speed Demon', 'Livrer 5 vidéos en un jour', 'Zap', 'rare', 200, 'daily_deliveries', 5),
  ('perfectionist', 'Perfectionniste', 'Obtenir 5 étoiles 10 fois', 'Trophy', 'epic', 500, 'five_star_count', 10),
  ('sniper', 'Sniper', '100% à l''heure ce mois', 'Target', 'rare', 300, 'on_time_rate', 100),
  ('on_fire', 'En feu', 'Série de 30 jours consécutifs', 'Flame', 'epic', 750, 'streak', 30),
  ('mentor', 'Mentor', 'Former 3 nouveaux éditeurs', 'Award', 'rare', 400, 'mentored', 3),
  ('legend', 'Légende', 'Atteindre le rang Diamond', 'Crown', 'legendary', 1000, 'level', 13),
  ('rocket', 'Fusée', 'Livrer 100 vidéos', 'Rocket', 'common', 150, 'deliveries', 100),
  ('client_favorite', 'Client Favori', 'Note 5★ de 5 clients différents', 'Heart', 'epic', 600, 'unique_five_star_clients', 5),
  ('early_bird', 'Lève-tôt', 'Livrer avant deadline 20 fois', 'Clock', 'rare', 250, 'early_deliveries', 20),
  ('consistency_king', 'Roi de la Régularité', 'Série de 7 jours', 'Flame', 'common', 100, 'streak', 7),
  ('centurion', 'Centurion', 'Atteindre le niveau 10', 'Star', 'epic', 500, 'level', 10);

-- =====================================================
-- TRIGGER: Auto-create editor_stats on user signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create editor stats
  INSERT INTO public.editor_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default editor role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'editor')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_editor
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_editor();

-- =====================================================
-- INDEX for performance
-- =====================================================

CREATE INDEX idx_xp_transactions_editor ON public.xp_transactions(editor_id);
CREATE INDEX idx_xp_transactions_date ON public.xp_transactions(created_at DESC);
CREATE INDEX idx_editor_stats_level ON public.editor_stats(level DESC);
CREATE INDEX idx_editor_stats_xp ON public.editor_stats(xp DESC);