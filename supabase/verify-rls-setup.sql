-- ============================================================================
-- VERIFY RLS SETUP FOR SINGLEPLAYER GAMES
-- ============================================================================
-- This script checks the current state of RLS policies to ensure
-- singleplayer games are properly configured
-- ============================================================================

-- Check if helper function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'is_room_member';

-- Check all policies for tables that need singleplayer support
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies
WHERE tablename IN ('quiz_sessions', 'questions', 'player_answers', 'game_results', 'profiles')
ORDER BY tablename, policyname, cmd;

-- Check if RLS is enabled on required tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('quiz_sessions', 'questions', 'player_answers', 'game_results', 'profiles', 'player_stats')
ORDER BY tablename;

-- Check for any policies that might block singleplayer (room_id IS NULL)
-- by looking for policies that don't handle NULL room_id
SELECT 
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename IN ('quiz_sessions', 'questions', 'player_answers', 'game_results')
AND cmd = 'INSERT'
AND (
  with_check NOT LIKE '%room_id IS NULL%'
  OR with_check IS NULL
)
ORDER BY tablename, policyname;

