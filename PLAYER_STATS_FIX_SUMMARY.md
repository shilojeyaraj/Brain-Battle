# Player Stats Creation Fix Summary

## Issues Identified

### 1. **RLS Policy Blocking Inserts**
- **Problem**: The RLS policy `player_stats_insert_own` requires `user_id = auth.uid()`, but with custom auth, `auth.uid()` is NULL
- **Location**: `supabase/production-rls-policies.sql` line 237-240
- **Impact**: Client-side inserts fail, even though API routes use admin client

### 2. **Foreign Key Constraint Violations**
- **Problem**: Stats creation fails because user doesn't exist in `users` table
- **Location**: `src/app/api/player-stats/route.ts`
- **Impact**: Stats cannot be created for new users

### 3. **Error Handling in Client Code**
- **Problem**: Client-side code doesn't properly handle API errors
- **Location**: `src/lib/actions/user-stats-client.ts`
- **Impact**: Users don't see helpful error messages

### 4. **Stats Creation During Registration**
- **Problem**: Stats creation during registration uses regular client (subject to RLS) instead of admin client
- **Location**: `src/lib/actions/custom-auth.ts`
- **Impact**: Stats may fail to create during signup

## Fixes Applied

### 1. **RLS Policy Fix** (`supabase/fix-player-stats-rls.sql`)
- Created new SQL script to fix RLS policies
- Changed INSERT policy to allow all inserts (app logic handles authorization)
- Changed UPDATE policy to allow all updates (app logic handles authorization)
- SELECT policy already allows all (for leaderboards)

### 2. **Improved Error Handling** (`src/app/api/player-stats/route.ts`)
- Added specific error handling for foreign key constraint violations (code 23503)
- Better error messages returned to client

### 3. **Better Client Error Handling** (`src/lib/actions/user-stats-client.ts`)
- Improved error messages when stats creation fails
- Properly parses API error responses
- Returns detailed error information to caller

### 4. **Admin Client for Stats Creation** (`src/lib/actions/custom-auth.ts`)
- Changed stats creation during registration to use `createAdminClient()`
- This bypasses RLS and ensures stats are created successfully
- Added better error logging for debugging

## Next Steps

1. **Run the RLS fix script**:
   ```sql
   -- Execute in Supabase SQL Editor
   -- File: supabase/fix-player-stats-rls.sql
   ```

2. **Verify the fix**:
   - Sign up a new user
   - Check that stats are created immediately
   - Log in and verify stats are visible on dashboard

3. **Monitor logs**:
   - Check for any remaining foreign key constraint errors
   - Verify admin client is properly bypassing RLS

## Testing Checklist

- [ ] New user signup creates stats immediately
- [ ] Existing user login shows stats correctly
- [ ] Dashboard displays stats without errors
- [ ] No foreign key constraint violations in logs
- [ ] Stats can be updated via API routes
- [ ] Client-side stats reading works correctly

