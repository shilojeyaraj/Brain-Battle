# 🚀 Supabase Auth Migration Guide

Complete guide to migrate from custom authentication to Supabase Auth with MFA support.

## 📋 Migration Checklist

- [ ] Backup database
- [ ] Run database migration SQL
- [ ] Update authentication code (✅ Done)
- [ ] Update login/signup pages (✅ Done)
- [ ] Migrate existing users (if any)
- [ ] Enable MFA in Supabase Dashboard
- [ ] Test authentication flow
- [ ] Update all database queries
- [ ] Remove old custom auth code
- [ ] Update session management

---

## Step 1: Database Migration

### 1.1 Run Migration SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the migration script: `supabase/migrate-to-supabase-auth.sql`
3. This will:
   - Create `profiles` table linked to `auth.users`
   - Update all foreign key references
   - Set up RLS policies
   - Create triggers for auto-profile creation

### 1.2 Verify Migration

```sql
-- Check profiles table exists
SELECT * FROM profiles LIMIT 1;

-- Check foreign keys are updated
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'users';
```

---

## Step 2: Migrate Existing Users (If Applicable)

If you have existing users in your custom `users` table:

### Option A: Force Password Reset (Recommended)

1. Use the migration script in `supabase/migrate-existing-users.md`
2. Users will receive password reset emails
3. They set new passwords on first login

### Option B: Fresh Start (Development)

1. Drop old users table
2. Users sign up fresh with Supabase Auth

---

## Step 3: Enable MFA in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Go to **Authentication** → **Settings** → **Multi-Factor Authentication**
4. Enable **TOTP (Time-based One-Time Password)**
5. Optionally enable **SMS** or **Email** MFA

---

## Step 4: Update Environment Variables

Ensure you have these in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin operations
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # For email redirects
```

---

## Step 5: Update Code References

### 5.1 Authentication Functions

✅ **Already Updated:**
- `src/lib/auth/supabase-auth.ts` - New Supabase Auth functions
- `src/app/login/page.tsx` - Updated to use Supabase Auth
- `src/app/signup/page.tsx` - Updated to use Supabase Auth

### 5.2 Update Database Queries

Search for all queries that reference the old `users` table and update them:

**Before:**
```typescript
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
```

**After:**
```typescript
// Get user from auth.users
const { data: { user } } = await supabase.auth.getUser()

// Get profile from profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single()
```

### 5.3 Update Session Management

**Before (localStorage):**
```typescript
localStorage.setItem('userId', user.id)
```

**After (Supabase Session):**
```typescript
// Session is automatically managed by Supabase
const { data: { user } } = await supabase.auth.getUser()
```

---

## Step 6: Update All Database Queries

Search your codebase for these patterns and update them:

### Pattern 1: Direct users table queries

**Find:** `from('users')`
**Replace:** Use `profiles` table or `auth.users` via Supabase Auth

### Pattern 2: User ID references

**Find:** `user_id` references to custom users
**Replace:** Use `auth.uid()` or get from `supabase.auth.getUser()`

### Pattern 3: Foreign key joins

**Before:**
```sql
SELECT u.*, ps.* 
FROM users u 
JOIN player_stats ps ON u.id = ps.user_id
```

**After:**
```sql
SELECT p.*, ps.* 
FROM profiles p 
JOIN player_stats ps ON p.user_id = ps.user_id
```

---

## Step 7: Add MFA Support to UI

### 7.1 Create MFA Setup Page

Create `src/app/settings/mfa/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MFASetupPage() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  
  const supabase = createClient()
  
  const handleSetup = async () => {
    // Generate MFA secret
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Brain Battle Authenticator'
    })
    
    if (error) {
      console.error('MFA setup error:', error)
      return
    }
    
    // Show QR code
    setQrCode(data.qr_code)
    setStep('verify')
  }
  
  const handleVerify = async () => {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId: 'your-factor-id', // Get from enroll response
      code: verificationCode
    })
    
    if (error) {
      console.error('MFA verification error:', error)
      return
    }
    
    // MFA enabled successfully
    alert('MFA enabled!')
  }
  
  return (
    <div>
      {step === 'setup' && (
        <button onClick={handleSetup}>Enable MFA</button>
      )}
      
      {step === 'verify' && qrCode && (
        <div>
          <img src={qrCode} alt="QR Code" />
          <input 
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
          />
          <button onClick={handleVerify}>Verify & Enable</button>
        </div>
      )}
    </div>
  )
}
```

### 7.2 Update Login Page for MFA

The login page already handles MFA redirect. When MFA is required, it redirects to:
```
/login?mfa=true&email=user@example.com
```

Create an MFA verification component:

```typescript
// src/components/auth/mfa-verification.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MFAVerification({ email }: { email: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  
  const handleVerify = async () => {
    const { data, error } = await supabase.auth.verifyOtp({
      token: code,
      type: 'totp'
    })
    
    if (error) {
      setError(error.message)
      return
    }
    
    // Success - redirect to dashboard
    router.push('/dashboard')
  }
  
  return (
    <div>
      <h2>Enter MFA Code</h2>
      <input 
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
      />
      {error && <p className="error">{error}</p>}
      <button onClick={handleVerify}>Verify</button>
    </div>
  )
}
```

---

## Step 8: Update Middleware

Update `src/middleware.ts` to use Supabase Auth:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Step 9: Testing

### Test Checklist

1. **Sign Up**
   - [ ] New user can sign up
   - [ ] Profile is created automatically
   - [ ] Player stats are created
   - [ ] Email verification works (if enabled)

2. **Login**
   - [ ] User can log in with email/password
   - [ ] Session persists across page refreshes
   - [ ] User can access protected routes

3. **MFA**
   - [ ] User can enable MFA
   - [ ] QR code displays correctly
   - [ ] TOTP code verification works
   - [ ] Login requires MFA when enabled
   - [ ] Backup codes work

4. **Database Queries**
   - [ ] All user data queries work
   - [ ] Foreign keys are correct
   - [ ] RLS policies work correctly

---

## Step 10: Cleanup

After migration is complete and tested:

1. **Remove old files:**
   - `src/lib/auth/custom-auth.ts` (or keep as backup)
   - `src/lib/actions/custom-auth.ts` (or keep as backup)

2. **Remove old dependencies:**
   ```bash
   npm uninstall bcryptjs @types/bcryptjs
   ```

3. **Drop old users table** (after verification):
   ```sql
   DROP TABLE IF EXISTS users CASCADE;
   ```

---

## 🎯 Key Differences

### Before (Custom Auth)
- Custom `users` table with bcrypt
- Manual session management (localStorage)
- Custom password hashing
- No built-in MFA

### After (Supabase Auth)
- `auth.users` table (managed by Supabase)
- Automatic session management (cookies)
- Built-in password hashing
- Built-in MFA support
- Email verification
- Password reset
- Social auth ready

---

## 📚 Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase MFA Guide](https://supabase.com/docs/guides/auth/mfa)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## ❓ Troubleshooting

### Issue: "User not found" after migration

**Solution:** Check that profiles are being created. The trigger should auto-create them.

### Issue: Foreign key errors

**Solution:** Ensure all foreign keys are updated to reference `auth.users(id)`

### Issue: MFA not working

**Solution:** 
1. Check MFA is enabled in Supabase Dashboard
2. Verify TOTP code is 6 digits
3. Check system time is correct (TOTP is time-based)

### Issue: Session not persisting

**Solution:** Check middleware is correctly refreshing sessions

---

## ✅ Migration Complete!

Once all steps are complete, you'll have:
- ✅ Supabase Auth integration
- ✅ Built-in MFA support
- ✅ Better security
- ✅ Less code to maintain
- ✅ Ready for social auth


