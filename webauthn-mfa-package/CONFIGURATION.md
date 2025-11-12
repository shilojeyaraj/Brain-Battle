# Configuration Guide

Complete setup instructions for WebAuthn MFA in your Next.js + Supabase project.

## 📋 Prerequisites

- Next.js 13+ with App Router
- Supabase project
- TypeScript enabled
- Node.js 18+

## 🔧 Step-by-Step Setup

### 1. Database Migration

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of database/webauthn-credentials.sql
-- This creates the webauthn_credentials table and RLS policies
```

**Important:** The migration is idempotent - safe to run multiple times.

### 2. Environment Variables

Add to your `.env.local`:

```env
# Your Supabase URL (already should exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Your site URL for production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# For localhost development
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Supabase Configuration

#### A. Enable Row Level Security (RLS)

The migration script automatically enables RLS on `webauthn_credentials`. Verify in Supabase Dashboard:

1. Go to **Table Editor** → `webauthn_credentials`
2. Check that **RLS** is enabled
3. Verify policies exist (should be 4 policies)

#### B. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL: `https://yourdomain.com`
3. Add redirect URL: `https://yourdomain.com/auth/callback`

### 4. File Structure

Copy files to your project:

```
your-project/
├── src/
│   ├── lib/
│   │   ├── auth/
│   │   │   └── webauthn.ts          # Copy from src/lib/auth/webauthn.ts
│   │   └── supabase/
│   │       └── server.ts            # Your existing Supabase server client
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           └── webauthn/
│   │               ├── register/
│   │               │   └── route.ts # Copy from src/app/api/auth/webauthn/register/route.ts
│   │               ├── verify-registration/
│   │               │   └── route.ts # Copy from src/app/api/auth/webauthn/verify-registration/route.ts
│   │               ├── authenticate/
│   │               │   └── route.ts # Copy from src/app/api/auth/webauthn/authenticate/route.ts
│   │               └── verify-authentication/
│   │                   └── route.ts # Copy from src/app/api/auth/webauthn/verify-authentication/route.ts
│   └── components/
│       └── auth/
│           └── webauthn-verification.tsx # Copy from src/components/auth/webauthn-verification.tsx
```

### 5. Update Import Paths

After copying files, update import paths:

**In API routes:**
- Change `@/lib/supabase/server` to match your project structure
- Change `@/lib/auth/webauthn` to match your project structure

**In components:**
- Change `@/lib/auth/webauthn` to match your project structure
- Change `@/components/ui/*` to match your UI component library

### 6. Customize Application Name

Update the Relying Party (RP) name in:

**`src/app/api/auth/webauthn/register/route.ts`:**
```typescript
const options = generateRegistrationOptions(
  user.id,
  userName,
  userDisplayName,
  'Your App Name', // ← Change this
  rpId
)
```

### 7. Configure RP ID (Relying Party ID)

The RP ID is automatically extracted from the request origin. For production:

**Option 1: Environment Variable (Recommended)**
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**Option 2: Manual Override**
In `src/app/api/auth/webauthn/register/route.ts` and `authenticate/route.ts`, you can hardcode:

```typescript
let rpId = 'yourdomain.com' // Your production domain
```

**Important:** 
- RP ID must match your domain (without port)
- For localhost, use `localhost` (not `localhost:3000`)
- RP ID cannot include ports

## ✅ Verification

### Test Database Setup

Run in Supabase SQL Editor:

```sql
-- Should return true if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'webauthn_credentials'
);

-- Should return 4 (policies)
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'webauthn_credentials';
```

### Test API Routes

1. **Registration endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/webauthn/register
   ```

2. **Authentication endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/webauthn/authenticate \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

## 🚨 Common Issues

### Issue: "RP ID is not a registrable domain"

**Solution:** Ensure RP ID matches your domain exactly (no ports, no protocol)

### Issue: "WebAuthn not supported"

**Solution:** 
- Use HTTPS in production (localhost is exempt)
- Check browser compatibility
- Ensure platform authenticator is available

### Issue: "Unauthorized" errors

**Solution:**
- Verify RLS policies are correct
- Check user is authenticated before registration
- Verify Supabase client is configured correctly

## 📝 Next Steps

After configuration:
1. See `USAGE.md` for integration examples
2. See `ARCHITECTURE.md` for technical details
3. See `SECURITY.md` for production considerations

