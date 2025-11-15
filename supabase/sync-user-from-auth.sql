-- Sync User from auth.users to users table
-- This script creates a user in the users table if they exist in auth.users
-- Run this BEFORE trying to create profiles/stats for a user

-- ============================================
-- Option 1: Sync a specific user by ID
-- ============================================
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID
DO $$
DECLARE
  v_user_id UUID := '410ada84-813a-412c-b655-e1bb9fa52150'::UUID; -- Replace with your user ID
  v_auth_user RECORD;
  v_username TEXT;
BEGIN
  -- Check if user exists in auth.users
  SELECT id, email, created_at INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_auth_user.id IS NULL THEN
    RAISE EXCEPTION 'User % does not exist in auth.users', v_user_id;
  END IF;
  
  -- Check if user already exists in users table
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE NOTICE 'User % already exists in users table', v_user_id;
    RETURN;
  END IF;
  
  -- Generate username from email or user ID
  IF v_auth_user.email IS NOT NULL THEN
    v_username := split_part(v_auth_user.email, '@', 1);
  ELSE
    v_username := 'user_' || substring(v_user_id::text from 1 for 8);
  END IF;
  
  -- Create user in users table
  INSERT INTO public.users (
    id,
    email,
    username,
    password_hash,
    created_at,
    updated_at
  ) VALUES (
    v_auth_user.id,
    COALESCE(v_auth_user.email, ''),
    v_username,
    'supabase_auth', -- Placeholder since auth is handled by Supabase
    COALESCE(v_auth_user.created_at, NOW()),
    NOW()
  );
  
  RAISE NOTICE 'User % successfully created in users table with username: %', v_user_id, v_username;
END $$;

-- ============================================
-- Option 2: Sync ALL users from auth.users to users table
-- ============================================
-- Uncomment and run this to sync all users at once
/*
INSERT INTO public.users (id, email, username, password_hash, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, ''),
  COALESCE(
    split_part(au.email, '@', 1),
    'user_' || substring(au.id::text from 1 for 8)
  ) as username,
  'supabase_auth' as password_hash,
  COALESCE(au.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- Option 3: Create a function to auto-sync users
-- ============================================
CREATE OR REPLACE FUNCTION sync_user_from_auth(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user RECORD;
  v_username TEXT;
  v_user_record RECORD;
BEGIN
  -- Check if user already exists
  SELECT * INTO v_user_record FROM public.users WHERE id = p_user_id;
  IF v_user_record.id IS NOT NULL THEN
    RETURN v_user_record.id;
  END IF;
  
  -- Get user from auth.users
  SELECT id, email, created_at INTO v_auth_user
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_auth_user.id IS NULL THEN
    RAISE EXCEPTION 'User % does not exist in auth.users', p_user_id;
  END IF;
  
  -- Generate username
  IF v_auth_user.email IS NOT NULL THEN
    v_username := split_part(v_auth_user.email, '@', 1);
  ELSE
    v_username := 'user_' || substring(p_user_id::text from 1 for 8);
  END IF;
  
  -- Create user in users table
  INSERT INTO public.users (
    id,
    email,
    username,
    password_hash,
    created_at,
    updated_at
  ) VALUES (
    v_auth_user.id,
    COALESCE(v_auth_user.email, ''),
    v_username,
    'supabase_auth',
    COALESCE(v_auth_user.created_at, NOW()),
    NOW()
  )
  RETURNING id INTO v_user_record.id;
  
  RETURN v_user_record.id;
END;
$$;

-- ============================================
-- Usage: Call the function to sync a user
-- ============================================
-- SELECT sync_user_from_auth('410ada84-813a-412c-b655-e1bb9fa52150'::UUID);

