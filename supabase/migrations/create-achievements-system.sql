-- ============================================================================
-- ACHIEVEMENTS SYSTEM MIGRATION
-- ============================================================================
-- Creates a comprehensive achievements/badges system for Brain Battle
-- Tracks user achievements, progress, and unlocks
-- ============================================================================

-- ============================================================================
-- 1. ACHIEVEMENT DEFINITIONS TABLE
-- ============================================================================
-- Stores all available achievements in the system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'first_win', 'streak_7_days'
  name VARCHAR(100) NOT NULL, -- Display name: "First Win"
  description TEXT NOT NULL, -- "Win your first quiz battle"
  icon VARCHAR(50) NOT NULL, -- Icon identifier: 'trophy', 'flame', 'target'
  category VARCHAR(50) NOT NULL, -- 'wins', 'streaks', 'accuracy', 'activity', 'special'
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER DEFAULT 0, -- XP bonus for unlocking
  requirement_type VARCHAR(50) NOT NULL, -- 'win_count', 'streak_days', 'accuracy_threshold', 'questions_answered', 'level_reached', 'custom'
  requirement_value JSONB, -- Flexible requirement data: {"count": 1}, {"days": 7}, {"threshold": 80}, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for active achievements
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_active 
  ON public.achievement_definitions(is_active) 
  WHERE is_active = true;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category 
  ON public.achievement_definitions(category);

-- ============================================================================
-- 2. USER ACHIEVEMENTS TABLE
-- ============================================================================
-- Tracks which achievements each user has earned
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code VARCHAR(50) NOT NULL REFERENCES public.achievement_definitions(code) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}'::jsonb, -- Track progress toward achievement (e.g., {"current": 5, "target": 10})
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 0, -- XP reward received
  UNIQUE(user_id, achievement_code)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_achievements_user_id 
  ON public.achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_achievements_code 
  ON public.achievements(achievement_code);

CREATE INDEX IF NOT EXISTS idx_achievements_earned_at 
  ON public.achievements(earned_at DESC);

-- ============================================================================
-- 3. INSERT ACHIEVEMENT DEFINITIONS
-- ============================================================================
-- Pre-populate with all available achievements
-- ============================================================================

-- WIN-BASED ACHIEVEMENTS
INSERT INTO public.achievement_definitions (code, name, description, icon, category, rarity, xp_reward, requirement_type, requirement_value) VALUES
('first_win', 'First Victory', 'Win your first quiz battle', 'trophy', 'wins', 'common', 50, 'win_count', '{"count": 1}'),
('decade_warrior', 'Decade Warrior', 'Win 10 quiz battles', 'star', 'wins', 'rare', 200, 'win_count', '{"count": 10}'),
('century_champion', 'Century Champion', 'Win 100 quiz battles', 'crown', 'wins', 'epic', 1000, 'win_count', '{"count": 100}'),
('undefeated', 'Undefeated', 'Win 5 battles in a row', 'shield', 'wins', 'rare', 300, 'win_streak', '{"count": 5}'),
('unbeatable', 'Unbeatable', 'Win 10 battles in a row', 'crown', 'wins', 'epic', 750, 'win_streak', '{"count": 10}'),

-- STREAK-BASED ACHIEVEMENTS (Daily Activity)
('streak_3_days', 'Consistency Starter', 'Maintain a 3-day study streak', 'flame', 'streaks', 'common', 100, 'daily_streak', '{"days": 3}'),
('streak_7_days', 'Week Warrior', 'Maintain a 7-day study streak', 'flame', 'streaks', 'rare', 250, 'daily_streak', '{"days": 7}'),
('streak_14_days', 'Fortnight Fighter', 'Maintain a 14-day study streak', 'flame', 'streaks', 'rare', 500, 'daily_streak', '{"days": 14}'),
('streak_30_days', 'Monthly Master', 'Maintain a 30-day study streak', 'flame', 'streaks', 'epic', 1000, 'daily_streak', '{"days": 30}'),
('streak_100_days', 'Centurion', 'Maintain a 100-day study streak', 'flame', 'streaks', 'legendary', 5000, 'daily_streak', '{"days": 100}'),

-- ACCURACY-BASED ACHIEVEMENTS
('sharp_shooter', 'Sharp Shooter', 'Achieve 80% accuracy or higher', 'target', 'accuracy', 'rare', 200, 'accuracy_threshold', '{"threshold": 80}'),
('marksman', 'Marksman', 'Achieve 90% accuracy or higher', 'target', 'accuracy', 'epic', 500, 'accuracy_threshold', '{"threshold": 90}'),
('perfect_score', 'Perfect Score', 'Get 100% on a quiz', 'star', 'accuracy', 'epic', 750, 'perfect_score', '{"count": 1}'),
('perfectionist', 'Perfectionist', 'Get 100% on 5 quizzes', 'crown', 'accuracy', 'legendary', 2000, 'perfect_score', '{"count": 5}'),

-- ACTIVITY-BASED ACHIEVEMENTS
('knowledge_seeker', 'Knowledge Seeker', 'Answer 100 questions', 'book', 'activity', 'common', 150, 'questions_answered', '{"count": 100}'),
('scholar', 'Scholar', 'Answer 500 questions', 'book', 'activity', 'rare', 500, 'questions_answered', '{"count": 500}'),
('master_student', 'Master Student', 'Answer 1,000 questions', 'graduation-cap', 'activity', 'epic', 1500, 'questions_answered', '{"count": 1000}'),
('quiz_master', 'Quiz Master', 'Complete 50 quiz sessions', 'trophy', 'activity', 'rare', 400, 'sessions_completed', '{"count": 50}'),
('dedicated_learner', 'Dedicated Learner', 'Complete 200 quiz sessions', 'crown', 'activity', 'epic', 2000, 'sessions_completed', '{"count": 200}'),

-- LEVEL-BASED ACHIEVEMENTS
('level_10', 'Rising Star', 'Reach level 10', 'star', 'level', 'common', 200, 'level_reached', '{"level": 10}'),
('level_25', 'Experienced', 'Reach level 25', 'star', 'level', 'rare', 500, 'level_reached', '{"level": 25}'),
('level_50', 'Veteran', 'Reach level 50', 'crown', 'level', 'epic', 1500, 'level_reached', '{"level": 50}'),
('level_100', 'Legend', 'Reach level 100', 'crown', 'level', 'legendary', 5000, 'level_reached', '{"level": 100}'),

-- SPECIAL ACHIEVEMENTS
('first_quiz', 'First Steps', 'Complete your first quiz', 'rocket', 'special', 'common', 25, 'sessions_completed', '{"count": 1}'),
('speed_demon', 'Speed Demon', 'Answer a question in under 5 seconds', 'zap', 'special', 'rare', 150, 'speed_answer', '{"seconds": 5}'),
('social_butterfly', 'Social Butterfly', 'Join 10 multiplayer rooms', 'users', 'special', 'rare', 300, 'rooms_joined', '{"count": 10}'),
('team_player', 'Team Player', 'Win 5 multiplayer battles', 'users', 'special', 'epic', 600, 'multiplayer_wins', '{"count": 5}'),
('early_adopter', 'Early Adopter', 'Join Brain Battle in the first month', 'sparkles', 'special', 'rare', 500, 'account_age', '{"days": 30}')

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. FUNCTION TO CHECK AND UNLOCK ACHIEVEMENTS
-- ============================================================================
-- Automatically checks if user qualifies for achievements based on stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(
  p_user_id UUID
)
RETURNS TABLE (
  unlocked_achievements JSONB
) AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_unlocked JSONB := '[]'::jsonb;
  v_qualifies BOOLEAN;
  v_progress JSONB;
BEGIN
  -- Get current user stats
  SELECT 
    COALESCE(total_wins, 0) as total_wins,
    COALESCE(win_streak, 0) as win_streak,
    COALESCE(daily_streak, 0) as daily_streak,
    COALESCE(accuracy, 0) as accuracy,
    COALESCE(total_questions_answered, 0) as total_questions_answered,
    COALESCE(total_games, 0) as total_games,
    COALESCE(level, 1) as level
  INTO v_stats
  FROM public.player_stats
  WHERE user_id = p_user_id;

  -- If no stats found, return empty
  IF v_stats IS NULL THEN
    RETURN QUERY SELECT '[]'::jsonb;
    RETURN;
  END IF;

  -- Check all active achievements
  FOR v_achievement IN 
    SELECT * FROM public.achievement_definitions WHERE is_active = true
  LOOP
    -- Skip if user already has this achievement
    IF EXISTS (
      SELECT 1 FROM public.achievements 
      WHERE user_id = p_user_id AND achievement_code = v_achievement.code
    ) THEN
      CONTINUE;
    END IF;

    -- Check if user qualifies based on requirement type
    v_qualifies := false;
    v_progress := '{}'::jsonb;

    CASE v_achievement.requirement_type
      WHEN 'win_count' THEN
        IF v_stats.total_wins >= (v_achievement.requirement_value->>'count')::INTEGER THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.total_wins, 'target', (v_achievement.requirement_value->>'count')::INTEGER);
        END IF;
      
      WHEN 'win_streak' THEN
        IF v_stats.win_streak >= (v_achievement.requirement_value->>'count')::INTEGER THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.win_streak, 'target', (v_achievement.requirement_value->>'count')::INTEGER);
        END IF;
      
      WHEN 'daily_streak' THEN
        IF v_stats.daily_streak >= (v_achievement.requirement_value->>'days')::INTEGER THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.daily_streak, 'target', (v_achievement.requirement_value->>'days')::INTEGER);
        END IF;
      
      WHEN 'accuracy_threshold' THEN
        IF v_stats.accuracy >= (v_achievement.requirement_value->>'threshold')::NUMERIC THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.accuracy, 'target', (v_achievement.requirement_value->>'threshold')::NUMERIC);
        END IF;
      
      WHEN 'questions_answered' THEN
        IF v_stats.total_questions_answered >= (v_achievement.requirement_value->>'count')::INTEGER THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.total_questions_answered, 'target', (v_achievement.requirement_value->>'count')::INTEGER);
        END IF;
      
      WHEN 'sessions_completed' THEN
        IF v_stats.total_games >= (v_achievement.requirement_value->>'count')::INTEGER THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.total_games, 'target', (v_achievement.requirement_value->>'count')::INTEGER);
        END IF;
      
      WHEN 'level_reached' THEN
        IF v_stats.level >= (v_achievement.requirement_value->>'level')::INTEGER THEN
          v_qualifies := true;
          v_progress := jsonb_build_object('current', v_stats.level, 'target', (v_achievement.requirement_value->>'level')::INTEGER);
        END IF;
      
      -- Custom achievements (perfect_score, speed_answer, etc.) are handled in application code
      ELSE
        -- Skip custom achievements - they're handled in application logic
        CONTINUE;
    END CASE;

    -- If user qualifies, unlock the achievement
    IF v_qualifies THEN
      INSERT INTO public.achievements (
        user_id,
        achievement_code,
        progress,
        xp_earned
      ) VALUES (
        p_user_id,
        v_achievement.code,
        v_progress,
        v_achievement.xp_reward
      )
      ON CONFLICT (user_id, achievement_code) DO NOTHING;

      -- Add to unlocked list
      v_unlocked := v_unlocked || jsonb_build_array(
        jsonb_build_object(
          'code', v_achievement.code,
          'name', v_achievement.name,
          'description', v_achievement.description,
          'icon', v_achievement.icon,
          'rarity', v_achievement.rarity,
          'xp_reward', v_achievement.xp_reward
        )
      );

      -- Award XP bonus if applicable
      IF v_achievement.xp_reward > 0 THEN
        UPDATE public.player_stats
        SET xp = xp + v_achievement.xp_reward,
            updated_at = NOW()
        WHERE user_id = p_user_id;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_unlocked;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.check_and_unlock_achievements IS 'Checks user stats against achievement requirements and unlocks qualifying achievements. Returns list of newly unlocked achievements.';

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "achievement_definitions_select_all" ON public.achievement_definitions;
DROP POLICY IF EXISTS "achievements_select_own" ON public.achievements;
DROP POLICY IF EXISTS "achievements_insert_own" ON public.achievements;

-- Achievement definitions: everyone can read
CREATE POLICY "achievement_definitions_select_all"
  ON public.achievement_definitions
  FOR SELECT
  USING (true);

-- User achievements: users can only see their own
CREATE POLICY "achievements_select_own"
  ON public.achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "achievements_insert_own"
  ON public.achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.achievement_definitions IS 'Defines all available achievements in the system';
COMMENT ON TABLE public.achievements IS 'Tracks which achievements each user has earned';
COMMENT ON COLUMN public.achievement_definitions.code IS 'Unique identifier for the achievement (e.g., first_win, streak_7_days)';
COMMENT ON COLUMN public.achievement_definitions.requirement_type IS 'Type of requirement: win_count, streak_days, accuracy_threshold, etc.';
COMMENT ON COLUMN public.achievement_definitions.requirement_value IS 'JSONB containing requirement parameters (e.g., {"count": 10})';
COMMENT ON COLUMN public.achievements.progress IS 'Progress tracking data (e.g., {"current": 5, "target": 10})';

