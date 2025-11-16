-- Fix RLS policies for player_stats to work with custom auth
-- This allows stats to be created/read even when auth.uid() is NULL (custom auth)

-- Drop existing policies
DROP POLICY IF EXISTS "player_stats_select_all" ON public.player_stats;
DROP POLICY IF EXISTS "player_stats_update_own" ON public.player_stats;
DROP POLICY IF EXISTS "player_stats_insert_own" ON public.player_stats;

-- Allow all users to view all player stats (for leaderboards)
CREATE POLICY "player_stats_select_all"
ON public.player_stats
FOR SELECT
USING (true);

-- Allow users to update their own stats
-- Note: With custom auth, this might not work via RLS, so API routes use admin client
CREATE POLICY "player_stats_update_own"
ON public.player_stats
FOR UPDATE
USING (true)  -- Allow all updates, app logic handles authorization
WITH CHECK (true);

-- Allow stats to be inserted for any user_id
-- This is needed because custom auth doesn't set auth.uid()
-- The API route (using admin client) will handle authorization
CREATE POLICY "player_stats_insert_any"
ON public.player_stats
FOR INSERT
WITH CHECK (true);  -- Allow all inserts, app logic handles authorization

-- Also ensure profiles table allows inserts
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_any"
ON public.profiles
FOR INSERT
WITH CHECK (true);  -- Allow all inserts, app logic handles authorization

