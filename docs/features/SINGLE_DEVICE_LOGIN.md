# Single-Device Login Feature

## Overview

This feature ensures that users can only be logged in on **one device at a time**. When a user logs in on a new device, their previous session on any other device is automatically invalidated.

## How It Works

### 1. Session Tracking
- Each login creates a unique session ID stored in the JWT token
- Session information is stored in the `user_sessions` database table
- Each session includes:
  - User ID
  - Unique session token (session ID)
  - Expiration time
  - Active status
  - User agent and IP address (for tracking)

### 2. Login Process
When a user logs in:
1. **Previous sessions are invalidated** - All active sessions for that user are marked as `is_active = false`
2. **New session is created** - A new session record is created in the database
3. **Session ID is embedded in JWT** - The session ID is included in the signed JWT token
4. **Cookie is set** - The JWT token is stored in an HTTP-only cookie

### 3. Session Validation
On every authenticated request:
1. JWT token is verified and decoded
2. Session ID is extracted from the token
3. Database is checked to verify:
   - Session exists
   - Session is active (`is_active = true`)
   - Session hasn't expired
4. If validation fails, user is treated as not authenticated

### 4. Logout Process
When a user logs out:
1. Session cookie is cleared
2. Session is marked as inactive in the database

## Database Schema

### `user_sessions` Table

```sql
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_token TEXT NOT NULL UNIQUE,  -- Session ID stored in JWT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  user_agent TEXT,
  ip_address TEXT
);
```

## Implementation Details

### Files Modified

1. **`supabase/migrations/add-user-sessions-table.sql`**
   - Creates `user_sessions` table
   - Sets up RLS policies
   - Adds cleanup function for expired sessions

2. **`src/lib/auth/session-cookies.ts`**
   - Updated `createSessionToken()` to include session ID
   - Updated `verifySessionToken()` to return both userId and sessionId
   - Added `validateSessionInDatabase()` to check session validity
   - Updated `setSessionCookie()` to:
     - Invalidate previous sessions
     - Create new session record
     - Include session ID in JWT
   - Updated `getUserIdFromSession()` and `getUserIdFromRequest()` to validate sessions

3. **`src/lib/actions/custom-auth.ts`**
   - Updated `login()` to use new session management
   - Updated `logout()` to mark session as inactive

4. **`src/app/api/auth/login/route.ts`**
   - Updated to pass request object to `setSessionCookie()` for IP/user-agent tracking

## User Experience

### What Users See

1. **Normal Login**: User logs in on Device A → Works normally
2. **Second Device Login**: User logs in on Device B → Device A session is invalidated
3. **Device A Behavior**: 
   - User tries to use Device A
   - Next request fails authentication
   - User is redirected to login page
   - User sees they need to log in again

### Benefits

- ✅ Prevents conflicts from multiple simultaneous sessions
- ✅ Better security (stolen session tokens become invalid on new login)
- ✅ Prevents race conditions in multiplayer games
- ✅ Ensures consistent state across the application

## Migration Steps

1. **Run the migration:**
   ```sql
   -- Run supabase/migrations/add-user-sessions-table.sql
   ```

2. **Deploy the code changes:**
   - All session management code is updated
   - Existing sessions will be invalidated on next login

3. **No user action required:**
   - Users will automatically get single-device enforcement
   - They'll just need to log in again if they try to use a second device

## Testing

### Test Scenarios

1. **Login on Device A:**
   - Login should succeed
   - Check `user_sessions` table - should have one active session

2. **Login on Device B (same user):**
   - Login should succeed
   - Check `user_sessions` table - Device A session should be `is_active = false`
   - Device B session should be `is_active = true`

3. **Try to use Device A:**
   - Make an authenticated request
   - Should fail with 401 Unauthorized
   - Should redirect to login page

4. **Logout from Device B:**
   - Logout should succeed
   - Check `user_sessions` table - Device B session should be `is_active = false`

## Troubleshooting

### Issue: User can't log in after logging in on another device
**Expected behavior** - This is by design. The user needs to log in again on the first device.

### Issue: Sessions not being invalidated
**Check:**
- Database migration was run successfully
- `user_sessions` table exists
- RLS policies allow service_role to update sessions
- Check server logs for errors during session invalidation

### Issue: Performance concerns
**Optimization:**
- Indexes are created on `user_id` and `session_token` for fast lookups
- Expired sessions can be cleaned up periodically using `cleanup_expired_sessions()` function
- Consider adding a cron job to clean up expired sessions daily

## Security Considerations

- ✅ Session IDs are unique and unpredictable (UUIDs)
- ✅ Sessions are validated on every request
- ✅ Expired sessions are automatically invalidated
- ✅ HTTP-only cookies prevent XSS attacks
- ✅ Secure flag in production prevents MITM attacks
- ✅ Session tokens are signed with JWT to prevent tampering

## Future Enhancements

Potential improvements:
- Allow users to see active sessions in their profile
- Allow users to manually revoke sessions
- Add "Remember this device" option (would allow multiple devices)
- Add session activity logging
- Add notifications when session is invalidated

