-- Fix profiles table foreign key to point to auth.users instead of users
-- This fixes the error: "Key (user_id)=(...) is not present in table 'users'"

-- Step 1: Drop the old foreign key constraint (if it exists)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Step 2: Add the correct foreign key constraint pointing to auth.users
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Verify the constraint
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'profiles_user_id_fkey';

-- Expected result: referenced_table should be 'auth.users'

