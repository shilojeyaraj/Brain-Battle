# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables (CRITICAL)

#### Required Variables
- [ ] **`SESSION_SECRET`** - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- [ ] **`NEXT_PUBLIC_SUPABASE_URL`** - Your Supabase project URL
- [ ] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** - Supabase anonymous key
- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** - Supabase service role key (secret)
- [ ] **`MOONSHOT_API_KEY`** - Moonshot AI API key (secret)
- [ ] **`NEXT_PUBLIC_APP_URL`** - Your production app URL (e.g., `https://your-app.vercel.app`)

#### Optional but Recommended
- [ ] **`ADMIN_PASSWORD`** - Admin panel password (hash with bcrypt)
- [ ] **`COOKIE_DOMAIN`** - Only if using custom domain (format: `.yourdomain.com`)
- [ ] **`MOONSHOT_MODEL`** - Override default model (default: `kimi-k2-thinking`)

#### How to Add to Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for **Production**, **Preview**, and **Development** environments
3. Mark secrets as **Secret** (not visible in logs)
4. Redeploy after adding variables

---

### 2. Database Migrations

- [ ] All migrations have been run in production Supabase
- [ ] `user_sessions` table exists (for single-device login)
- [ ] `profiles.tutorial_completed` column exists
- [ ] All RLS policies are enabled and tested
- [ ] Database indexes are created for performance

**To verify:**
```sql
-- Check if user_sessions table exists
SELECT * FROM information_schema.tables WHERE table_name = 'user_sessions';

-- Check if tutorial_completed column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'tutorial_completed';
```

---

### 3. Admin Panel Setup

- [ ] **`ADMIN_PASSWORD`** environment variable is set
- [ ] Admin password is hashed with bcrypt (or use plain text - will be hashed on first use)
- [ ] Test admin login at `/admin/login`
- [ ] Verify admin can:
  - [ ] View users
  - [ ] Delete users
  - [ ] Ban/unban users
  - [ ] Grant Pro subscriptions

**To hash admin password:**
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(hash => console.log(hash))"
```

---

### 4. Security Configuration

#### ✅ Already Configured:
- [x] Security headers in `next.config.ts`
- [x] HTTP-only session cookies
- [x] Secure cookies in production
- [x] Rate limiting middleware
- [x] Input validation
- [x] Server-side authentication checks

#### ⚠️ Verify:
- [ ] All API routes require authentication
- [ ] Rate limiting is working (check `/src/middleware/rate-limit.ts`)
- [ ] Error messages don't leak sensitive information
- [ ] CORS is properly configured (if needed)

---

### 5. API Keys & Secrets

- [ ] **Moonshot API Key** is valid and has credits
- [ ] **Supabase keys** are correct for production project
- [ ] **Session secret** is unique and secure (not default value)
- [ ] All secrets are marked as **Secret** in Vercel (not visible in logs)

**Test Moonshot API Key:**
```bash
node scripts/test-moonshot-key.js
```

---

### 6. Application Configuration

#### Next.js Config
- [x] Security headers configured
- [x] Compression enabled
- [x] Powered-by header disabled
- [x] Webpack configured for production

#### Verify:
- [ ] Build completes without errors: `npm run build`
- [ ] No TypeScript errors: `npm run type-check` (if available)
- [ ] No ESLint critical errors

---

### 7. Error Handling & Monitoring

#### ✅ Already Implemented:
- [x] Error sanitization for client responses
- [x] Detailed server-side logging
- [x] User-friendly error messages
- [x] Authentication error handling

#### ⚠️ Recommended (Optional):
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for critical errors

---

### 8. Testing Before Deployment

#### Critical Tests:
- [ ] **Login/Logout** - Users can log in and stay logged in
- [ ] **Single-device login** - Logging in on device B logs out device A
- [ ] **Session persistence** - Users stay logged in after page refresh
- [ ] **Protected routes** - Unauthenticated users are redirected to login
- [ ] **Notes generation** - Singleplayer notes generation works
- [ ] **Quiz generation** - Quiz generation works
- [ ] **Admin panel** - Admin can access and manage users
- [ ] **Error messages** - Users see helpful error messages

#### Test Checklist:
```bash
# 1. Test build
npm run build

# 2. Test production build locally (optional)
npm run start

# 3. Test API endpoints
# - POST /api/auth/login
# - GET /api/user/current
# - POST /api/notes
# - POST /api/generate-quiz
```

---

### 9. Performance Optimization

#### ✅ Already Configured:
- [x] Code splitting with dynamic imports
- [x] Image optimization
- [x] Compression enabled
- [x] Lazy loading for heavy components

#### ⚠️ Verify:
- [ ] Page load times are acceptable (< 3s)
- [ ] API response times are reasonable
- [ ] Database queries are optimized
- [ ] No unnecessary re-renders

---

### 10. Documentation

- [x] Environment variables documented (`docs/setup/VERCEL_ENV_VARIABLES.md`)
- [x] Admin panel documented (`docs/admin/ADMIN_PANEL_SETUP.md`)
- [x] Security fixes documented (`docs/security/SECURITY_FIXES_IMPLEMENTED.md`)
- [x] Single-device login documented (`docs/features/SINGLE_DEVICE_LOGIN.md`)

---

## 🚀 Deployment Steps

### Step 1: Prepare Environment Variables
1. Generate `SESSION_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. Hash `ADMIN_PASSWORD` (if using bcrypt):
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(hash => console.log(hash))"
   ```

3. Add all variables to Vercel Dashboard

### Step 2: Run Database Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Run all migrations in order:
   - `add-user-sessions-table.sql`
   - `add-tutorial-tracking.sql`
   - Any other pending migrations

### Step 3: Deploy to Vercel
1. Push code to main branch (or trigger deployment)
2. Wait for build to complete
3. Check build logs for errors

### Step 4: Post-Deployment Verification
1. **Test Login:**
   - Go to production URL
   - Try logging in
   - Check browser DevTools → Application → Cookies
   - Should see `brain-brawl-session` cookie

2. **Test Singleplayer:**
   - After logging in, click "Singleplayer"
   - Should NOT redirect to login
   - Page should load normally

3. **Test Admin Panel:**
   - Go to `/admin/login`
   - Enter admin password
   - Should access admin dashboard

4. **Check Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Look for any errors in API routes
   - Verify authentication is working

---

## 🚨 Common Issues & Solutions

### Issue: "Not authenticated" errors after deployment
**Solution:**
- Verify `SESSION_SECRET` is set correctly
- Check cookie is being set (browser DevTools → Cookies)
- Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain
- Check Vercel function logs for authentication errors

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
- Verify Moonshot API key has credits

### Issue: Database errors
**Solution:**
- Verify all migrations have been run
- Check Supabase connection strings are correct
- Verify RLS policies are enabled
- Check Supabase logs for errors

---

## 📋 Quick Reference

### Minimum Required Environment Variables
```
SESSION_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MOONSHOT_API_KEY
NEXT_PUBLIC_APP_URL
```

### Recommended Environment Variables
```
ADMIN_PASSWORD
COOKIE_DOMAIN (if using custom domain)
MOONSHOT_MODEL (if overriding default)
```

### Critical Database Tables
- `user_sessions` (for single-device login)
- `profiles` (with `tutorial_completed` column)
- `users`
- `player_stats`
- `quiz_sessions`
- `quiz_questions`
- `player_answers`

---

## ✅ Final Checklist Before Going Live

- [ ] All environment variables set in Vercel
- [ ] All database migrations run
- [ ] Admin password configured
- [ ] Build completes without errors
- [ ] Login/logout tested
- [ ] Single-device login tested
- [ ] Notes generation tested
- [ ] Quiz generation tested
- [ ] Admin panel tested
- [ ] Error messages are user-friendly
- [ ] No sensitive data in logs
- [ ] Security headers configured
- [ ] Rate limiting working
- [ ] Documentation is up to date

---

## 🎯 Post-Deployment Monitoring

### First 24 Hours:
- Monitor Vercel function logs
- Check for authentication errors
- Monitor API response times
- Watch for rate limiting triggers
- Check database performance

### First Week:
- Review error logs daily
- Monitor user signups
- Check for any security issues
- Review performance metrics
- Gather user feedback

---

## 📞 Support & Troubleshooting

If you encounter issues:
1. Check Vercel function logs
2. Check Supabase logs
3. Review browser console errors
4. Check environment variables
5. Verify database migrations
6. Review this checklist

---

**Last Updated:** 2025-12-06
**Version:** 1.0

