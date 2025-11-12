-- Delete Specific User by Email
-- Replace 'YOUR_EMAIL@example.com' with the email you want to delete

DO $$
DECLARE
  user_uuid UUID;
  user_email TEXT := 'YOUR_EMAIL@example.com'; -- CHANGE THIS
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
  
  IF user_uuid IS NOT NULL THEN
    RAISE NOTICE 'Found user: % (ID: %)', user_email, user_uuid;
    
    -- Delete related data first (to avoid foreign key issues)
    DELETE FROM webauthn_credentials WHERE user_id = user_uuid;
    RAISE NOTICE 'Deleted WebAuthn credentials';
    
    DELETE FROM player_stats WHERE user_id = user_uuid;
    RAISE NOTICE 'Deleted player stats';
    
    DELETE FROM profiles WHERE user_id = user_uuid;
    RAISE NOTICE 'Deleted profile';
    
    -- Finally delete from auth.users
    DELETE FROM auth.users WHERE id = user_uuid;
    RAISE NOTICE 'Deleted user from auth.users';
    
    RAISE NOTICE '✅ User % deleted successfully!', user_email;
  ELSE
    RAISE NOTICE '❌ User with email % not found', user_email;
  END IF;
END $$;

