-- ============================================================================
-- DAILY STREAK TRACKING MIGRATION
-- ============================================================================
-- Adds daily streak tracking to player_stats table
-- Tracks consecutive days of activity with a 48-hour grace period
-- ============================================================================

-- Add streak tracking columns to player_stats
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date DATE,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.player_stats.daily_streak IS 'Current consecutive days of activity (resets after 48 hours of inactivity)';
COMMENT ON COLUMN public.player_stats.last_activity_date IS 'Date of last quiz session completion (YYYY-MM-DD)';
COMMENT ON COLUMN public.player_stats.longest_streak IS 'Best streak ever achieved by the user';

-- Create index for faster streak queries
CREATE INDEX IF NOT EXISTS idx_player_stats_last_activity 
  ON public.player_stats(last_activity_date) 
  WHERE last_activity_date IS NOT NULL;

-- ============================================================================
-- STREAK CALCULATION FUNCTION
-- ============================================================================
-- This function calculates the user's daily streak based on quiz session activity
-- Grace period: 48 hours (2 days) - streak only breaks after 2 full days of inactivity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_daily_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_activity_date DATE,
  is_active_today BOOLEAN,
  days_until_break INTEGER
) AS $$
#variable_conflict use_column
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_activity DATE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_two_days_ago DATE := CURRENT_DATE - INTERVAL '2 days';
  v_has_activity_today BOOLEAN := false;
  v_has_activity_yesterday BOOLEAN := false;
  v_has_activity_two_days_ago BOOLEAN := false;
  v_days_since_last_activity INTEGER;
BEGIN
  -- Get current stats
  SELECT 
    COALESCE(daily_streak, 0),
    COALESCE(longest_streak, 0),
    last_activity_date
  INTO 
    v_current_streak,
    v_longest_streak,
    v_last_activity
  FROM public.player_stats
  WHERE user_id = p_user_id;

  -- Check for activity today (any completed quiz session)
  SELECT EXISTS (
    SELECT 1
    FROM public.game_results gr
    INNER JOIN public.quiz_sessions qs ON qs.id = gr.session_id
    WHERE gr.user_id = p_user_id
    AND DATE(qs.ended_at) = v_today
  ) INTO v_has_activity_today;

  -- Check for activity yesterday
  SELECT EXISTS (
    SELECT 1
    FROM public.game_results gr
    INNER JOIN public.quiz_sessions qs ON qs.id = gr.session_id
    WHERE gr.user_id = p_user_id
    AND DATE(qs.ended_at) = v_yesterday
  ) INTO v_has_activity_yesterday;

  -- Check for activity two days ago
  SELECT EXISTS (
    SELECT 1
    FROM public.game_results gr
    INNER JOIN public.quiz_sessions qs ON qs.id = gr.session_id
    WHERE gr.user_id = p_user_id
    AND DATE(qs.ended_at) = v_two_days_ago
  ) INTO v_has_activity_two_days_ago;

  -- Calculate days since last activity
  IF v_last_activity IS NOT NULL THEN
    v_days_since_last_activity := v_today - v_last_activity;
  ELSE
    v_days_since_last_activity := 999; -- No activity ever
  END IF;

  -- Calculate new streak based on activity
  IF v_has_activity_today THEN
    -- User was active today
    IF v_last_activity IS NULL THEN
      -- First activity ever
      v_current_streak := 1;
    ELSIF v_last_activity = v_today THEN
      -- Already counted today, keep current streak (don't increment again)
      -- v_current_streak stays the same
    ELSIF v_last_activity = v_yesterday THEN
      -- Consecutive day, increment streak
      v_current_streak := v_current_streak + 1;
    ELSIF v_last_activity = v_two_days_ago AND NOT v_has_activity_yesterday THEN
      -- Missed yesterday but active today and two days ago - grace period applies
      -- Keep streak going (don't reset)
      v_current_streak := v_current_streak + 1;
    ELSIF v_days_since_last_activity > 2 THEN
      -- More than 2 days since last activity - streak broken
      v_current_streak := 1;
    ELSE
      -- Within grace period (1-2 days), keep streak
      v_current_streak := v_current_streak + 1;
    END IF;
  ELSE
    -- No activity today
    -- Check if streak should be broken (more than 2 days since last activity)
    IF v_days_since_last_activity > 2 THEN
      v_current_streak := 0;
    END IF;
    -- If within grace period (0-2 days), keep streak as is
  END IF;

  -- Update longest streak if current is higher
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update player_stats
  -- Fix for "column reference longest_streak is ambiguous" error
  -- The RETURN TABLE column 'longest_streak' conflicts with table column in UPDATE
  -- Solution: Use #variable_conflict use_column directive and explicit table qualification
  -- The directive tells PostgreSQL to prefer table columns over RETURN TABLE columns
  UPDATE public.player_stats
  SET 
    daily_streak = v_current_streak,
    last_activity_date = CASE 
      WHEN v_has_activity_today THEN v_today 
      ELSE v_last_activity 
    END,
    longest_streak = v_longest_streak,
    updated_at = NOW()
  WHERE public.player_stats.user_id = p_user_id;

  -- Calculate days until streak breaks (if no activity today)
  IF v_has_activity_today THEN
    v_days_since_last_activity := 0;
  ELSIF v_last_activity IS NOT NULL THEN
    v_days_since_last_activity := v_today - v_last_activity;
  ELSE
    v_days_since_last_activity := 999;
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    v_current_streak,
    v_longest_streak,
    CASE WHEN v_has_activity_today THEN v_today ELSE v_last_activity END,
    v_has_activity_today,
    GREATEST(0, 2 - v_days_since_last_activity) -- Days remaining in grace period
  ;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION public.calculate_daily_streak IS 'Calculates and updates daily streak with 48-hour grace period. Streak only breaks after 2 full days of inactivity.';


