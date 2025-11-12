# 🔐 MFA Setup Instructions

Complete guide to enable and use Multi-Factor Authentication (MFA) in Brain Battle.

## Step 1: Enable MFA in Supabase Dashboard ✅

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**
3. Scroll down to **Multi-Factor Authentication**
4. Enable **TOTP (Time-based One-Time Password)**
5. Optionally configure:
   - **Issuer name**: "Brain Battle" (or your app name)
   - **MFA required**: Leave unchecked (optional MFA, not required)
6. Click **Save**

## Step 2: Install Authenticator App 📱

Download one of these apps on your phone:
- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android)
- **1Password** (iOS/Android)

## Step 3: Enable MFA for Your Account 🚀

1. **Sign in** to Brain Battle
2. Navigate to **Settings** → **MFA** (or go to `/settings/mfa`)
3. Click **"Enable MFA"**
4. **Scan the QR code** with your authenticator app
   - Or manually enter the code shown below the QR
5. **Enter the 6-digit code** from your authenticator app
6. Click **"Verify & Enable"**

✅ **MFA is now enabled!**

## Step 4: Using MFA When Logging In 🔑

1. **Enter your email and password** as usual
2. If MFA is enabled, you'll see the **MFA code input screen**
3. **Open your authenticator app**
4. **Enter the 6-digit code** shown in the app
5. Click **"Verify Code"**

You're now logged in!

## Managing MFA ⚙️

### Disable MFA
1. Go to **Settings** → **MFA**
2. Click **"Disable MFA"**
3. Confirm the action

### Lost Your Device?
If you lose access to your authenticator app:
1. Contact support to disable MFA
2. Re-enable MFA with a new device

## Security Tips 🛡️

1. **Backup Codes**: Save backup codes when setting up MFA (if provided)
2. **Multiple Devices**: Some authenticator apps allow syncing across devices
3. **Time Sync**: Ensure your phone's time is accurate (TOTP is time-based)
4. **Don't Share**: Never share your MFA codes or QR code

## Troubleshooting ❓

### "Invalid MFA code" Error
- **Check time sync**: Your phone's time must be accurate
- **Code expired**: Codes refresh every 30 seconds, try the next one
- **Wrong code**: Make sure you're entering the code for "Brain Battle"

### QR Code Not Scanning
- **Manual entry**: Use the secret code shown below the QR code
- **Brightness**: Increase your screen brightness
- **Distance**: Move your phone closer/farther from the screen

### Can't Access Authenticator App
- **Backup codes**: Use backup codes if you saved them
- **Contact support**: We can help disable MFA for your account

## Files Created 📁

- ✅ `src/app/settings/mfa/page.tsx` - MFA setup page
- ✅ `src/components/auth/mfa-verification.tsx` - MFA verification component
- ✅ Updated `src/app/login/page.tsx` - Handles MFA flow

## Testing Checklist ✅

- [ ] MFA enabled in Supabase Dashboard
- [ ] Can access `/settings/mfa` page
- [ ] Can scan QR code and enable MFA
- [ ] Can verify MFA code during setup
- [ ] Login requires MFA code when enabled
- [ ] Can disable MFA
- [ ] Can re-enable MFA

## Next Steps 🎯

1. **Enable MFA in Supabase Dashboard** (Step 1 above)
2. **Test the flow**:
   - Sign up a new account
   - Enable MFA
   - Log out and log back in
   - Verify MFA code is required
3. **Deploy** when ready!

---

**Need Help?** Check the Supabase MFA documentation: https://supabase.com/docs/guides/auth/mfa


