# Brain Battle - Environment Variables Guide

## 📋 Complete Environment Variable List

### ✅ Currently Set in Vercel Production

| Variable | Type | Purpose | Status |
|----------|------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Server-side Supabase operations | ✅ Set |
| `OPENAI_API_KEY` | Secret | AI features (notes, quiz, embeddings) | ✅ Set |
| `UNSPLASH_ACCESS_KEY` | Secret | Image enrichment for study notes | ✅ Set |
| `UNSPLASH_SECRET_KEY` | Secret | Unsplash API authentication | ✅ Set |

### ❌ Missing from Vercel (REQUIRED)

| Variable | Type | Purpose | Value |
|----------|------|---------|-------|
| `NEXT_PUBLIC_APP_URL` | Public | Internal API calls | `https://brain-battle-rho.vercel.app` |

---

## 🚨 ACTION REQUIRED

### Add to Vercel Dashboard

**Navigate to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add this variable:**

```
Key:          NEXT_PUBLIC_APP_URL
Value:        https://brain-battle-rho.vercel.app
Environments: ✅ Production
              ✅ Preview
              ✅ Development
```

**Why this is needed:**
- Notes generation API calls the embeddings API internally
- Quiz generation API calls the semantic search API internally
- Without this, the app tries to call `http://localhost:3000` in production, which fails

---

## 📊 Environment Variable Usage

### Client-Side Variables (Exposed to Browser)
These must start with `NEXT_PUBLIC_` prefix:

- `NEXT_PUBLIC_SUPABASE_URL` - Used in browser for Supabase client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Used in browser for Supabase auth
- `NEXT_PUBLIC_APP_URL` - Used for constructing internal API URLs

### Server-Side Variables (Secret)
These are only accessible in API routes and server components:

- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations on Supabase
- `OPENAI_API_KEY` - AI-powered study notes and quiz generation
- `UNSPLASH_ACCESS_KEY` - Fetching educational images
- `UNSPLASH_SECRET_KEY` - Unsplash API authentication

### Automatic Variables (Provided by Vercel)
These are set automatically by Vercel:

- `VERCEL_URL` - Current deployment URL (used as fallback)
- `NODE_ENV` - Environment mode (development/production)
- `VERCEL` - Indicates running on Vercel platform

---

## 🔧 Local Development Setup

Create a `.env.local` file in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Unsplash (optional)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key

# App URL (local)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ Verification Checklist

After adding `NEXT_PUBLIC_APP_URL` to Vercel:

- [ ] Variable added to Vercel for Production environment
- [ ] Variable added to Vercel for Preview environment
- [ ] Variable added to Vercel for Development environment
- [ ] Vercel redeployed (automatic after adding variable)
- [ ] Test notes generation in production
- [ ] Test quiz generation in production
- [ ] Check Vercel function logs for confirmation

---

## 🎯 Expected Results

Once `NEXT_PUBLIC_APP_URL` is added:

✅ Notes generation will work in production
✅ Quiz generation will work in production
✅ Semantic search will work correctly
✅ Embeddings generation will succeed
✅ No more "Failed to start quiz" errors
✅ No more localhost URL errors in production logs

---

## 🔍 Troubleshooting

### If notes/quiz still don't work after adding the variable:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Look for the API route logs (e.g., `/api/notes`, `/api/generate-quiz`)
   - Verify the base URL being used

2. **Verify Environment Variable:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Confirm `NEXT_PUBLIC_APP_URL` is set correctly
   - Ensure it's enabled for Production environment

3. **Force Redeploy:**
   - Sometimes Vercel needs a fresh deployment to pick up new variables
   - Go to Deployments → Latest → "..." menu → Redeploy

4. **Check API Endpoints:**
   - Visit: `https://brain-battle-rho.vercel.app/api/test-env`
   - This will show which environment variables are loaded

---

## 📝 Notes

- All `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time
- Changing these variables requires a new deployment to take effect
- Server-side variables can be updated without rebuilding
- Never commit `.env.local` to git (it's in `.gitignore`)

