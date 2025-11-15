-- Quick Fix: Create missing user in users table
-- Run this to fix the immediate error for user: 410ada84-813a-412c-b655-e1bb9fa52150

-- Step 1: Check if user exists in auth.users
DO $$
DECLARE
  v_user_id UUID := '410ada84-813a-412c-b655-e1bb9fa52150'::UUID;
  v_auth_user RECORD;
  v_username TEXT;
BEGIN
  -- Get user from auth.users
  SELECT id, email, created_at INTO v_auth_user
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_auth_user.id IS NULL THEN
    RAISE EXCEPTION 'User % does not exist in auth.users. Please create the user first.', v_user_id;
  END IF;
  
  -- Check if already exists in users table
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE NOTICE 'User already exists in users table. No action needed.';
    RETURN;
  END IF;
  
  -- Generate username
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
    'supabase_auth',
    COALESCE(v_auth_user.created_at, NOW()),
    NOW()
  );
  
  RAISE NOTICE '✅ User % successfully created in users table with username: %', v_user_id, v_username;
END $$;

-- Step 2: Verify the user was created
SELECT 
  id,
  email,
  username,
  created_at
FROM public.users
WHERE id = '410ada84-813a-412c-b655-e1bb9fa52150'::UUID;

