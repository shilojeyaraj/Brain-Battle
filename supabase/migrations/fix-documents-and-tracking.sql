-- ============================================================================
-- FIX DOCUMENTS AND TRACKING - Comprehensive fix for document/notes/quiz storage
-- ============================================================================
-- This migration fixes:
-- 1. Foreign key constraint pointing to wrong table (auth.users vs public.users)
-- 2. Missing notes_id column in quiz_sessions
-- 3. Missing columns and constraints
-- 4. Schema cache issues
-- ============================================================================

-- ============================================================================
-- PART 1: Fix documents table foreign key
-- ============================================================================

DO $$
BEGIN
  -- Drop constraint referencing auth.users
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_user_id_fkey' 
    AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_user_id_fkey;
    RAISE NOTICE '✅ Dropped documents_user_id_fkey constraint (was pointing to auth.users)';
  ELSE
    RAISE NOTICE 'ℹ️  documents_user_id_fkey constraint does not exist';
  END IF;
END $$;

-- Add the correct foreign key constraint pointing to public.users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'documents_user_id_public_users_fkey' 
      AND conrelid = 'public.documents'::regclass
    ) THEN
      ALTER TABLE public.documents 
        ADD CONSTRAINT documents_user_id_public_users_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added documents_user_id_public_users_fkey constraint (pointing to public.users)';
    ELSE
      RAISE NOTICE 'ℹ️  documents_user_id_public_users_fkey constraint already exists';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  public.users table does not exist! Documents FK not created.';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Ensure documents table has all required columns
-- ============================================================================

DO $$
BEGIN
  -- Add filename column (for legacy compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'filename'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN filename TEXT;
    RAISE NOTICE '✅ Added filename column to documents';
  END IF;

  -- Add uploaded_by column (for legacy compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN uploaded_by UUID;
    RAISE NOTICE '✅ Added uploaded_by column to documents';
  END IF;

  -- Add file_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN file_url TEXT;
    RAISE NOTICE '✅ Added file_url column to documents';
  END IF;

  -- Sync user_id and uploaded_by
  UPDATE public.documents 
  SET uploaded_by = user_id 
  WHERE uploaded_by IS NULL AND user_id IS NOT NULL;

  UPDATE public.documents 
  SET user_id = uploaded_by 
  WHERE user_id IS NULL AND uploaded_by IS NOT NULL;

  -- Update filename from original_name if null
  UPDATE public.documents 
  SET filename = original_name 
  WHERE filename IS NULL AND original_name IS NOT NULL;

  RAISE NOTICE '✅ Updated documents table columns';
END $$;

-- ============================================================================
-- PART 3: Ensure unique constraint exists for upserts
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_user_content_hash_key' 
    AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents 
      ADD CONSTRAINT documents_user_content_hash_key 
      UNIQUE (user_id, content_hash);
    RAISE NOTICE '✅ Added documents_user_content_hash_key unique constraint';
  ELSE
    RAISE NOTICE 'ℹ️  documents_user_content_hash_key constraint already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Ensure quiz_sessions has notes_id column
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'notes_id'
  ) THEN
    ALTER TABLE public.quiz_sessions ADD COLUMN notes_id UUID;
    RAISE NOTICE '✅ Added notes_id column to quiz_sessions';
  ELSE
    RAISE NOTICE 'ℹ️  notes_id column already exists in quiz_sessions';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Ensure quiz_sessions has status column
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.quiz_sessions ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Added status column to quiz_sessions';
  ELSE
    RAISE NOTICE 'ℹ️  status column already exists in quiz_sessions';
  END IF;
END $$;

-- ============================================================================
-- PART 6: Ensure game_results has topic column
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_results' 
    AND column_name = 'topic'
  ) THEN
    ALTER TABLE public.game_results ADD COLUMN topic TEXT;
    RAISE NOTICE '✅ Added topic column to game_results';
  ELSE
    RAISE NOTICE 'ℹ️  topic column already exists in game_results';
  END IF;
END $$;

-- ============================================================================
-- PART 7: Create indexes for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON public.documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_created ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_notes_id ON public.quiz_sessions(notes_id);
CREATE INDEX IF NOT EXISTS idx_game_results_topic ON public.game_results(topic);

-- ============================================================================
-- PART 8: Refresh PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- PART 9: Verify the fix
-- ============================================================================

DO $$
DECLARE
  fk_target TEXT;
BEGIN
  -- Check what the foreign key points to now
  SELECT 
    ccu.table_schema || '.' || ccu.table_name INTO fk_target
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'documents'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'id'
  LIMIT 1;
  
  IF fk_target IS NOT NULL THEN
    RAISE NOTICE '📋 Documents user_id foreign key points to: %', fk_target;
  ELSE
    RAISE NOTICE '⚠️  No foreign key found on documents.user_id';
  END IF;
  
  -- Check if notes_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'notes_id'
  ) THEN
    RAISE NOTICE '✅ quiz_sessions.notes_id column exists';
  ELSE
    RAISE NOTICE '❌ quiz_sessions.notes_id column MISSING';
  END IF;
  
  -- Check if status column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'status'
  ) THEN
    RAISE NOTICE '✅ quiz_sessions.status column exists';
  ELSE
    RAISE NOTICE '❌ quiz_sessions.status column MISSING';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your Next.js dev server';
  RAISE NOTICE '2. Upload a document and check terminal logs';
  RAISE NOTICE '3. Counter should now update correctly';
  RAISE NOTICE '============================================';
END $$;
