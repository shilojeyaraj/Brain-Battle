# Disable Email Confirmation

## Quick Steps

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **Authentication** in the left sidebar
   - Click **Settings** (or go to **Authentication** → **Settings**)

2. **Disable Email Confirmation**
   - Scroll down to **Email Auth** section
   - Find **"Enable email confirmations"** toggle
   - **Turn it OFF** (disable it)
   - Click **Save**

3. **Verify**
   - Users can now sign up and immediately log in
   - No email confirmation required
   - Users are created and can access the app right away

## What This Does

- ✅ Users can sign up and immediately use the app
- ✅ No waiting for email confirmation
- ✅ No email confirmation links needed
- ✅ Users are logged in immediately after signup

## Code Already Updated

The code has been updated to:
- Not require email confirmation (`emailRedirectTo: undefined`)
- Redirect directly to dashboard after signup
- Create user session immediately

## Important Notes

- ⚠️ **For Development**: Email confirmation is disabled - users can sign up immediately
- ⚠️ **For Production**: Consider re-enabling email confirmation for security (prevents fake accounts)
- Users can still verify their email later if needed (optional)

