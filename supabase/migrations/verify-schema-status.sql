-- ============================================================================
-- QUICK VERIFICATION: Check if schema is ready for quiz results
-- ============================================================================
-- Run this to see if all required columns exist
-- ============================================================================

SELECT 
  'quiz_sessions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quiz_sessions'
AND column_name IN ('id', 'room_id', 'status', 'notes_id', 'total_questions', 'started_at', 'ended_at')
ORDER BY column_name;

SELECT 
  'game_results' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_results'
AND column_name IN ('id', 'user_id', 'session_id', 'topic', 'xp_earned', 'correct_answers', 'questions_answered')
ORDER BY column_name;

SELECT 
  'player_stats' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'player_stats'
AND column_name IN ('user_id', 'xp', 'level', 'total_games', 'total_wins', 'daily_streak', 'longest_streak')
ORDER BY column_name;

SELECT 
  'documents' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'documents'
AND column_name IN ('id', 'user_id', 'uploaded_by', 'content_hash', 'original_name')
ORDER BY column_name;

-- Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema || '.' || ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('documents', 'game_results', 'player_stats', 'quiz_sessions')
ORDER BY tc.table_name, tc.constraint_name;

-- Count records for the user
DO $$
DECLARE
  test_user_id UUID := '19d3c81b-a1fd-4850-bc9a-d32ce90f765f'; -- Replace with actual user ID
  game_count INTEGER;
  stats_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO game_count FROM public.game_results WHERE user_id = test_user_id;
  SELECT COUNT(*) INTO stats_count FROM public.player_stats WHERE user_id = test_user_id;
  SELECT COUNT(*) INTO session_count FROM public.quiz_sessions;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RECORD COUNTS FOR USER: %', test_user_id;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'game_results: %', game_count;
  RAISE NOTICE 'player_stats: %', stats_count;
  RAISE NOTICE 'quiz_sessions (total): %', session_count;
  RAISE NOTICE '============================================';
END $$;






