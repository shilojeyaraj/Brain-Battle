-- ============================================================================
-- FIX QUIZ_SESSIONS SCHEMA CACHE ISSUES
-- ============================================================================
-- This migration ensures all quiz_sessions columns exist and are properly configured
-- Fixes PostgREST schema cache issues where status column might not be recognized
-- ============================================================================

-- 1. Ensure status column exists with proper constraints
DO $$
BEGIN
  -- Check if status column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'status'
  ) THEN
    -- Add status column if it doesn't exist
    ALTER TABLE public.quiz_sessions 
    ADD COLUMN status text CHECK (status IN ('pending','generating','active','complete')) DEFAULT 'pending';
    
    RAISE NOTICE '✅ Added status column to quiz_sessions';
  ELSE
    -- Ensure the check constraint exists
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.check_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name LIKE '%quiz_sessions_status%'
    ) THEN
      -- Add check constraint if it doesn't exist
      ALTER TABLE public.quiz_sessions 
      ADD CONSTRAINT quiz_sessions_status_check 
      CHECK (status IN ('pending','generating','active','complete'));
      
      RAISE NOTICE '✅ Added status check constraint to quiz_sessions';
    ELSE
      RAISE NOTICE 'ℹ️  status column and constraint already exist';
    END IF;
  END IF;
END $$;

-- 2. Ensure room_id is nullable (for singleplayer support)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'room_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    ALTER COLUMN room_id DROP NOT NULL;
    
    RAISE NOTICE '✅ Made room_id nullable in quiz_sessions';
  ELSE
    RAISE NOTICE 'ℹ️  room_id is already nullable';
  END IF;
END $$;

-- 3. Ensure all required columns exist (defensive check)
DO $$
BEGIN
  -- Check and add started_at if missing
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    ADD COLUMN started_at timestamptz;
    
    RAISE NOTICE '✅ Added started_at column to quiz_sessions';
  END IF;

  -- Check and add ended_at if missing
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    ADD COLUMN ended_at timestamptz;
    
    RAISE NOTICE '✅ Added ended_at column to quiz_sessions';
  END IF;

  -- Check and add total_questions if missing
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    ADD COLUMN total_questions int DEFAULT 0;
    
    RAISE NOTICE '✅ Added total_questions column to quiz_sessions';
  END IF;

  -- Check and add created_at if missing
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    ADD COLUMN created_at timestamptz DEFAULT now();
    
    RAISE NOTICE '✅ Added created_at column to quiz_sessions';
  END IF;
END $$;

-- 4. Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON public.quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_room_id ON public.quiz_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON public.quiz_sessions(created_at DESC);

-- 5. Remove any old/invalid columns that shouldn't exist (cleanup)
DO $$
BEGIN
  -- Remove session_name if it exists (not in schema.sql)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'session_name'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    DROP COLUMN session_name;
    
    RAISE NOTICE '✅ Removed deprecated session_name column';
  END IF;

  -- Remove time_limit if it exists (not in schema.sql)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'time_limit'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    DROP COLUMN time_limit;
    
    RAISE NOTICE '✅ Removed deprecated time_limit column';
  END IF;

  -- Remove is_active if it exists (replaced by status)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'is_active'
  ) THEN
    -- Migrate data from is_active to status before dropping
    UPDATE public.quiz_sessions 
    SET status = CASE 
      WHEN is_active = true THEN 'active'
      WHEN is_active = false THEN 'complete'
      ELSE 'pending'
    END
    WHERE status IS NULL OR status = 'pending';
    
    ALTER TABLE public.quiz_sessions 
    DROP COLUMN is_active;
    
    RAISE NOTICE '✅ Migrated is_active to status and removed is_active column';
  END IF;
END $$;

-- 6. Ensure default value for status is set
ALTER TABLE public.quiz_sessions 
ALTER COLUMN status SET DEFAULT 'pending';

-- 7. Verify the final schema
DO $$
DECLARE
  col_count int;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'quiz_sessions';
  
  RAISE NOTICE '✅ quiz_sessions table has % columns', col_count;
  
  -- Verify critical columns exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'status'
  ) THEN
    RAISE NOTICE '✅ status column verified';
  ELSE
    RAISE EXCEPTION '❌ status column missing after migration';
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'room_id'
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✅ room_id is nullable (singleplayer support enabled)';
  ELSE
    RAISE EXCEPTION '❌ room_id is not nullable (singleplayer support broken)';
  END IF;
END $$;

-- 8. Ensure game_results has topic column for battle history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_results' 
    AND column_name = 'topic'
  ) THEN
    ALTER TABLE public.game_results 
    ADD COLUMN topic text;
    
    -- Add index for topic queries
    CREATE INDEX IF NOT EXISTS idx_game_results_topic ON public.game_results(topic);
    
    RAISE NOTICE '✅ Added topic column to game_results';
  ELSE
    RAISE NOTICE 'ℹ️  topic column already exists in game_results';
  END IF;
END $$;

-- 9. Ensure game_results has all required columns
DO $$
BEGIN
  -- Verify critical columns exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_results' 
    AND column_name = 'session_id'
  ) THEN
    RAISE EXCEPTION '❌ game_results.session_id column missing - critical for battle history';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_results' 
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION '❌ game_results.user_id column missing - critical for battle history';
  END IF;
  
  RAISE NOTICE '✅ game_results table structure verified';
END $$;

-- 10. Ensure documents table has both user_id and uploaded_by for compatibility
DO $$
BEGIN
  -- Add uploaded_by column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE public.documents 
    ADD COLUMN uploaded_by UUID;
    
    -- Copy user_id to uploaded_by for existing records
    UPDATE public.documents 
    SET uploaded_by = user_id 
    WHERE uploaded_by IS NULL;
    
    RAISE NOTICE '✅ Added uploaded_by column to documents table';
  ELSE
    RAISE NOTICE 'ℹ️  uploaded_by column already exists in documents table';
  END IF;
  
  -- Ensure user_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.documents 
    ADD COLUMN user_id UUID;
    
    -- Copy uploaded_by to user_id for existing records
    UPDATE public.documents 
    SET user_id = uploaded_by 
    WHERE user_id IS NULL;
    
    RAISE NOTICE '✅ Added user_id column to documents table';
  END IF;
  
  -- Ensure both columns are populated (sync them)
  UPDATE public.documents 
  SET uploaded_by = user_id 
  WHERE uploaded_by IS NULL AND user_id IS NOT NULL;
  
  UPDATE public.documents 
  SET user_id = uploaded_by 
  WHERE user_id IS NULL AND uploaded_by IS NOT NULL;
END $$;

-- 11. Create index on user_id for document limit queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id_created ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_created ON public.documents(uploaded_by, created_at DESC);

-- 12. Add notes_id column to quiz_sessions to link quizzes to their source notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'notes_id'
  ) THEN
    ALTER TABLE public.quiz_sessions 
    ADD COLUMN notes_id UUID REFERENCES public.user_study_notes(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_quiz_sessions_notes_id ON public.quiz_sessions(notes_id);
    
    RAISE NOTICE '✅ Added notes_id column to quiz_sessions table';
  ELSE
    RAISE NOTICE 'ℹ️  notes_id column already exists in quiz_sessions table';
  END IF;
END $$;

-- ============================================================================
-- NOTE: After running this migration, you may need to restart PostgREST
-- or wait for the schema cache to refresh (usually happens automatically)
-- 
-- To manually refresh PostgREST schema cache (if using Supabase):
-- 1. Go to Supabase Dashboard > Database > Extensions
-- 2. Find PostgREST and click "Reload Schema"
-- OR
-- 3. Restart your Supabase instance
-- ============================================================================

