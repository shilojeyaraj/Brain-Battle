# Moonshot API 401 Error - Complete Troubleshooting Guide

## Why You're Getting 401 Even With a New Key

A 401 "Invalid Authentication" error with a newly created key can happen for several reasons beyond just an invalid key:

### 1. **Key Activation Delay** ⏱️
- **Issue**: Some API providers have a delay (2-5 minutes) before new keys become active
- **Solution**: Wait 2-3 minutes after creating the key, then try again
- **Test**: Run `npm run test:moonshot` after waiting

### 2. **Account Verification Required** ✅
- **Issue**: Your Moonshot account might need email/phone verification
- **Check**: Log into https://platform.moonshot.cn/ and check for verification prompts
- **Solution**: Complete any required verification steps

### 3. **No Credits/Quota** 💰
- **Issue**: Your account might not have credits or quota to use the API
- **Check**: Go to Moonshot dashboard → Billing/Credits section
- **Solution**: Add credits or upgrade your plan if needed

### 4. **Account Restrictions** 🚫
- **Issue**: Your account might be suspended, restricted, or have limitations
- **Check**: Look for any warnings or restrictions in your Moonshot dashboard
- **Solution**: Contact Moonshot support if your account shows restrictions

### 5. **IP/Region Restrictions** 🌍
- **Issue**: Moonshot might block certain IP addresses or regions
- **Check**: Try from a different network or VPN
- **Solution**: Check if your account has IP whitelisting enabled

### 6. **Key Permissions** 🔐
- **Issue**: The key might not have the right permissions/scopes
- **Check**: In Moonshot dashboard, verify key permissions
- **Solution**: Create a new key with full permissions if needed

### 7. **Wrong API Endpoint** 🔗
- **Issue**: Using incorrect API endpoint
- **Current**: We use `https://api.moonshot.cn/v1`
- **Check**: Verify this is correct in Moonshot documentation
- **Solution**: Ensure endpoint matches Moonshot's current API docs

### 8. **Authorization Header Format** 📝
- **Issue**: The OpenAI SDK might not format the header correctly for Moonshot
- **Check**: The SDK should automatically add `Authorization: Bearer <key>`
- **Solution**: This should be handled automatically, but worth checking

### 9. **Account Type Limitations** 📊
- **Issue**: Free/trial accounts might have restrictions
- **Check**: Check your account type in Moonshot dashboard
- **Solution**: Upgrade to a paid plan if needed

### 10. **Key Copying Issues** 📋
- **Issue**: Key might be incomplete or have extra characters
- **Check**: Verify key length (should be ~51 characters)
- **Solution**: Copy the key again, making sure you get the entire key

## Step-by-Step Diagnostic Process

### Step 1: Verify Key Format
```bash
npm run test:moonshot
```
This will show:
- Key length
- Key preview
- Format warnings (quotes, spaces, etc.)

### Step 2: Check Moonshot Dashboard
1. Go to https://platform.moonshot.cn/
2. Log in
3. Check:
   - ✅ API Keys section: Is your key "Active"?
   - ✅ Account status: Any warnings or restrictions?
   - ✅ Billing: Do you have credits/quota?
   - ✅ Verification: Is your account verified?

### Step 3: Test with Direct API Call
If the test script fails, try a direct curl command:

```bash
curl https://api.moonshot.cn/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

Replace `YOUR_API_KEY_HERE` with your actual key.

### Step 4: Check Account Status
- Look for any account suspension notices
- Check if there are usage limits
- Verify billing information is complete

### Step 5: Contact Support
If all else fails:
- Moonshot Support: Check their website for support contact
- Provide them with:
  - Your account email
  - API key preview (first 8 and last 4 characters)
  - Error message (401 Invalid Authentication)
  - When the key was created

## Quick Fix Checklist

- [ ] Key is in `.env.local` without quotes
- [ ] No spaces around `=` sign
- [ ] Dev server restarted after updating key
- [ ] Waited 2-3 minutes after creating key
- [ ] Account is verified in Moonshot dashboard
- [ ] Account has credits/quota
- [ ] Key is "Active" in dashboard (not revoked)
- [ ] No account restrictions or suspensions
- [ ] Test script run: `npm run test:moonshot`
- [ ] Checked Moonshot status page for outages

## Most Likely Causes (In Order)

1. **Key not activated yet** (wait 2-3 minutes)
2. **Account needs verification**
3. **No credits/quota on account**
4. **Key format issue** (quotes, spaces)
5. **Dev server not restarted**
6. **Account restrictions**

## Still Not Working?

If you've tried everything above:
1. Create a **completely new key** in Moonshot dashboard
2. Delete the old key from `.env.local`
3. Add the new key (no quotes, no spaces)
4. Wait 3 minutes
5. Restart dev server
6. Run test: `npm run test:moonshot`

If it still fails, the issue is likely with your Moonshot account (verification, credits, or restrictions) rather than the key itself.

