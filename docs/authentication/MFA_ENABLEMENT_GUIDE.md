# 🔐 MFA Enablement Guide

Complete guide to enabling and configuring Multi-Factor Authentication (MFA) in Brain Battle.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Configuration](#supabase-configuration)
3. [Application Setup](#application-setup)
4. [Email MFA Setup](#email-mfa-setup)
5. [TOTP MFA Setup](#totp-mfa-setup)
6. [Testing MFA](#testing-mfa)
7. [Troubleshooting](#troubleshooting)
8. [Production Considerations](#production-considerations)

---

## Prerequisites

Before enabling MFA, ensure you have:

- ✅ Supabase project created and configured
- ✅ Environment variables set up (`.env.local`)
- ✅ Database migrations applied (`clean-and-migrate.sql`)
- ✅ Supabase Auth enabled in your project
- ✅ User registration flow working

---

## Supabase Configuration

### Step 1: Enable MFA in Supabase Dashboard

1. **Navigate to Authentication Settings**
   - Go to your Supabase Dashboard
   - Click on **Authentication** in the left sidebar
   - Click on **Settings** (or **Policies**)

2. **Enable Multi-Factor Authentication**
   - Find the **Multi-Factor Authentication** section
   - Toggle **Enable MFA** to `ON`
   - Select which MFA factors you want to allow:
     - ✅ **TOTP** (Time-based One-Time Password) - Recommended
     - ✅ **Email OTP** - Recommended for ease of use
     - ⚠️ **SMS OTP** - Requires additional setup (Twilio, etc.)

3. **Configure Email Settings** (for Email MFA)
   - Go to **Authentication** → **Email Templates**
   - Ensure email sending is configured
   - Test that emails are being sent correctly

4. **Email Confirmation Settings** (Important!)
   - Go to **Authentication** → **Settings**
   - For **development**: Disable "Enable email confirmations" to allow immediate MFA setup after signup
   - For **production**: Keep email confirmations enabled for security

### Step 2: Verify Database Schema

Ensure your database has the correct schema. Run the migration script:

```sql
-- This should already be done, but verify:
-- 1. profiles table exists
-- 2. player_stats table exists
-- 3. All foreign keys point to auth.users
```

Run the migration:
```bash
# In Supabase SQL Editor, run:
supabase/clean-and-migrate.sql
```

---

## Application Setup

### Step 1: Environment Variables

Ensure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 2: Verify Code Files

Ensure these files exist and are properly configured:

- ✅ `src/lib/auth/supabase-auth.ts` - Authentication functions
- ✅ `src/app/signup/mfa-setup/page.tsx` - MFA setup page
- ✅ `src/app/login/page.tsx` - Login with MFA support
- ✅ `src/components/auth/mfa-verification.tsx` - TOTP verification
- ✅ `src/components/auth/email-mfa-verification.tsx` - Email OTP verification

### Step 3: Install Dependencies

All required dependencies should already be installed:

```bash
npm install @supabase/ssr @supabase/supabase-js
```

---

## Email MFA Setup

### How It Works

Email MFA sends a 6-digit code to the user's email address during login. The user must enter this code to complete authentication.

### User Flow

1. **Signup Flow:**
   - User signs up → Redirected to `/signup/mfa-setup`
   - User chooses "Email OTP" → System enrolls email as MFA factor
   - System sends verification code to email
   - User enters code → MFA enabled

2. **Login Flow:**
   - User enters email/password → System checks if MFA is enabled
   - If MFA enabled → System sends code to email
   - User enters code → Login successful

### Enabling Email MFA for New Users

Email MFA is automatically prompted during signup. The flow is:

```
Signup → MFA Setup Page → Choose Email OTP → Verify Code → Dashboard
```

### Enabling Email MFA for Existing Users

1. Navigate to `/settings/mfa` (if you have a settings page)
2. Click "Enable Email MFA"
3. Enter verification code sent to email
4. MFA is now enabled

### Code Implementation

The Email MFA enrollment happens in `src/app/signup/mfa-setup/page.tsx`:

```typescript
const handleEmailSetup = async () => {
  // 1. Get authenticated user session
  const { data: { user } } = await supabase.auth.getUser()
  
  // 2. Enroll email as MFA factor
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'email',
    friendlyName: 'Email Verification'
  })
  
  // 3. Send verification code
  await supabase.auth.mfa.challenge({
    factorId: data.id
  })
  
  // 4. User enters code to verify
}
```

---

## TOTP MFA Setup

### How It Works

TOTP (Time-based One-Time Password) uses authenticator apps like Google Authenticator, Authy, or Microsoft Authenticator to generate 6-digit codes.

### User Flow

1. **Setup Flow:**
   - User chooses "TOTP" on MFA setup page
   - System generates QR code
   - User scans QR code with authenticator app
   - User enters code from app → MFA enabled

2. **Login Flow:**
   - User enters email/password
   - If MFA enabled → User enters code from authenticator app
   - Login successful

### Enabling TOTP MFA

The TOTP setup is available in `src/app/signup/mfa-setup/page.tsx`:

```typescript
const handleTOTPSetup = async () => {
  // 1. Enroll TOTP factor
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Brain Battle Authenticator'
  })
  
  // 2. Display QR code (data.qr_code)
  // 3. User scans with authenticator app
  // 4. User enters code to verify
}
```

### Recommended Authenticator Apps

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (with TOTP support)

---

## Testing MFA

### Test Email MFA Flow

1. **Signup Test:**
   ```bash
   # Start dev server
   npm run dev
   
   # Navigate to http://localhost:3000/signup
   # 1. Create new account
   # 2. Should redirect to /signup/mfa-setup
   # 3. Choose "Email OTP"
   # 4. Check email for code
   # 5. Enter code
   # 6. Should redirect to dashboard
   ```

2. **Login Test:**
   ```bash
   # 1. Navigate to http://localhost:3000/login
   # 2. Enter email/password
   # 3. Should prompt for MFA code
   # 4. Check email for code
   # 5. Enter code
   # 6. Should login successfully
   ```

### Test TOTP MFA Flow

1. **Setup Test:**
   ```bash
   # 1. Sign up or go to /signup/mfa-setup
   # 2. Choose "TOTP"
   # 3. Scan QR code with authenticator app
   # 4. Enter code from app
   # 5. Should enable MFA
   ```

2. **Login Test:**
   ```bash
   # 1. Login with email/password
   # 2. Enter code from authenticator app
   # 3. Should login successfully
   ```

### Test Without Email Confirmation

For faster testing during development:

1. **Disable Email Confirmation:**
   - Supabase Dashboard → Authentication → Settings
   - Disable "Enable email confirmations"
   - This allows immediate session creation after signup

2. **Test Flow:**
   - Signup → Immediate redirect to MFA setup
   - No need to confirm email first

---

## Troubleshooting

### Issue: "No email address found" Error

**Cause:** No authenticated session available after signup.

**Solutions:**

1. **Check Email Confirmation Settings:**
   - If email confirmation is enabled, users must confirm email first
   - Disable for development: Supabase Dashboard → Authentication → Settings

2. **Check Session:**
   ```typescript
   // In browser console:
   const { data: { session } } = await supabase.auth.getSession()
   console.log('Session:', session)
   ```

3. **Verify Redirect:**
   - Check that signup redirects to `/signup/mfa-setup?userId=...&email=...`
   - Email should be in URL params

### Issue: MFA Enrollment Fails

**Cause:** User doesn't have an authenticated session.

**Solutions:**

1. **Ensure Session Exists:**
   ```typescript
   // Check session before enrollment
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) {
     // Handle no session
   }
   ```

2. **Check Supabase MFA Settings:**
   - Verify MFA is enabled in Supabase Dashboard
   - Check that Email OTP or TOTP is allowed

### Issue: Email Codes Not Received

**Solutions:**

1. **Check Email Configuration:**
   - Supabase Dashboard → Authentication → Email Templates
   - Verify SMTP settings are configured
   - Test email sending

2. **Check Spam Folder:**
   - Email codes might be in spam

3. **Check Email Rate Limits:**
   - Supabase has rate limits on email sending
   - Wait a few minutes between attempts

### Issue: TOTP QR Code Not Displaying

**Solutions:**

1. **Check QR Code Generation:**
   ```typescript
   const { data } = await supabase.auth.mfa.enroll({
     factorType: 'totp'
   })
   console.log('QR Code:', data.qr_code)
   ```

2. **Verify QR Code Library:**
   - Ensure QR code rendering library is installed
   - Check that `data.qr_code` is being used correctly

### Issue: Session Expires During MFA Setup

**Solutions:**

1. **Increase Session Timeout:**
   - Supabase Dashboard → Authentication → Settings
   - Adjust session timeout settings

2. **Refresh Session:**
   ```typescript
   await supabase.auth.refreshSession()
   ```

---

## Production Considerations

### Security Best Practices

1. **Enable Email Confirmation:**
   - Always enable email confirmation in production
   - This ensures users verify their email before enabling MFA

2. **Rate Limiting:**
   - Implement rate limiting on MFA attempts
   - Prevent brute force attacks on MFA codes

3. **Backup Codes:**
   - Consider implementing backup codes for MFA recovery
   - Store securely (encrypted)

4. **Session Management:**
   - Use secure, HTTP-only cookies for sessions
   - Implement proper session timeout

### Email Configuration

1. **Custom SMTP:**
   - Use custom SMTP for production emails
   - Configure in Supabase Dashboard → Authentication → Email Templates

2. **Email Templates:**
   - Customize MFA email templates
   - Include branding and clear instructions

### Monitoring

1. **Track MFA Enrollment:**
   - Monitor how many users enable MFA
   - Track which MFA type is most popular

2. **Error Logging:**
   - Log MFA-related errors
   - Monitor failed MFA attempts

3. **User Support:**
   - Provide clear instructions for users
   - Have support process for MFA issues

---

## Quick Reference

### Enable MFA in Supabase
```
Dashboard → Authentication → Settings → Enable MFA
```

### Disable Email Confirmation (Development)
```
Dashboard → Authentication → Settings → Disable "Enable email confirmations"
```

### Test Email MFA
```
1. Signup → Choose Email OTP → Enter code from email
2. Login → Enter code from email
```

### Test TOTP MFA
```
1. Signup → Choose TOTP → Scan QR → Enter code
2. Login → Enter code from authenticator app
```

### Common Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Next Steps

After enabling MFA:

1. ✅ Test the complete flow (signup → MFA setup → login)
2. ✅ Test MFA verification during login
3. ✅ Test error handling (wrong codes, expired codes)
4. ✅ Set up email templates in Supabase
5. ✅ Configure production SMTP settings
6. ✅ Add MFA management page for users (`/settings/mfa`)
7. ✅ Implement backup codes (optional)
8. ✅ Add analytics/monitoring

---

## Support

If you encounter issues:

1. Check Supabase Dashboard logs
2. Check browser console for errors
3. Verify environment variables
4. Check Supabase MFA documentation: https://supabase.com/docs/guides/auth/mfa

---

**Last Updated:** 2025-01-10
**Version:** 1.0.0

