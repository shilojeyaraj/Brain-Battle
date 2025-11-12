# 🚨 Quick Fix for Migration Error

## The Problem

You're getting this error:
```
ERROR: 23503: insert or update on table "player_stats" violates foreign key constraint
DETAIL: Key (user_id)=(6620ce9e-0c17-418b-bf6d-65365c428a3e) is not present in table "users".
```

This means you have **existing data** in your tables that references the old `users` table, but the foreign keys are now pointing to `auth.users` which doesn't have those users yet.

## Solution Options

### Option 1: Start Fresh (Development Only) ⚡

If you're in development and don't need to keep existing data:

```sql
-- 1. Delete all existing data
TRUNCATE player_stats, game_rooms, room_members, documents, 
         player_answers, game_results, leaderboard, quiz_sessions, 
         questions CASCADE;

-- 2. Now run the migration script again
-- migrate-to-supabase-auth-fixed.sql
```

### Option 2: Check What Data Exists First 🔍

Run this to see what you have:

```sql
-- Check data counts
SELECT 
  'player_stats' as table_name, COUNT(*) as count FROM player_stats
UNION ALL
SELECT 'game_rooms', COUNT(*) FROM game_rooms
UNION ALL
SELECT 'room_members', COUNT(*) FROM room_members
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'player_answers', COUNT(*) FROM player_answers
UNION ALL
SELECT 'game_results', COUNT(*) FROM game_results
UNION ALL
SELECT 'leaderboard', COUNT(*) FROM leaderboard;
```

### Option 3: Temporarily Disable Foreign Keys (Not Recommended)

If you MUST keep the data and migrate users later:

```sql
-- 1. Drop the foreign key constraints temporarily
ALTER TABLE player_stats DROP CONSTRAINT IF EXISTS player_stats_user_id_fkey;
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_host_id_fkey;
ALTER TABLE room_members DROP CONSTRAINT IF EXISTS room_members_user_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey;
ALTER TABLE player_answers DROP CONSTRAINT IF EXISTS player_answers_user_id_fkey;
ALTER TABLE game_results DROP CONSTRAINT IF EXISTS game_results_user_id_fkey;
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_user_id_fkey;

-- 2. Run the rest of the migration (profiles table, triggers, etc.)
-- (Skip the foreign key creation parts)

-- 3. Later, after migrating users, add the foreign keys back:
ALTER TABLE player_stats
  ADD CONSTRAINT player_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- ... repeat for other tables
```

## Recommended Approach

**If you're in development:** Use Option 1 (delete all data, start fresh)

**If you have production data:** 
1. First, run `migrate-with-existing-data.sql` to check what you have
2. Migrate users from `users` table to `auth.users` (see `migrate-existing-users.md`)
3. Then run `migrate-to-supabase-auth-fixed.sql`

## Step-by-Step for Development

1. **Delete all data:**
   ```sql
   TRUNCATE player_stats, game_rooms, room_members, documents, 
            player_answers, game_results, leaderboard, quiz_sessions, 
            questions CASCADE;
   ```

2. **Run the fixed migration:**
   - Use `migrate-to-supabase-auth-fixed.sql`

3. **Test signup/login:**
   - Create a new account
   - It should work now!

## Need Help?

If you're not sure which option to use, tell me:
- Are you in development or production?
- Do you need to keep existing user data?
- How many users/data records do you have?


