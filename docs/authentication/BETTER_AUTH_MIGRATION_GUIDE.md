# Better Auth Migration Guide

This guide documents the migration from Supabase Auth to Better Auth.

## Prerequisites

1. **Database Connection String**: You need your Supabase database connection string (not the REST API URL)
   - Go to Supabase Dashboard → Settings → Database
   - Copy the connection string (use the "Transaction pooler" connection string with port 6543)
   - Format: `postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres`
   - Replace `[PASSWORD]` with your database password
   - URL-encode special characters in password if needed

2. **Better Auth Secret**: Generate a secure secret key
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

## Environment Variables

Add these to your `.env.local`:

```env
# Better Auth Configuration
BETTER_AUTH_SECRET=your-generated-secret-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001

# Database Connection (Supabase PostgreSQL)
DATABASE_URL=postgres://postgres:password@db.xxxxx.supabase.co:6543/postgres

# Keep existing Supabase variables for database operations (not auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Migration

1. **Run the Better Auth migration SQL**:
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `supabase/better-auth-migration.sql`
   - This creates the `user`, `session`, `account`, and `verification` tables

2. **Create a trigger to sync Better Auth users with profiles table**:
   ```sql
   -- Create trigger to sync Better Auth users with profiles table
   CREATE OR REPLACE FUNCTION sync_better_auth_user_to_profile()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO profiles (user_id, username, email, created_at, updated_at)
     VALUES (
       NEW.id,
       NEW.name,
       NEW.email,
       NEW.created_at,
       NEW.updated_at
     )
     ON CONFLICT (user_id) DO UPDATE
     SET
       username = COALESCE(EXCLUDED.username, profiles.username),
       email = COALESCE(EXCLUDED.email, profiles.email),
       updated_at = NEW.updated_at;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER sync_user_to_profile
   AFTER INSERT OR UPDATE ON "user"
   FOR EACH ROW
   EXECUTE FUNCTION sync_better_auth_user_to_profile();
   ```

## Migration Steps

### ✅ Completed

1. ✅ Installed Better Auth dependencies
2. ✅ Created Better Auth configuration files
3. ✅ Created database schema
4. ✅ Created server and client auth files
5. ✅ Created API route handler
6. ✅ Updated login page
7. ✅ Updated signup page
8. ✅ Updated middleware
9. ✅ Updated session management

### 🔄 Remaining Tasks

1. **Update all API routes** that use `getCurrentUserId()` or `getCurrentUser()`:
   - Replace with `getCurrentUserId()` from `@/lib/auth/session-server` (server-side)
   - Or use `useCurrentUser()` hook in client components

2. **Update components** that use Supabase Auth:
   - Search for `supabase.auth.` usage
   - Replace with Better Auth client methods

3. **Test authentication flow**:
   - Sign up
   - Sign in
   - Sign out
   - Protected routes

4. **Update auth callback route** (`src/app/auth/callback/route.ts`):
   - Better Auth handles callbacks automatically via `/api/auth/*`
   - May need to remove or update this route

## Key Differences

### Supabase Auth → Better Auth

| Supabase Auth | Better Auth |
|--------------|-------------|
| `supabase.auth.signUp()` | `authClient.signUp.email()` |
| `supabase.auth.signInWithPassword()` | `authClient.signIn.email()` |
| `supabase.auth.signOut()` | `authClient.signOut()` |
| `supabase.auth.getUser()` | `authClient.useSession()` (hook) or `auth.api.getSession()` (server) |
| `auth.users` table | `user` table |
| Session in cookies (automatic) | Session in cookies (automatic) |

## Testing

1. **Start dev server**: `npm run dev`
2. **Test signup**: Create a new account
3. **Test login**: Sign in with credentials
4. **Test protected routes**: Access `/dashboard` (should redirect if not logged in)
5. **Test signout**: Sign out and verify redirect

## Troubleshooting

### Error: "DATABASE_URL is required"
- Check `.env.local` has `DATABASE_URL` set
- Verify connection string format
- Restart dev server after adding env vars

### Error: "BETTER_AUTH_SECRET is required"
- Generate a secret (see Prerequisites)
- Add to `.env.local`
- Restart dev server

### Error: "Table 'user' already exists"
- This is fine if tables already exist
- Migration SQL checks for existing tables

### Session not persisting
- Check cookies are being set (browser DevTools)
- Verify `BETTER_AUTH_URL` matches your app URL
- Check CORS settings if using different domains

## Notes

- Better Auth uses its own `user` table, separate from Supabase's `auth.users`
- We maintain a `profiles` table that syncs with Better Auth's `user` table via trigger
- Better Auth handles sessions automatically via cookies
- No email confirmation by default (can be enabled in config)


