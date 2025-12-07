# Session Cookie Debugging Guide

## Issue
Users are being redirected to login when clicking singleplayer, even after logging in successfully.

## Root Cause
The singleplayer page was not checking authentication on page load. It only checked when buttons were clicked, which could cause issues if:
1. Session cookies weren't being sent with requests
2. Session cookies expired or were invalid
3. User navigated directly to `/singleplayer` without going through the dashboard

## Fixes Applied

### 1. Added Authentication Check to Singleplayer Page
- Added `useEffect` hook that checks authentication on page mount
- Shows loading state while checking
- Redirects to login if not authenticated
- Prevents page from rendering until auth is confirmed

### 2. Enhanced Session Cookie Settings
- Added support for `COOKIE_DOMAIN` environment variable for production
- Improved cookie settings for production (secure, sameSite: 'lax')
- Added debug logging in development mode

### 3. Enhanced API Debugging
- Added detailed logging to `/api/user/current` endpoint
- Logs cookie information, request headers, and authentication status
- Helps diagnose cookie issues in production

### 4. Ensured Credentials Are Included
- All fetch requests now include `credentials: 'include'`
- Ensures cookies are sent with API requests

## Environment Variables

### Required for Production
```bash
# Session secret (required)
SESSION_SECRET=your-secure-random-secret-here

# Optional: Cookie domain (if your app is on a subdomain)
# Example: .yourdomain.com (note the leading dot)
COOKIE_DOMAIN=.yourdomain.com
```

### Generating SESSION_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Debugging Steps

### 1. Check Browser Console
Look for these logs:
- `✅ [SINGLEPLAYER] User authenticated: <userId>` - Auth successful
- `❌ [SINGLEPLAYER] Not authenticated, redirecting to login` - Auth failed

### 2. Check Network Tab
1. Open browser DevTools → Network tab
2. Click singleplayer button
3. Look for `/api/user/current` request
4. Check:
   - **Request Headers**: Should include `Cookie: brain-brawl-session=...`
   - **Response**: Should return `{ success: true, userId: "..." }`
   - **Status**: Should be 200 (not 401)

### 3. Check Application Tab (Cookies)
1. Open browser DevTools → Application tab → Cookies
2. Look for `brain-brawl-session` cookie
3. Check:
   - **Domain**: Should match your production domain
   - **Path**: Should be `/`
   - **HttpOnly**: Should be checked
   - **Secure**: Should be checked in production (HTTPS only)
   - **SameSite**: Should be `Lax`
   - **Expires**: Should be in the future

### 4. Check Server Logs
Look for these logs in production:
- `✅ [SESSION] Session cookie set for user: <userId>` - Cookie set successfully
- `❌ [SESSION] Token verification failed` - Cookie invalid/expired
- `❌ [CURRENT USER API] Authentication failed` - No cookie found

## Common Issues

### Issue: Cookie Not Being Set
**Symptoms**: No `brain-brawl-session` cookie in browser
**Causes**:
- `SESSION_SECRET` not set in production
- Cookie domain mismatch
- HTTPS required but using HTTP

**Solutions**:
1. Verify `SESSION_SECRET` is set in production environment
2. Check `COOKIE_DOMAIN` matches your domain
3. Ensure site is served over HTTPS in production

### Issue: Cookie Not Being Sent
**Symptoms**: Cookie exists but not sent with requests
**Causes**:
- Missing `credentials: 'include'` in fetch requests
- CORS issues
- Cookie domain/path mismatch

**Solutions**:
1. Ensure all fetch requests include `credentials: 'include'`
2. Check CORS settings if using different domains
3. Verify cookie domain matches request domain

### Issue: Cookie Expired
**Symptoms**: Works initially, then stops working
**Causes**:
- Session expired (default: 7 days)
- Server time mismatch

**Solutions**:
1. Check server time is correct
2. Increase `SESSION_MAX_AGE` if needed (in `session-cookies.ts`)
3. Implement refresh token mechanism

### Issue: SameSite Cookie Issues
**Symptoms**: Cookie works in some browsers but not others
**Causes**:
- Browser SameSite policy changes
- Cross-site navigation

**Solutions**:
1. Ensure `sameSite: 'lax'` (already set)
2. For cross-site scenarios, may need `sameSite: 'none'` with `secure: true`
3. Test in different browsers

## Testing Checklist

- [ ] Login works and sets cookie
- [ ] Cookie persists after page refresh
- [ ] Singleplayer page loads without redirect
- [ ] Cookie is sent with API requests
- [ ] Works in production (HTTPS)
- [ ] Works across different browsers
- [ ] Session persists for 7 days
- [ ] Logout clears cookie

## Next Steps

If issues persist:
1. Check production logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test cookie settings in browser DevTools
4. Consider implementing refresh token mechanism
5. Add monitoring/alerting for authentication failures

