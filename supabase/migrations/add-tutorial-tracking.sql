-- Add tutorial_completed field to profiles table
-- This tracks whether a user has completed the dashboard tutorial
-- Tutorial should only show for new users on first signup, not on subsequent logins

-- Add column to profiles table (if it doesn't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tutorial_completed 
ON public.profiles(tutorial_completed) 
WHERE tutorial_completed = TRUE;

-- Update existing users to have tutorial_completed = TRUE (they've been using the app)
-- This ensures existing users don't see the tutorial on next login
UPDATE public.profiles 
SET tutorial_completed = TRUE 
WHERE tutorial_completed IS NULL OR tutorial_completed = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.tutorial_completed IS 
'Whether the user has completed the dashboard tutorial. New users start with FALSE, existing users are set to TRUE.';

