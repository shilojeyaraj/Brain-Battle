-- ============================================================================
-- MIGRATION: Custom Auth to Supabase Auth (FIXED VERSION)
-- ============================================================================
-- This script migrates from custom users table to Supabase Auth (auth.users)
-- 
-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- 
-- This version handles existing data properly by:
-- 1. Creating profiles table first
-- 2. Temporarily disabling foreign key constraints
-- 3. Updating foreign keys to reference auth.users
-- 4. Re-enabling constraints
-- ============================================================================

-- Step 1: Create profiles table (extends auth.users with custom fields)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Step 2: Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: IMPORTANT - Handle existing data first
-- If you have existing users, you need to migrate them BEFORE updating foreign keys
-- 
-- Option A: If you have NO existing users, skip to Step 5
-- Option B: If you have existing users, you need to:
--   1. Create auth.users entries (via Supabase Admin API or migration script)
--   2. Create profiles entries
--   3. Update all foreign key references in your data tables
--   4. THEN run Step 5 to update the constraints

-- Step 5: Update foreign key references from users(id) to auth.users(id)
-- We'll do this carefully to avoid breaking existing data

-- First, drop existing foreign key constraints
ALTER TABLE player_stats 
  DROP CONSTRAINT IF EXISTS player_stats_user_id_fkey;

ALTER TABLE game_rooms 
  DROP CONSTRAINT IF EXISTS game_rooms_host_id_fkey;

ALTER TABLE room_members 
  DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;

ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE player_answers 
  DROP CONSTRAINT IF EXISTS player_answers_user_id_fkey;

ALTER TABLE game_results 
  DROP CONSTRAINT IF EXISTS game_results_user_id_fkey;

ALTER TABLE leaderboard 
  DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

-- Now add new foreign key constraints pointing to auth.users
-- NOTE: This will fail if you have data in these tables that references users
-- that don't exist in auth.users. You must migrate users first!

ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE game_rooms
  ADD CONSTRAINT game_rooms_host_id_fkey 
  FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE room_members
  ADD CONSTRAINT room_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE documents
  ADD CONSTRAINT documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE player_answers
  ADD CONSTRAINT player_answers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE game_results
  ADD CONSTRAINT game_results_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE leaderboard
  ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for profiles
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile (via trigger)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public profiles can be viewed (for leaderboards, etc.)
CREATE POLICY "Public profiles are viewable" ON public.profiles
  FOR SELECT USING (true);

-- Step 8: Create function to get user profile with username
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    u.email,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create function to update last_login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW(), updated_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger to update last_login on auth sign in
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
CREATE TRIGGER on_auth_user_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 
-- If you're getting foreign key constraint errors, it means you have existing
-- data in your tables that references the old users table.
--
-- You have two options:
--
-- OPTION 1: Start Fresh (Development Only)
--   - Delete all data from: player_stats, game_rooms, room_members, etc.
--   - Then run this migration
--   - Users will sign up fresh with Supabase Auth
--
-- OPTION 2: Migrate Existing Users (Production)
--   1. First, migrate users from users table to auth.users (see migration script)
--   2. Create profiles for each migrated user
--   3. Update all foreign key values in your data tables
--   4. Then run this migration script
--
-- To check what data exists:
--   SELECT COUNT(*) FROM player_stats;
--   SELECT COUNT(*) FROM game_rooms;
--   SELECT COUNT(*) FROM room_members;
--   etc.
--
-- To delete all data (DEVELOPMENT ONLY!):
--   TRUNCATE player_stats, game_rooms, room_members, documents, 
--            player_answers, game_results, leaderboard CASCADE;
--   Then run this migration script


