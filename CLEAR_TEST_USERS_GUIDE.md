# 🗑️ Clear Test Users Guide

Quick guide to clearing test users so you can test with fresh emails.

## Method 1: Delete via Supabase Dashboard (Easiest) ⭐

1. **Go to Supabase Dashboard**
   - Navigate to **Authentication** → **Users**
   
2. **Delete Users**
   - Find the user you want to delete
   - Click the **three dots** (⋯) next to the user
   - Click **Delete user**
   - Confirm deletion

3. **Clean Up Related Data** (Optional)
   - Go to **Table Editor** → `profiles`
   - Delete the corresponding profile row
   - Go to **Table Editor** → `player_stats`
   - Delete the corresponding stats row
   - Go to **Table Editor** → `webauthn_credentials` (if exists)
   - Delete the corresponding credentials

## Method 2: Delete Specific User by Email (SQL)

1. **Open SQL Editor** in Supabase Dashboard
2. **Run the script** `supabase/delete-user-by-email.sql`
3. **Change the email** in the script:
   ```sql
   user_email TEXT := 'YOUR_EMAIL@example.com'; -- CHANGE THIS
   ```
4. **Execute** the script

## Method 3: Delete All Users (SQL) ⚠️

**WARNING: This deletes ALL users and data!**

1. **Open SQL Editor** in Supabase Dashboard
2. **Run the script** `supabase/clear-test-users.sql`
3. **Verify** the deletion with the count queries at the end

## Method 4: Quick SQL Commands

### Delete user by email:
```sql
-- Replace 'test@example.com' with your email
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'test@example.com';
  
  IF user_uuid IS NOT NULL THEN
    DELETE FROM webauthn_credentials WHERE user_id = user_uuid;
    DELETE FROM player_stats WHERE user_id = user_uuid;
    DELETE FROM profiles WHERE user_id = user_uuid;
    DELETE FROM auth.users WHERE id = user_uuid;
    RAISE NOTICE 'User deleted successfully';
  END IF;
END $$;
```

### Delete all users:
```sql
DELETE FROM webauthn_credentials;
DELETE FROM player_stats;
DELETE FROM profiles;
DELETE FROM auth.users;
```

## Troubleshooting

### "Permission denied" error
- You need admin/owner privileges
- Use Supabase Dashboard instead (Method 1)

### "Foreign key constraint" error
- Delete in this order:
  1. `webauthn_credentials`
  2. `player_stats`
  3. `profiles`
  4. `auth.users`

### User still exists after deletion
- Check if email confirmation is pending
- Try deleting from Dashboard instead
- Clear browser cache/cookies

## Quick Test Reset

For quick testing, you can also:
1. Use a different email (e.g., `test2@example.com`)
2. Use email aliases (e.g., `test+1@example.com`, `test+2@example.com`)
3. Use temporary email services

---

**Recommended**: Use **Method 1** (Dashboard) for safety and ease of use.

