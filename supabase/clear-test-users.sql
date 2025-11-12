-- Clear Test Users Script
-- This script safely deletes all users and their related data
-- Use with caution! This will delete ALL users and data.

-- Step 1: Delete WebAuthn credentials (if table exists)
DELETE FROM webauthn_credentials;

-- Step 2: Delete player stats
DELETE FROM player_stats;

-- Step 3: Delete profiles
DELETE FROM profiles;

-- Step 4: Delete from auth.users
-- Note: This requires admin privileges
-- In Supabase Dashboard, you can also delete users manually
DELETE FROM auth.users;

-- Alternative: Delete specific user by email
-- Replace 'test@example.com' with the email you want to delete
/*
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'test@example.com';
  
  IF user_uuid IS NOT NULL THEN
    -- Delete related data
    DELETE FROM webauthn_credentials WHERE user_id = user_uuid;
    DELETE FROM player_stats WHERE user_id = user_uuid;
    DELETE FROM profiles WHERE user_id = user_uuid;
    DELETE FROM auth.users WHERE id = user_uuid;
    
    RAISE NOTICE 'User % deleted successfully', 'test@example.com';
  ELSE
    RAISE NOTICE 'User not found';
  END IF;
END $$;
*/

-- Verify deletion
SELECT COUNT(*) as remaining_users FROM auth.users;
SELECT COUNT(*) as remaining_profiles FROM profiles;
SELECT COUNT(*) as remaining_stats FROM player_stats;
SELECT COUNT(*) as remaining_webauthn FROM webauthn_credentials;

