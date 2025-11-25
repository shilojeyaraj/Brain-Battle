-- Add diagram generation tracking to player_stats
-- Free tier: 3 trial diagrams (one-time) + 2 per month
-- Pro tier: Unlimited

ALTER TABLE public.player_stats 
  ADD COLUMN IF NOT EXISTS trial_quiz_diagrams_remaining INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS quiz_diagrams_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_used_trial_quiz_diagrams BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_quiz_diagram_reset_date DATE;

-- Set default values for existing users
UPDATE public.player_stats
SET 
  trial_quiz_diagrams_remaining = 3,
  quiz_diagrams_this_month = 0,
  has_used_trial_quiz_diagrams = false,
  last_quiz_diagram_reset_date = NULL
WHERE trial_quiz_diagrams_remaining IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.player_stats.trial_quiz_diagrams_remaining IS 'One-time trial: 3 AI-generated quiz diagrams for free users';
COMMENT ON COLUMN public.player_stats.quiz_diagrams_this_month IS 'Monthly count of AI-generated quiz diagrams (resets on 1st of month)';
COMMENT ON COLUMN public.player_stats.has_used_trial_quiz_diagrams IS 'Whether user has used their one-time trial diagrams';
COMMENT ON COLUMN public.player_stats.last_quiz_diagram_reset_date IS 'Last date monthly quota was reset';

