-- ============================================================================
-- MIGRATION: Custom Auth to Supabase Auth
-- ============================================================================
-- This script migrates from custom users table to Supabase Auth (auth.users)
-- 
-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- 
-- Steps:
-- 1. This creates a profiles table linked to auth.users
-- 2. Migrates existing users to auth.users (requires manual password migration)
-- 3. Updates all foreign key references
-- 4. Drops the old users table
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Update foreign key references from users(id) to auth.users(id)
-- Note: We'll do this carefully to avoid breaking existing data

-- Update player_stats
ALTER TABLE player_stats 
  DROP CONSTRAINT IF EXISTS player_stats_user_id_fkey;

ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update game_rooms
ALTER TABLE game_rooms 
  DROP CONSTRAINT IF EXISTS game_rooms_host_id_fkey;

ALTER TABLE game_rooms
  ADD CONSTRAINT game_rooms_host_id_fkey 
  FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update room_members
ALTER TABLE room_members 
  DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;

ALTER TABLE room_members
  ADD CONSTRAINT room_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update documents
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;

ALTER TABLE documents
  ADD CONSTRAINT documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update player_answers
ALTER TABLE player_answers 
  DROP CONSTRAINT IF EXISTS player_answers_user_id_fkey;

ALTER TABLE player_answers
  ADD CONSTRAINT player_answers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update game_results
ALTER TABLE game_results 
  DROP CONSTRAINT IF EXISTS game_results_user_id_fkey;

ALTER TABLE game_results
  ADD CONSTRAINT game_results_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update leaderboard
ALTER TABLE leaderboard 
  DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

ALTER TABLE leaderboard
  ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for profiles
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

-- Step 7: Create function to get user profile with username
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

-- Step 8: Create function to update last_login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW(), updated_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger to update last_login on auth sign in
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
CREATE TRIGGER on_auth_user_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();

-- ============================================================================
-- MANUAL MIGRATION STEPS (Run these separately after data migration)
-- ============================================================================

-- IMPORTANT: Before dropping the old users table, you need to:
-- 1. Migrate existing users to auth.users (see migration script)
-- 2. Migrate user data to profiles table
-- 3. Verify all foreign keys are working
-- 4. Then you can drop the old users table:

-- DROP TABLE IF EXISTS users CASCADE;  -- Only after verifying migration!

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Passwords cannot be migrated directly (they're hashed differently)
--    Users will need to reset passwords or you'll need to implement a
--    password migration strategy
--
-- 2. To migrate existing users, you'll need to:
--    - Create auth.users entries (via Supabase Admin API or migration script)
--    - Copy username and other data to profiles table
--    - Update all foreign key references
--
-- 3. After migration, update your application code to use Supabase Auth
--    instead of custom authentication

