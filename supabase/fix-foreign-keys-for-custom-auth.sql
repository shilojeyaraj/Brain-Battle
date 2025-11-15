-- Fix Foreign Key Constraints for Custom Auth
-- This script updates foreign key constraints to reference the custom 'users' table
-- instead of 'auth.users', since the app uses custom authentication

-- ============================================
-- Step 1: Drop existing foreign key constraints
-- ============================================

-- Drop profiles foreign key (if it exists)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Drop player_stats foreign key (if it exists)
ALTER TABLE public.player_stats 
  DROP CONSTRAINT IF EXISTS player_stats_user_id_fkey;

-- ============================================
-- Step 2: Add new foreign key constraints pointing to custom 'users' table
-- ============================================

-- Fix profiles table to reference custom users table
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix player_stats table to reference custom users table
ALTER TABLE public.player_stats
  ADD CONSTRAINT player_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================
-- Verification
-- ============================================
-- After running this script, verify the constraints:
-- 
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name IN ('profiles', 'player_stats')
-- ORDER BY tc.table_name, tc.constraint_name;

