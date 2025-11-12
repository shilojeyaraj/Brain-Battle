-- ============================================================================
-- CLEAR ALL USERS, PROFILES, AND RELATED DATA
-- ============================================================================
-- ⚠️ WARNING: This will DELETE ALL USER DATA!
-- This includes:
--   - All users from auth.users
--   - All profiles
--   - All player stats
--   - All game results
--   - All quiz sessions
--   - All questions and answers
--   - All room data
--   - Everything else user-related
--
-- Use this to start completely fresh in development
-- ============================================================================

-- Step 1: Delete all dependent data first (due to foreign key constraints)
-- Delete in reverse order of dependencies
-- All deletes are conditional - only delete from tables that exist

-- Game results (depends on sessions and users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_results') THEN
    DELETE FROM public.game_results;
  END IF;
END $$;

-- Player answers (depends on questions and users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'player_answers') THEN
    DELETE FROM public.player_answers;
  END IF;
END $$;

-- Questions (depends on sessions)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions') THEN
    DELETE FROM public.questions;
  END IF;
END $$;

-- Quiz sessions (depends on rooms and users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_sessions') THEN
    DELETE FROM public.quiz_sessions;
  END IF;
END $$;

-- Player progress (depends on sessions) - only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'player_progress') THEN
    DELETE FROM public.player_progress;
  END IF;
END $$;

-- Room members (depends on rooms and users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_members') THEN
    DELETE FROM public.room_members;
  END IF;
END $$;

-- Documents/Uploads (depends on rooms) - only if tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uploads') THEN
    DELETE FROM public.uploads;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    DELETE FROM public.documents;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') THEN
    DELETE FROM public.units;
  END IF;
END $$;

-- Rooms (depends on users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rooms') THEN
    DELETE FROM public.rooms;
  END IF;
END $$;

-- Leaderboard (depends on users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboard') THEN
    DELETE FROM public.leaderboard;
  END IF;
END $$;

-- Player stats (depends on users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'player_stats') THEN
    DELETE FROM public.player_stats;
  END IF;
END $$;

-- Profiles (depends on auth.users)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DELETE FROM public.profiles;
  END IF;
END $$;

-- WebAuthn credentials (depends on users) - only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webauthn_credentials') THEN
    DELETE FROM public.webauthn_credentials;
  END IF;
END $$;

-- Step 2: Delete all users from auth.users
-- This will cascade delete any remaining references
DELETE FROM auth.users;

-- Step 3: Reset sequences (optional, but good for clean state)
-- Reset any auto-incrementing IDs if you have them
-- (Most tables use UUIDs, so this may not be needed)

-- Step 4: Verify everything is cleared
SELECT 
  'auth.users' AS table_name,
  COUNT(*) AS remaining_count
FROM auth.users
UNION ALL
SELECT 
  'public.profiles' AS table_name,
  COUNT(*) AS remaining_count
FROM public.profiles
UNION ALL
SELECT 
  'public.player_stats' AS table_name,
  COUNT(*) AS remaining_count
FROM public.player_stats
UNION ALL
SELECT 
  'public.game_results' AS table_name,
  COUNT(*) AS remaining_count
FROM public.game_results
UNION ALL
SELECT 
  'public.quiz_sessions' AS table_name,
  COUNT(*) AS remaining_count
FROM public.quiz_sessions;

-- Expected result: All counts should be 0

-- ============================================================================
-- ✅ Done! All users and data have been cleared.
-- You can now sign up with fresh accounts.
-- ============================================================================

