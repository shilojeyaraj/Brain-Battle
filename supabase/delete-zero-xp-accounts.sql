-- ============================================================================
-- DELETE ALL ACCOUNTS WITH 0 XP
-- ============================================================================
-- ⚠️ WARNING: This will permanently delete all user accounts with 0 XP!
-- This includes all their data: profiles, stats, game results, etc.
--
-- Use this to clean up test accounts.
-- ============================================================================

-- Step 1: Preview - Show users that will be deleted (for review)
SELECT 
  u.id,
  u.username,
  u.email,
  u.created_at,
  COALESCE(ps.xp, 0) as xp,
  COALESCE(ps.total_games, 0) as total_games,
  COALESCE(ps.total_wins, 0) as total_wins
FROM public.users u
LEFT JOIN public.player_stats ps ON ps.user_id = u.id
WHERE COALESCE(ps.xp, 0) = 0
ORDER BY u.created_at DESC;

-- Step 2: Count how many will be deleted
DO $$
DECLARE
  zero_xp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO zero_xp_count
  FROM public.users u
  LEFT JOIN public.player_stats ps ON ps.user_id = u.id
  WHERE COALESCE(ps.xp, 0) = 0;
  
  RAISE NOTICE '📊 Found % accounts with 0 XP to delete', zero_xp_count;
END $$;

-- Step 3: Delete users with 0 XP
-- Note: Due to CASCADE constraints, deleting from users table will automatically delete:
--   - player_stats (via user_id foreign key)
--   - profiles (via user_id foreign key)
--   - game_results (via user_id foreign key)
--   - player_answers (via user_id foreign key)
--   - documents (via uploaded_by foreign key)
--   - quiz_sessions (via user_id foreign key)
--   - room_members (via user_id foreign key)
--   - rooms (via owner_id foreign key)
--   - achievements (via user_id foreign key)
--   - user_study_notes (via user_id foreign key)
--   - user_sessions (via user_id foreign key)
--   - And other related data

DELETE FROM public.users
WHERE id IN (
  SELECT u.id
  FROM public.users u
  LEFT JOIN public.player_stats ps ON ps.user_id = u.id
  WHERE COALESCE(ps.xp, 0) = 0
);

-- Step 4: Verify deletion
DO $$
DECLARE
  remaining_count INTEGER;
  total_users INTEGER;
BEGIN
  -- Count remaining users with 0 XP
  SELECT COUNT(*) INTO remaining_count
  FROM public.users u
  LEFT JOIN public.player_stats ps ON ps.user_id = u.id
  WHERE COALESCE(ps.xp, 0) = 0;
  
  -- Get total users remaining
  SELECT COUNT(*) INTO total_users FROM public.users;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE '✅ Successfully deleted all accounts with 0 XP!';
    RAISE NOTICE '📊 Remaining users in database: %', total_users;
  ELSE
    RAISE NOTICE '⚠️ Warning: % accounts with 0 XP still remain', remaining_count;
    RAISE NOTICE '📊 Total users remaining: %', total_users;
  END IF;
END $$;

-- Step 5: Show summary of remaining data
SELECT 
  'users' AS table_name,
  COUNT(*) AS count
FROM public.users
UNION ALL
SELECT 
  'player_stats' AS table_name,
  COUNT(*) AS count
FROM public.player_stats
UNION ALL
SELECT 
  'profiles' AS table_name,
  COUNT(*) AS count
FROM public.profiles
UNION ALL
SELECT 
  'game_results' AS table_name,
  COUNT(*) AS count
FROM public.game_results
UNION ALL
SELECT 
  'quiz_sessions' AS table_name,
  COUNT(*) AS count
FROM public.quiz_sessions
ORDER BY table_name;

-- ============================================================================
-- ✅ Done! All accounts with 0 XP have been deleted.
-- ============================================================================
