# Singleplayer RLS Policy Fix

## Problem

Singleplayer games are not saving to the database because Row Level Security (RLS) policies are blocking inserts. The policies require a `room_id` and room membership, but singleplayer games have `room_id: null`.

## Root Cause

1. **`quiz_sessions_insert` policy**: Requires `room_id` to exist and user to be a member
2. **`questions_insert` policy**: Requires session to have a `room_id` in `game_rooms`
3. **`player_answers_insert` policy**: Requires `room_id` to exist in `game_rooms`
4. **`game_results` table**: Has NO INSERT policy (comment says "API uses service role" but API actually uses anon key)

## Solution

Run the SQL script `supabase/fix-singleplayer-rls.sql` to update RLS policies to allow singleplayer games where `room_id IS NULL`.

## How to Apply the Fix

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/fix-singleplayer-rls.sql`
4. Run the script
5. Verify the policies were created by checking the output

## What the Fix Does

- **`quiz_sessions`**: Allows creating sessions with `room_id IS NULL` (singleplayer)
- **`questions`**: Allows inserting questions for singleplayer sessions
- **`player_answers`**: Allows inserting answers with `room_id IS NULL`
- **`game_results`**: Adds INSERT policy to allow creating game results

## Verification

After running the script, try completing a singleplayer quiz. You should see:
- `quiz_sessions` table populated
- `questions` table populated
- `player_answers` table populated
- `game_results` table populated
- `player_stats` updated

## Alternative Solution (Not Recommended)

If you want to bypass RLS entirely for API routes, you could:
1. Create a service role client in `src/lib/supabase/server-admin.ts`
2. Use it in API routes instead of the regular client

However, this is less secure and not recommended. The RLS fix is the proper solution.

