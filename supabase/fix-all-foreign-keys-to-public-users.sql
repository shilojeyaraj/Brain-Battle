-- Fix ALL Foreign Key Constraints to Point to public.users
-- This is REQUIRED for custom authentication to work
-- Run this in Supabase SQL Editor

-- ============================================
-- Step 1: Check current foreign key constraints
-- ============================================
-- First, let's see what we're working with
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND (ccu.table_name = 'users' OR ccu.table_name = 'users')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- Step 2: Drop ALL existing foreign key constraints that reference users
-- ============================================

-- Drop profiles foreign key
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Drop player_stats foreign key
ALTER TABLE public.player_stats 
  DROP CONSTRAINT IF EXISTS player_stats_user_id_fkey;

-- Drop game_rooms foreign key (if exists)
ALTER TABLE public.game_rooms 
  DROP CONSTRAINT IF EXISTS game_rooms_host_id_fkey;

-- Drop room_members foreign key (if exists)
ALTER TABLE public.room_members 
  DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;

-- Drop documents foreign key (if exists)
ALTER TABLE public.documents 
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

-- Drop player_answers foreign key (if exists)
ALTER TABLE public.player_answers 
  DROP CONSTRAINT IF EXISTS player_answers_user_id_fkey;

-- Drop game_results foreign key (if exists)
ALTER TABLE public.game_results 
  DROP CONSTRAINT IF EXISTS game_results_user_id_fkey;

-- Drop quiz_sessions foreign key (if exists and column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'winner_user_id'
  ) THEN
    ALTER TABLE public.quiz_sessions 
      DROP CONSTRAINT IF EXISTS quiz_sessions_winner_user_id_fkey;
  END IF;
END $$;

-- Drop any other foreign keys that might reference users
-- (Add more as needed based on your schema)

-- ============================================
-- Step 3: Add NEW foreign key constraints pointing to public.users
-- ============================================

-- Fix profiles table
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix player_stats table
ALTER TABLE public.player_stats
  ADD CONSTRAINT player_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix game_rooms table (only if table and column exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_rooms' 
    AND column_name = 'host_id'
  ) THEN
    ALTER TABLE public.game_rooms
      ADD CONSTRAINT game_rooms_host_id_fkey 
      FOREIGN KEY (host_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix room_members table (only if table and column exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'room_members' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.room_members
      ADD CONSTRAINT room_members_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix documents table (only if table and column exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_uploaded_by_fkey 
      FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix player_answers table (only if table and column exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_answers' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.player_answers
      ADD CONSTRAINT player_answers_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix game_results table (only if table and column exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_results' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.game_results
      ADD CONSTRAINT game_results_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix quiz_sessions table (only if winner_user_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'winner_user_id'
  ) THEN
    ALTER TABLE public.quiz_sessions
      ADD CONSTRAINT quiz_sessions_winner_user_id_fkey 
      FOREIGN KEY (winner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Step 4: Verify the constraints were updated correctly
-- ============================================
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name, tc.constraint_name;

-- Expected result: All foreign_table_schema should be 'public' and foreign_table_name should be 'users'

-- ============================================
-- Step 5: Verify users table exists and has data
-- ============================================
SELECT 
  COUNT(*) as total_users,
  MIN(created_at) as oldest_user,
  MAX(created_at) as newest_user
FROM public.users;

-- If this returns 0, you need to create users first!

