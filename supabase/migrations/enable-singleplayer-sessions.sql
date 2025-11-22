-- ============================================================================
-- ENABLE SINGLEPLAYER QUIZ SESSIONS
-- ============================================================================
-- This migration makes room_id nullable in quiz_sessions to support singleplayer games
-- Singleplayer games don't have a room, so room_id should be NULL
-- ============================================================================

-- Check if room_id has NOT NULL constraint and remove it if it exists
DO $$
BEGIN
  -- Check if the column exists and has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'room_id' 
    AND is_nullable = 'NO'
  ) THEN
    -- Make room_id nullable
    ALTER TABLE public.quiz_sessions 
    ALTER COLUMN room_id DROP NOT NULL;
    
    RAISE NOTICE '✅ Made room_id nullable in quiz_sessions';
  ELSE
    RAISE NOTICE 'ℹ️  room_id is already nullable (or column does not exist)';
  END IF;
END $$;

-- Add a check constraint to ensure either room_id is set (multiplayer) or it's NULL (singleplayer)
-- This is optional but helps with data integrity
-- Note: We're not adding this constraint as it might be too restrictive
-- Instead, we rely on application logic to ensure proper usage

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'room_id' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✅ room_id is now nullable in quiz_sessions';
  ELSE
    RAISE EXCEPTION '❌ Failed to make room_id nullable';
  END IF;
END $$;

