-- ============================================================================
-- MIGRATION: Handle Existing Data Before Updating Foreign Keys
-- ============================================================================
-- Run this BEFORE migrate-to-supabase-auth-fixed.sql if you have existing data
-- 
-- This script helps you identify and handle existing data that references
-- the old users table.
-- ============================================================================

-- Step 1: Check what data exists
DO $$
DECLARE
  player_stats_count INTEGER;
  game_rooms_count INTEGER;
  room_members_count INTEGER;
  documents_count INTEGER;
  player_answers_count INTEGER;
  game_results_count INTEGER;
  leaderboard_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO player_stats_count FROM player_stats;
  SELECT COUNT(*) INTO game_rooms_count FROM game_rooms;
  SELECT COUNT(*) INTO room_members_count FROM room_members;
  SELECT COUNT(*) INTO documents_count FROM documents;
  SELECT COUNT(*) INTO player_answers_count FROM player_answers;
  SELECT COUNT(*) INTO game_results_count FROM game_results;
  SELECT COUNT(*) INTO leaderboard_count FROM leaderboard;
  
  RAISE NOTICE 'Existing data counts:';
  RAISE NOTICE '  player_stats: %', player_stats_count;
  RAISE NOTICE '  game_rooms: %', game_rooms_count;
  RAISE NOTICE '  room_members: %', room_members_count;
  RAISE NOTICE '  documents: %', documents_count;
  RAISE NOTICE '  player_answers: %', player_answers_count;
  RAISE NOTICE '  game_results: %', game_results_count;
  RAISE NOTICE '  leaderboard: %', leaderboard_count;
END $$;

-- Step 2: Find orphaned records (user_ids that don't exist in auth.users)
-- These will cause foreign key errors
SELECT 
  'player_stats' as table_name,
  COUNT(*) as orphaned_records
FROM player_stats ps
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = ps.user_id
)
UNION ALL
SELECT 
  'game_rooms' as table_name,
  COUNT(*) as orphaned_records
FROM game_rooms gr
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = gr.host_id
)
UNION ALL
SELECT 
  'room_members' as table_name,
  COUNT(*) as orphaned_records
FROM room_members rm
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = rm.user_id
)
UNION ALL
SELECT 
  'documents' as table_name,
  COUNT(*) as orphaned_records
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = d.uploaded_by
)
UNION ALL
SELECT 
  'player_answers' as table_name,
  COUNT(*) as orphaned_records
FROM player_answers pa
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = pa.user_id
)
UNION ALL
SELECT 
  'game_results' as table_name,
  COUNT(*) as orphaned_records
FROM game_results gr
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = gr.user_id
)
UNION ALL
SELECT 
  'leaderboard' as table_name,
  COUNT(*) as orphaned_records
FROM leaderboard l
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = l.user_id
);

-- Step 3: OPTION A - Delete all existing data (DEVELOPMENT ONLY!)
-- Uncomment the line below if you want to start fresh
-- WARNING: This will delete ALL your data!

-- TRUNCATE player_stats, game_rooms, room_members, documents, 
--          player_answers, game_results, leaderboard, quiz_sessions, 
--          questions CASCADE;

-- Step 4: OPTION B - Migrate users first (see migrate-existing-users.md)
-- You need to:
-- 1. Create auth.users entries for each user in your users table
-- 2. Create profiles entries
-- 3. Update all foreign key values in data tables to match new auth.users IDs
-- 4. Then run migrate-to-supabase-auth-fixed.sql

-- Step 5: After migration, verify no orphaned records
-- Run the query from Step 2 again - all counts should be 0


