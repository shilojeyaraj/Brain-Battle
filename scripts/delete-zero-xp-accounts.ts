#!/usr/bin/env tsx
/**
 * Delete All Accounts with 0 XP
 * 
 * This script deletes all user accounts that have 0 XP in their player_stats.
 * Useful for cleaning up test accounts.
 * 
 * ⚠️ WARNING: This will permanently delete accounts and all their data!
 * 
 * Usage:
 *   npm run delete-zero-xp-accounts
 *   or
 *   tsx scripts/delete-zero-xp-accounts.ts
 */

import { createAdminClient } from '../src/lib/supabase/server-admin'

interface UserToDelete {
  user_id: string
  username: string
  email: string
  xp: number
  created_at: string
}

async function deleteZeroXPAccounts() {
  console.log('🚀 Starting cleanup of accounts with 0 XP...\n')

  const supabase = createAdminClient()

  try {
    // Step 1: Find all users with 0 XP
    console.log('📊 Finding users with 0 XP...')
    
    const { data: zeroXPStats, error: statsError } = await supabase
      .from('player_stats')
      .select('user_id, xp')
      .eq('xp', 0)

    if (statsError) {
      console.error('❌ Error fetching player stats:', statsError)
      throw statsError
    }

    if (!zeroXPStats || zeroXPStats.length === 0) {
      console.log('✅ No users with 0 XP found. Nothing to delete!')
      return
    }

    console.log(`📋 Found ${zeroXPStats.length} users with 0 XP\n`)

    // Step 2: Get user details for logging
    const userIds = zeroXPStats.map(stat => stat.user_id)
    
    // Try to get user info from custom users table first
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .in('id', userIds)

    let usersToDelete: UserToDelete[] = []

    if (users && users.length > 0) {
      // Using custom users table
      usersToDelete = users.map(user => ({
        user_id: user.id,
        username: user.username || 'unknown',
        email: user.email || 'unknown',
        xp: 0,
        created_at: user.created_at || 'unknown'
      }))
    } else {
      // Fallback: try profiles table
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, created_at')
        .in('user_id', userIds)

      if (profiles && profiles.length > 0) {
        usersToDelete = profiles.map(profile => ({
          user_id: profile.user_id,
          username: profile.username || 'unknown',
          email: 'unknown',
          xp: 0,
          created_at: profile.created_at || 'unknown'
        }))
      } else {
        // If we can't find user details, just use the IDs
        usersToDelete = userIds.map(id => ({
          user_id: id,
          username: 'unknown',
          email: 'unknown',
          xp: 0,
          created_at: 'unknown'
        }))
      }
    }

    // Step 3: Display users to be deleted
    console.log('📝 Users to be deleted:')
    console.log('─'.repeat(80))
    usersToDelete.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Created: ${user.created_at}`)
    })
    console.log('─'.repeat(80))
    console.log(`\n⚠️  About to delete ${usersToDelete.length} accounts and all their data!\n`)

    // Step 4: Delete users (cascade will handle related data)
    console.log('🗑️  Deleting users...')
    
    let deletedCount = 0
    let errorCount = 0

    for (const user of usersToDelete) {
      try {
        // Delete from users table (cascade will delete related data)
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.user_id)

        if (deleteError) {
          console.error(`❌ Failed to delete user ${user.username} (${user.user_id}):`, deleteError.message)
          errorCount++
        } else {
          console.log(`✅ Deleted: ${user.username} (${user.user_id})`)
          deletedCount++
        }
      } catch (err: any) {
        console.error(`❌ Error deleting user ${user.username}:`, err.message)
        errorCount++
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 Summary:')
    console.log(`   ✅ Successfully deleted: ${deletedCount} accounts`)
    if (errorCount > 0) {
      console.log(`   ❌ Failed to delete: ${errorCount} accounts`)
    }
    console.log('='.repeat(80))

    // Step 6: Verify cleanup
    console.log('\n🔍 Verifying cleanup...')
    const { count: remainingZeroXP } = await supabase
      .from('player_stats')
      .select('*', { count: 'exact', head: true })
      .eq('xp', 0)

    console.log(`   Remaining accounts with 0 XP: ${remainingZeroXP || 0}`)

    if (remainingZeroXP === 0) {
      console.log('\n✅ Cleanup completed successfully!')
    } else {
      console.log(`\n⚠️  Warning: ${remainingZeroXP} accounts with 0 XP still remain.`)
      console.log('   This might be due to foreign key constraints or missing player_stats entries.')
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
deleteZeroXPAccounts()
  .then(() => {
    console.log('\n✨ Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

