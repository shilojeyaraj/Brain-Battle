# 🧪 Test MFA Now - Step by Step

Since MFA is already enabled in Supabase, let's test the complete flow!

## ✅ Step 1: Start Your Dev Server

```bash
npm run dev
```

Open http://localhost:3000

## ✅ Step 2: Sign Up a New Account (or use existing)

1. Go to **http://localhost:3000/signup**
2. Create a new account:
   - Username
   - Email
   - Password
3. Click **"Create Account"**
4. You should be redirected to dashboard

## ✅ Step 3: Enable MFA for Your Account

1. Navigate to **http://localhost:3000/settings/mfa**
   - Or add a link to this page in your dashboard/settings
2. You should see the **"Enable MFA"** button
3. Click it
4. A **QR code** will appear

## ✅ Step 4: Scan QR Code with Authenticator App

1. **Download an authenticator app** (if you don't have one):
   - Google Authenticator: https://apps.apple.com/app/google-authenticator/id388497605
   - Or Microsoft Authenticator
   - Or Authy

2. **Open the app** and tap **"+"** or **"Add Account"**
3. **Scan the QR code** on your screen
4. The app will show a **6-digit code** that changes every 30 seconds

## ✅ Step 5: Verify MFA Setup

1. **Enter the 6-digit code** from your authenticator app
2. Click **"Verify & Enable"**
3. You should see **"MFA Enabled"** ✅

## ✅ Step 6: Test Login with MFA

1. **Log out** (or open incognito window)
2. Go to **http://localhost:3000/login**
3. Enter your **email and password**
4. Click **"Sign In"**
5. **You should now see the MFA code input screen!** 🔐
6. **Open your authenticator app**
7. **Enter the 6-digit code**
8. Click **"Verify Code"**
9. You should be logged in and redirected to dashboard! 🎉

## 🎯 What Should Happen

### ✅ Success Indicators:
- QR code displays when enabling MFA
- Code verification works
- Login shows MFA input when MFA is enabled
- Can log in successfully with MFA code

### ❌ If Something Doesn't Work:

**Issue: Can't access `/settings/mfa`**
- Add a link in your dashboard or navigation
- Or manually type the URL: `http://localhost:3000/settings/mfa`

**Issue: QR code doesn't appear**
- Check browser console for errors
- Make sure you're logged in
- Check Supabase Dashboard → Authentication → MFA is enabled

**Issue: "MFA not configured" error**
- Make sure MFA is enabled in Supabase Dashboard
- Try refreshing the page
- Check browser console for detailed errors

**Issue: Login doesn't show MFA input**
- Make sure MFA is actually enabled for your account
- Check that you verified the code during setup
- Check browser console for errors

## 🔍 Debugging Tips

1. **Open browser console** (F12) to see any errors
2. **Check Supabase Dashboard** → Authentication → Users → Your user → Check MFA factors
3. **Verify MFA is enabled** in Supabase Dashboard → Authentication → Settings

## 📝 Quick Checklist

- [ ] Dev server running
- [ ] Signed up/logged in
- [ ] Can access `/settings/mfa`
- [ ] QR code appears
- [ ] Scanned QR code with authenticator app
- [ ] Verified code successfully
- [ ] Logged out
- [ ] Login shows MFA input
- [ ] Can log in with MFA code

---

**Ready?** Start with Step 1 and work through each step. Let me know if you hit any issues!

