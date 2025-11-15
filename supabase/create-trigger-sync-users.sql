-- Create a trigger to automatically sync users from auth.users to users table
-- This ensures that whenever a user is created in auth.users, they're also created in users table

-- ============================================
-- Step 1: Create the sync function
-- ============================================
CREATE OR REPLACE FUNCTION sync_user_to_custom_table()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Generate username from email or user ID
  IF NEW.email IS NOT NULL THEN
    v_username := split_part(NEW.email, '@', 1);
  ELSE
    v_username := 'user_' || substring(NEW.id::text from 1 for 8);
  END IF;
  
  -- Insert into users table (ignore if already exists)
  INSERT INTO public.users (
    id,
    email,
    username,
    password_hash,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_username,
    'supabase_auth',
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Step 2: Create the trigger
-- ============================================
-- This trigger fires AFTER a user is inserted into auth.users
DROP TRIGGER IF EXISTS sync_user_to_custom_table_trigger ON auth.users;

CREATE TRIGGER sync_user_to_custom_table_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_custom_table();

-- ============================================
-- Step 3: Sync existing users (one-time operation)
-- ============================================
-- This will sync all existing users from auth.users to users table
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

