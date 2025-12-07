# Vercel Environment Variables Guide

## 🔐 Required Environment Variables for Production

Add these to your Vercel project: **Settings → Environment Variables**

### ✅ Required Variables

| Variable Name | Type | Description | Example |
|--------------|------|-------------|---------|
| `SESSION_SECRET` | **Secret** | Session encryption key (NEW - Required for authentication) | `base64-encoded-32-byte-secret` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Supabase service role key (admin access) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `MOONSHOT_API_KEY` | **Secret** | Moonshot AI (Kimi K2) API key | `sk-xxxxx...` |
| `NEXT_PUBLIC_APP_URL` | Public | Your production app URL | `https://your-app.vercel.app` |

### 🔧 Optional Variables

| Variable Name | Type | Description | When to Use |
|--------------|------|-------------|-------------|
| `COOKIE_DOMAIN` | **Secret** | Cookie domain (e.g., `.yourdomain.com`) | Only if using custom domain with subdomains |
| `MOONSHOT_MODEL` | Public | Override default K2 model | Default: `kimi-k2-thinking` |
| `OPENAI_API_KEY` | **Secret** | OpenAI API key | Only if using OpenAI as fallback |
| `DATABASE_URL` | **Secret** | Direct database connection string | If using direct DB connection |

---

## 📝 Step-by-Step Setup

### 1. Generate SESSION_SECRET

**IMPORTANT:** This is a new required variable for session cookies to work!

Run this command to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output (it will look like: `aBc123XyZ...`)

### 2. Add Variables to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Click **Add New**
3. For each variable:

#### SESSION_SECRET (NEW - Required)
```
Key:          SESSION_SECRET
Value:        [paste the generated secret from step 1]
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

#### NEXT_PUBLIC_SUPABASE_URL
```
Key:          NEXT_PUBLIC_SUPABASE_URL
Value:        https://xxxxx.supabase.co
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Key:          NEXT_PUBLIC_SUPABASE_ANON_KEY
Value:        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

#### SUPABASE_SERVICE_ROLE_KEY
```
Key:          SUPABASE_SERVICE_ROLE_KEY
Value:        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

#### MOONSHOT_API_KEY
```
Key:          MOONSHOT_API_KEY
Value:        sk-xxxxx...
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

#### NEXT_PUBLIC_APP_URL
```
Key:          NEXT_PUBLIC_APP_URL
Value:        https://your-app.vercel.app
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

#### COOKIE_DOMAIN (Optional - Only if needed)
```
Key:          COOKIE_DOMAIN
Value:        .yourdomain.com
Environments: ✅ Production
              ❌ Preview (not needed)
              ❌ Development (not needed)
```

**Note:** Only set `COOKIE_DOMAIN` if:
- You're using a custom domain (not `*.vercel.app`)
- You have subdomains that need to share cookies
- Format: `.yourdomain.com` (note the leading dot)

---

## ✅ Verification Checklist

After adding all variables:

- [ ] `SESSION_SECRET` added (NEW - required for login to work)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` added
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added
- [ ] `MOONSHOT_API_KEY` added
- [ ] `NEXT_PUBLIC_APP_URL` added
- [ ] All variables set for **Production** environment
- [ ] All variables set for **Preview** environment (optional but recommended)
- [ ] Redeploy triggered (automatic after adding variables)

---

## 🧪 Testing After Setup

1. **Test Login:**
   - Go to your production site
   - Try logging in
   - Check browser DevTools → Application → Cookies
   - Should see `brain-brawl-session` cookie

2. **Test Singleplayer:**
   - After logging in, click "Singleplayer"
   - Should NOT redirect to login
   - Page should load normally

3. **Check Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Look for `/api/user/current` logs
   - Should see: `✅ [CURRENT USER API] User authenticated: <userId>`

---

## 🚨 Common Issues

### Issue: "Not authenticated" errors
**Solution:** 
- Verify `SESSION_SECRET` is set correctly
- Check cookie is being set (browser DevTools → Cookies)
- Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain

### Issue: Cookies not persisting
**Solution:**
- Check `COOKIE_DOMAIN` is set correctly (if using custom domain)
- Verify site is served over HTTPS (required for secure cookies)
- Check browser console for cookie errors

### Issue: API calls failing
**Solution:**
- Verify `NEXT_PUBLIC_APP_URL` is set to your production URL
- Check all API keys are correct
- Review Vercel function logs for errors

---

## 📋 Quick Reference

### Minimum Required (Must Have)
```
SESSION_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MOONSHOT_API_KEY
NEXT_PUBLIC_APP_URL
```

### Recommended (Should Have)
```
COOKIE_DOMAIN (if using custom domain)
MOONSHOT_MODEL (if you want to override default)
```

### Optional (Nice to Have)
```
OPENAI_API_KEY (for fallback/parallel testing)
DATABASE_URL (for direct DB access)
```

---

## 🔄 After Adding Variables

1. **Redeploy:** Vercel will automatically redeploy after adding variables
2. **Wait:** Wait for deployment to complete (usually 1-2 minutes)
3. **Test:** Test login and singleplayer functionality
4. **Monitor:** Check Vercel logs for any errors

---

## 💡 Pro Tips

1. **Use different secrets for different environments:**
   - Generate a unique `SESSION_SECRET` for production
   - Use a different one for preview/development

2. **Keep secrets secure:**
   - Never commit secrets to git
   - Use Vercel's secret management
   - Rotate secrets periodically

3. **Test in preview first:**
   - Add variables to Preview environment
   - Test on a preview deployment
   - Then add to Production

4. **Monitor logs:**
   - Check Vercel function logs regularly
   - Look for authentication errors
   - Set up alerts for critical failures

