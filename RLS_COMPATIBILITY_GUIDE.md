# RLS Compatibility Guide for Custom Authentication

## Overview

This project uses **custom authentication** (not Supabase Auth), which means `auth.uid()` is always `NULL`. However, the RLS policies require `auth.uid() = id` or `auth.uid() = user_id` for most operations.

## Solution Strategy

Since custom auth doesn't set `auth.uid()`, we use the **admin client** (service role key) to bypass RLS for server-side operations that need to access the database.

## Key Changes Made

### 1. Authentication Functions (`src/lib/actions/custom-auth.ts`)
- ✅ `registerUser()` - Uses `createAdminClient()` to bypass RLS when creating users
- ✅ `authenticateUser()` - Uses `createAdminClient()` to bypass RLS when querying users by email

### 2. Client-Side Operations (`src/lib/actions/user-stats-client.ts`)
- ✅ Profile creation - Now calls `/api/user-profile` API route (uses admin client)
- ✅ Stats creation - Now calls `/api/player-stats` API route (uses admin client)
- ✅ Profile/stats reads - Still use regular client (SELECT policies allow all)

### 3. New API Routes Created

#### `/api/user-profile` (POST)
- Creates or updates user profiles
- Uses admin client to bypass RLS
- Called by client-side code when profile doesn't exist

#### `/api/player-stats` (POST)
- Creates or updates player stats
- Uses admin client to bypass RLS
- Called by client-side code when stats don't exist

#### `/api/user-stats` (GET)
- Updated to use admin client instead of regular client
- Removed dependency on `supabase.auth.getUser()` (doesn't work with custom auth)
- Now requires `userId` query parameter

### 4. Existing API Routes

#### `/api/quiz-results` (POST)
- ✅ Already uses admin client for INSERT operations
- ✅ Uses regular client for auth check (but this won't work with custom auth - needs update)

## RLS Policy Behavior

### Users Table
- **SELECT**: Requires `auth.uid() = id` ❌ (blocks custom auth)
- **INSERT**: Allows `auth.uid() = id OR auth.uid() IS NULL` ✅ (works for registration)
- **UPDATE**: Requires `auth.uid() = id` ❌ (blocks custom auth)

### Profiles Table
- **SELECT**: Allows all (`USING (true)`) ✅ (works with regular client)
- **INSERT**: Requires `auth.uid() = user_id` ❌ (blocks custom auth)
- **UPDATE**: Requires `auth.uid() = user_id` ❌ (blocks custom auth)

### Player Stats Table
- **SELECT**: Allows all (`USING (true)`) ✅ (works with regular client)
- **INSERT**: Requires `auth.uid() = user_id` ❌ (blocks custom auth)
- **UPDATE**: Requires `auth.uid() = user_id` ❌ (blocks custom auth)

## When to Use Admin Client

### ✅ Use Admin Client For:
1. **Authentication operations** (login, signup)
2. **Server-side INSERT/UPDATE operations** on users/profiles/stats
3. **API routes** that need to bypass RLS
4. **Any operation** that requires `auth.uid()` but custom auth doesn't provide it

### ❌ Don't Use Admin Client For:
1. **Client-side operations** (use API routes instead)
2. **Public read operations** (SELECT policies allow all for profiles/stats)
3. **Operations that don't touch users/profiles/stats**

## Security Considerations

⚠️ **Important**: The admin client bypasses ALL RLS policies. Always:
- Validate `userId` in API routes before using admin client
- Only use admin client server-side (never expose service role key to client)
- Add application-level authorization checks (e.g., verify user owns the data they're accessing)

## Testing Checklist

- [ ] User registration creates user and stats successfully
- [ ] User login works correctly
- [ ] Profile creation via API route works
- [ ] Stats creation via API route works
- [ ] User stats API returns correct data
- [ ] Client-side profile/stats reads work (SELECT policies allow all)

## Future Improvements

1. **Update RLS policies** to work with custom auth (use user_id matching instead of auth.uid())
2. **Add application-level authorization** middleware for API routes
3. **Create helper functions** for common admin client operations
4. **Add rate limiting** to admin client API routes

