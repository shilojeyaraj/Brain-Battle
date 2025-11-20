# Authentication Testing Guide

## Quick Test Steps

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Sign Up
1. Navigate to: `http://localhost:3000/signup`
2. Fill in the form:
   - **Username:** `testuser123`
   - **Email:** `test@example.com`
   - **Password:** `password123`
   - **Confirm Password:** `password123`
3. Click "Create Account"
4. **Expected Result:**
   - ✅ Redirects to `/dashboard?userId={uuid}&newUser=true`
   - ✅ Dashboard loads
   - ✅ User stats display (Level 1, 0 XP)
   - ✅ Check browser console for: `✅ [DASHBOARD] User session stored`

### 3. Test Login
1. Navigate to: `http://localhost:3000/login`
2. Fill in the form:
   - **Email:** `test@example.com`
   - **Password:** `password123`
3. Click "Sign In"
4. **Expected Result:**
   - ✅ Redirects to `/dashboard?userId={uuid}`
   - ✅ Dashboard loads with user data
   - ✅ Check browser console for: `✅ [AUTH] User authenticated successfully`

### 4. Test Session Persistence
1. After successful login, refresh the page (F5)
2. **Expected Result:**
   - ✅ Still logged in
   - ✅ Dashboard shows user data
   - ✅ Check browser console: `✅ [DASHBOARD] User session found`
   - ✅ Check localStorage in DevTools: `userId` key exists

### 5. Test Logout
1. Click the logout button (top right of dashboard)
2. **Expected Result:**
   - ✅ Redirects to home page (`/`)
   - ✅ localStorage cleared
   - ✅ Cannot access dashboard (would redirect to login)

### 6. Test Protected Routes
1. Try to access `/dashboard` without logging in
2. **Expected Result:**
   - ⚠️ Currently no protection (this is a security issue to fix)
   - Dashboard might show "User not authenticated" error

---

## Database Verification

### Check if User was Created
1. Go to Supabase Dashboard
2. Navigate to Table Editor → `users` table
3. **Look for:**
   - Email: `test@example.com`
   - Username: `testuser123`
   - `password_hash` should be a long bcrypt hash (not plain text)
   - `created_at` should be set

### Check if Player Stats were Created
1. Navigate to Table Editor → `player_stats` table
2. **Look for:**
   - `user_id` matches the user ID from users table
   - `level` = 1
   - `xp` = 0
   - `total_games` = 0

### Check Last Login Update
1. After logging in, check `users` table
2. **Look for:**
   - `last_login` field should be updated with current timestamp

---

## Common Issues & Solutions

### Issue 1: "User already exists"
**Solution:** Use a different email or delete the test user from database

### Issue 2: "Invalid email or password"
**Solution:** 
- Check email is correct (case-insensitive)
- Check password is correct
- Verify user exists in database

### Issue 3: Dashboard shows "User not authenticated"
**Solution:**
- Check localStorage has `userId` key
- Check browser console for errors
- Try logging in again

### Issue 4: Redirect doesn't work
**Solution:**
- Check browser console for errors
- Verify server is running
- Check network tab for failed requests

---

## Browser Console Commands

### Check Session
```javascript
// In browser console
localStorage.getItem('userId')
localStorage.getItem('user')
```

### Clear Session
```javascript
// In browser console
localStorage.clear()
```

### Test Authentication Functions
```javascript
// These are server-side only, but you can check the network tab
// to see if API calls are being made
```

---

## Expected Console Logs

### Successful Sign Up
```
🚀 [AUTH] Starting registration for: test@example.com
✅ [AUTH] No existing user found, proceeding with registration
✅ [AUTH] Username is available (no existing user found)
🔐 [AUTH] Password hashed successfully
✅ [AUTH] User created successfully: {uuid}
✅ [AUTH] Player stats created successfully
✅ [AUTH] Registration completed successfully
✅ [DASHBOARD] User session stored: {uuid}
```

### Successful Login
```
🔐 [AUTH] Authenticating user: test@example.com
🔍 [AUTH] Looking for user with email: test@example.com
✅ [AUTH] User found: testuser123
✅ [AUTH] User authenticated successfully: testuser123
✅ [LOGIN] Authentication successful, redirecting to dashboard
✅ [DASHBOARD] User session stored: {uuid}
```

---

## Security Notes

⚠️ **Current Issues:**
- User ID exposed in URL (should use secure cookies)
- No server-side session validation
- localStorage is client-side only (not secure for production)

✅ **What Works:**
- Password hashing (bcrypt)
- User creation in database
- Session storage (localStorage)
- Logout clears session

---

## Next Steps After Testing

1. **If everything works:** Proceed with production features
2. **If issues found:** Fix them before moving forward
3. **Security improvements needed:**
   - Implement secure session management
   - Add authentication middleware
   - Protect routes with server-side checks

---

**Test Date:** [Fill in when testing]
**Tester:** [Your name]
**Results:** [Pass/Fail for each test]

