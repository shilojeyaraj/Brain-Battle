-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX - Fix all quiz, stats, and document tracking issues
-- ============================================================================
-- This migration addresses ALL known schema issues preventing stats from saving:
-- 1. quiz_sessions: Add status, notes_id columns; make room_id nullable
-- 2. game_results: Add topic column for battle history display
-- 3. player_stats: Add daily_streak, longest_streak columns
-- 4. documents: Fix foreign key to reference public.users instead of auth.users
-- 5. Force PostgREST schema cache refresh
-- ============================================================================

-- ============================================================================
-- PART 1: FIX quiz_sessions TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_sessions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.quiz_sessions ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Added status column to quiz_sessions';
  ELSE
    RAISE NOTICE 'ℹ️ status column already exists in quiz_sessions';
  END IF;

  -- Add notes_id column if missing (nullable FK to user_study_notes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_sessions' AND column_name = 'notes_id'
  ) THEN
    -- First check if user_study_notes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_study_notes') THEN
      ALTER TABLE public.quiz_sessions ADD COLUMN notes_id UUID REFERENCES public.user_study_notes(id) ON DELETE SET NULL;
      RAISE NOTICE '✅ Added notes_id column to quiz_sessions with FK to user_study_notes';
    ELSE
      ALTER TABLE public.quiz_sessions ADD COLUMN notes_id UUID;
      RAISE NOTICE '✅ Added notes_id column to quiz_sessions (no FK - user_study_notes table not found)';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ notes_id column already exists in quiz_sessions';
  END IF;

  -- Ensure room_id is nullable (for singleplayer support)
  -- This doesn't modify data, just ensures the column can accept NULL
  ALTER TABLE public.quiz_sessions ALTER COLUMN room_id DROP NOT NULL;
  RAISE NOTICE '✅ Ensured room_id is nullable in quiz_sessions';

  -- Migrate is_active to status if is_active exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_sessions' AND column_name = 'is_active'
  ) THEN
    UPDATE public.quiz_sessions 
    SET status = CASE WHEN is_active = true THEN 'active' ELSE 'complete' END
    WHERE status IS NULL OR status = 'active';
    RAISE NOTICE '✅ Migrated is_active values to status column';
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'quiz_sessions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.quiz_sessions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added created_at column to quiz_sessions';
  END IF;
END $$;

-- Create indexes for quiz_sessions
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON public.quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_notes_id ON public.quiz_sessions(notes_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_room_id ON public.quiz_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_started_at ON public.quiz_sessions(started_at DESC);

-- ============================================================================
-- PART 2: FIX game_results TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add topic column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'game_results' AND column_name = 'topic'
  ) THEN
    ALTER TABLE public.game_results ADD COLUMN topic TEXT;
    RAISE NOTICE '✅ Added topic column to game_results';
  ELSE
    RAISE NOTICE 'ℹ️ topic column already exists in game_results';
  END IF;

  -- Ensure room_id is nullable (for singleplayer support)
  ALTER TABLE public.game_results ALTER COLUMN room_id DROP NOT NULL;
  RAISE NOTICE '✅ Ensured room_id is nullable in game_results';
END $$;

-- Create indexes for game_results
CREATE INDEX IF NOT EXISTS idx_game_results_topic ON public.game_results(topic);
CREATE INDEX IF NOT EXISTS idx_game_results_user_completed ON public.game_results(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_session ON public.game_results(session_id);

-- ============================================================================
-- PART 3: FIX player_stats TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add daily_streak column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'player_stats' AND column_name = 'daily_streak'
  ) THEN
    ALTER TABLE public.player_stats ADD COLUMN daily_streak INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added daily_streak column to player_stats';
  END IF;

  -- Add longest_streak column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'player_stats' AND column_name = 'longest_streak'
  ) THEN
    ALTER TABLE public.player_stats ADD COLUMN longest_streak INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added longest_streak column to player_stats';
  END IF;

  -- Add last_activity_date column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'player_stats' AND column_name = 'last_activity_date'
  ) THEN
    ALTER TABLE public.player_stats ADD COLUMN last_activity_date DATE;
    RAISE NOTICE '✅ Added last_activity_date column to player_stats';
  END IF;
END $$;

-- Create indexes for player_stats
CREATE INDEX IF NOT EXISTS idx_player_stats_user ON public.player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_xp ON public.player_stats(xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_level ON public.player_stats(level DESC);

-- ============================================================================
-- PART 4: FIX documents TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add user_id column if missing (some schemas use uploaded_by)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN user_id UUID;
    RAISE NOTICE '✅ Added user_id column to documents';
  END IF;

  -- Add original_name column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'original_name'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN original_name TEXT;
    -- Copy filename to original_name if filename exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'filename'
    ) THEN
      UPDATE public.documents SET original_name = filename WHERE original_name IS NULL;
    END IF;
    RAISE NOTICE '✅ Added original_name column to documents';
  END IF;

  -- Add content_hash column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN content_hash TEXT;
    RAISE NOTICE '✅ Added content_hash column to documents';
  END IF;

  -- Sync user_id and uploaded_by
  UPDATE public.documents 
  SET user_id = uploaded_by 
  WHERE user_id IS NULL AND uploaded_by IS NOT NULL;

  UPDATE public.documents 
  SET uploaded_by = user_id 
  WHERE uploaded_by IS NULL AND user_id IS NOT NULL;

  RAISE NOTICE '✅ Synced user_id and uploaded_by columns in documents';
END $$;

-- Fix foreign key constraint - drop any FK referencing auth.users and add one for public.users
DO $$
BEGIN
  -- Drop FK to auth.users if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON c.connamespace = n.oid
    WHERE c.conname = 'documents_user_id_fkey'
    AND c.conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_user_id_fkey;
    RAISE NOTICE '✅ Dropped documents_user_id_fkey constraint';
  END IF;

  -- Add FK to public.users if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'documents_user_id_public_users_fkey'
    AND c.conrelid = 'public.documents'::regclass
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      ALTER TABLE public.documents
        ADD CONSTRAINT documents_user_id_public_users_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added documents_user_id_public_users_fkey constraint';
    ELSE
      RAISE NOTICE '⚠️ public.users table not found - FK not added';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ documents_user_id_public_users_fkey constraint already exists';
  END IF;
END $$;

-- Add unique constraint for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_user_content_hash_key' 
    AND conrelid = 'public.documents'::regclass
  ) THEN
    -- Only add if both columns exist and have values
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'content_hash'
    ) THEN
      ALTER TABLE public.documents 
        ADD CONSTRAINT documents_user_content_hash_key 
        UNIQUE (user_id, content_hash);
      RAISE NOTICE '✅ Added documents_user_content_hash_key unique constraint';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ documents_user_content_hash_key constraint already exists';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '⚠️ Could not add documents_user_content_hash_key constraint: %', SQLERRM;
END $$;

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON public.documents(content_hash);

-- ============================================================================
-- PART 5: FIX player_answers TABLE
-- ============================================================================

DO $$
BEGIN
  -- Ensure room_id is nullable (for singleplayer support)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'player_answers' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE public.player_answers ALTER COLUMN room_id DROP NOT NULL;
    RAISE NOTICE '✅ Ensured room_id is nullable in player_answers';
  END IF;
END $$;

-- ============================================================================
-- PART 5.5: FIX achievements TABLE FOREIGN KEY
-- ============================================================================
-- The achievements table should reference auth.users, not public.users
-- This fixes the "user_id is not present in table users" error

DO $$
BEGIN
  -- Check if achievements table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'achievements'
  ) THEN
    RAISE NOTICE 'ℹ️ achievements table does not exist - skipping FK fix';
  ELSE
    -- Drop existing FK to public.users if it exists
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conname = 'achievements_user_id_fkey'
      AND c.conrelid = 'public.achievements'::regclass
    ) THEN
      ALTER TABLE public.achievements DROP CONSTRAINT achievements_user_id_fkey;
      RAISE NOTICE '✅ Dropped existing achievements_user_id_fkey constraint';
    END IF;

    -- Add FK to auth.users
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conname = 'achievements_user_id_auth_users_fkey'
      AND c.conrelid = 'public.achievements'::regclass
    ) THEN
      ALTER TABLE public.achievements
        ADD CONSTRAINT achievements_user_id_auth_users_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added achievements_user_id_auth_users_fkey (references auth.users)';
    ELSE
      RAISE NOTICE 'ℹ️ achievements_user_id_auth_users_fkey constraint already exists';
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '⚠️ Error fixing achievements FK: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 6: ENSURE profiles TABLE EXISTS AND HAS CORRECT COLUMNS
-- ============================================================================

DO $$
BEGIN
  -- Create profiles table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    CREATE TABLE public.profiles (
      user_id UUID PRIMARY KEY,
      username TEXT,
      email TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created profiles table';
  END IF;

  -- Add FK if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_fkey' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added profiles FK to users';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 7: UPDATE TRIGGER FOR player_stats (ensure it creates missing stats)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_player_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  -- First ensure the stats row exists
  INSERT INTO player_stats (user_id, xp, total_games, total_wins)
  VALUES (NEW.user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Now update the stats
  UPDATE player_stats
  SET 
    total_games = total_games + 1,
    xp = xp + COALESCE(NEW.xp_earned, 0),
    total_questions_answered = total_questions_answered + NEW.questions_answered,
    correct_answers = correct_answers + NEW.correct_answers,
    accuracy = CASE 
      WHEN (total_questions_answered + NEW.questions_answered) > 0 
      THEN ((correct_answers + NEW.correct_answers)::decimal / (total_questions_answered + NEW.questions_answered)) * 100 
      ELSE 0 
    END,
    level = FLOOR((xp + COALESCE(NEW.xp_earned, 0)) / 1000) + 1,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_stats_after_game ON game_results;
CREATE TRIGGER update_stats_after_game
AFTER INSERT ON game_results
FOR EACH ROW
EXECUTE FUNCTION update_player_stats_after_game();

-- ============================================================================
-- PART 8: NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SCHEMA FIX VERIFICATION';
  RAISE NOTICE '============================================';

  -- Check quiz_sessions columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'quiz_sessions' 
  AND column_name IN ('status', 'notes_id');
  
  IF col_count = 2 THEN
    RAISE NOTICE '✅ quiz_sessions has status and notes_id columns';
  ELSE
    RAISE NOTICE '❌ quiz_sessions missing columns (found %/2)', col_count;
  END IF;

  -- Check game_results columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'game_results' 
  AND column_name = 'topic';
  
  IF col_count = 1 THEN
    RAISE NOTICE '✅ game_results has topic column';
  ELSE
    RAISE NOTICE '❌ game_results missing topic column';
  END IF;

  -- Check player_stats columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'player_stats' 
  AND column_name IN ('daily_streak', 'longest_streak', 'last_activity_date');
  
  IF col_count = 3 THEN
    RAISE NOTICE '✅ player_stats has daily_streak, longest_streak, last_activity_date columns';
  ELSE
    RAISE NOTICE '⚠️ player_stats missing some streak columns (found %/3)', col_count;
  END IF;

  -- Check documents FK
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_user_id_public_users_fkey'
  ) THEN
    RAISE NOTICE '✅ documents has correct FK to public.users';
  ELSE
    RAISE NOTICE '⚠️ documents FK to public.users not found';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your Next.js dev server';
  RAISE NOTICE '2. Complete a quiz and check terminal logs';
  RAISE NOTICE '3. XP and stats should now update correctly';
  RAISE NOTICE '============================================';
END $$;

