# Migrating Existing Users to Supabase Auth

## ⚠️ IMPORTANT: Password Migration Limitation

**You cannot directly migrate bcrypt password hashes to Supabase Auth** because:
- Supabase Auth uses a different password hashing algorithm
- Password hashes are not reversible
- Supabase doesn't expose password hash storage

## Migration Options

### Option 1: Force Password Reset (Recommended for Production)
1. Migrate user accounts to `auth.users` without passwords
2. Set `email_confirmed_at = NULL` for all migrated users
3. Send password reset emails to all users
4. Users reset their passwords on first login

### Option 2: Temporary Migration Password
1. Set a temporary password for all migrated users
2. Force password change on first login
3. Users must set new password

### Option 3: Manual Migration Script (Development Only)
Use Supabase Admin API to create users with temporary passwords.

## Migration Script (Node.js/TypeScript)

```typescript
// scripts/migrate-users-to-supabase-auth.ts
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function migrateUsers() {
  // Connect to Supabase with service role key (admin access)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key
  )

  // Get all existing users from custom users table
  const { data: oldUsers, error } = await supabaseAdmin
    .from('users')
    .select('*')

  if (error) {
    console.error('Error fetching users:', error)
    return
  }

  console.log(`Found ${oldUsers.length} users to migrate`)

  for (const oldUser of oldUsers) {
    try {
      // Create user in auth.users
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: oldUser.email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: oldUser.username,
          migrated: true
        },
        // Generate temporary password (user must reset)
        password: generateTemporaryPassword()
      })

      if (createError) {
        console.error(`Failed to create auth user for ${oldUser.email}:`, createError)
        continue
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          username: oldUser.username,
          avatar_url: oldUser.avatar_url,
          created_at: oldUser.created_at,
          updated_at: oldUser.updated_at,
          last_login: oldUser.last_login
        })

      if (profileError) {
        console.error(`Failed to create profile for ${oldUser.email}:`, profileError)
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        continue
      }

      // Update all foreign key references
      await updateForeignKeys(oldUser.id, authUser.user.id, supabaseAdmin)

      console.log(`✅ Migrated user: ${oldUser.email} (${oldUser.id} -> ${authUser.user.id})`)
    } catch (error) {
      console.error(`Error migrating user ${oldUser.email}:`, error)
    }
  }
}

async function updateForeignKeys(oldUserId: string, newUserId: string, supabase: any) {
  // Update player_stats
  await supabase
    .from('player_stats')
    .update({ user_id: newUserId })
    .eq('user_id', oldUserId)

  // Update game_rooms
  await supabase
    .from('game_rooms')
    .update({ host_id: newUserId })
    .eq('host_id', oldUserId)

  // Update room_members
  await supabase
    .from('room_members')
    .update({ user_id: newUserId })
    .eq('user_id', oldUserId)

  // Update documents
  await supabase
    .from('documents')
    .update({ uploaded_by: newUserId })
    .eq('uploaded_by', oldUserId)

  // Update player_answers
  await supabase
    .from('player_answers')
    .update({ user_id: newUserId })
    .eq('user_id', oldUserId)

  // Update game_results
  await supabase
    .from('game_results')
    .update({ user_id: newUserId })
    .eq('user_id', oldUserId)

  // Update leaderboard
  await supabase
    .from('leaderboard')
    .update({ user_id: newUserId })
    .eq('user_id', oldUserId)
}

function generateTemporaryPassword(): string {
  // Generate a secure random password
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + '!A1'
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('Migration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
```

## Alternative: Use Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Manually create users (or use bulk import)
3. Run SQL to update foreign keys:

```sql
-- Example: Update player_stats for a specific user
UPDATE player_stats 
SET user_id = 'new-auth-user-id' 
WHERE user_id = 'old-custom-user-id';
```

## After Migration

1. ✅ All users are in `auth.users`
2. ✅ All profiles are in `profiles` table
3. ✅ All foreign keys updated
4. ✅ Users can reset passwords via email
5. ✅ Drop old `users` table (after verification)


