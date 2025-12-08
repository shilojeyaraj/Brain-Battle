/**
 * Ensure User Exists Utility
 * 
 * Checks if a user exists in the users table, and creates them if they don't.
 * This handles cases where a user has a session but doesn't exist in the users table.
 * 
 * @param userId - The user ID to check/create
 * @returns Promise<boolean> - true if user exists or was created, false if creation failed
 */

import { createAdminClient } from '@/lib/supabase/server-admin'

export async function ensureUserExists(userId: string): Promise<boolean> {
  const adminClient = createAdminClient()

  try {
    // First, check if user exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingUser) {
      return true // User already exists
    }

    // User doesn't exist - try to create them
    console.log(`⚠️ [ENSURE USER] User ${userId} not found in users table, attempting to create...`)

    let authUserEmail = ''
    let authUserCreatedAt: string | null = null

    // Try to get user from auth.users (Supabase Auth) if available
    try {
      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)

      if (authUser?.user) {
        console.log(`✅ [ENSURE USER] User found in auth.users`)
        authUserEmail = authUser.user.email || ''
        authUserCreatedAt = authUser.user.created_at || null
      } else if (authError) {
        console.log(`⚠️ [ENSURE USER] Could not fetch from auth.users (may be using custom auth):`, authError.message)
      }
    } catch (error: any) {
      console.log(`⚠️ [ENSURE USER] Error checking auth.users (may be using custom auth):`, error.message)
      // Continue - we'll create user anyway with defaults
    }

    // Generate username
    const generatedUsername = authUserEmail
      ? authUserEmail.split('@')[0]
      : `user_${userId.slice(0, 8)}`

    // Validate userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      console.error(`❌ [ENSURE USER] Invalid userId format:`, userId)
      return false
    }

    // Create user in users table
    const { data: newUser, error: createError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email: authUserEmail || '',
        username: generatedUsername,
        password_hash: 'supabase_auth', // Placeholder since auth may be handled by Supabase or custom
        created_at: authUserCreatedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      // Check if it's a conflict (user was created between check and insert)
      if (createError.code === '23505') {
        console.log(`✅ [ENSURE USER] User was created by another process`)
        return true
      }
      console.error(`❌ [ENSURE USER] Error creating user:`, createError)
      return false
    }

    if (newUser) {
      console.log(`✅ [ENSURE USER] User ${userId} successfully created in users table`)
      
      // Also create initial player stats if they don't exist
      try {
        const { error: statsError } = await adminClient
          .from('player_stats')
          .insert({
            user_id: userId,
            level: 1,
            xp: 0,
            total_wins: 0,
            total_losses: 0,
            // Initialize free trial: 3 trial quiz diagrams
            trial_quiz_diagrams_remaining: 3,
            quiz_diagrams_this_month: 0,
            has_used_trial_quiz_diagrams: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (statsError && statsError.code !== '23505') {
          // Ignore duplicate key errors (stats may already exist)
          console.warn(`⚠️ [ENSURE USER] Could not create player stats:`, statsError.message)
        } else {
          console.log(`✅ [ENSURE USER] Player stats created for user ${userId}`)
        }
      } catch (statsError) {
        console.warn(`⚠️ [ENSURE USER] Error creating player stats:`, statsError)
        // Don't fail - stats creation is optional
      }

      return true
    }

    return false
  } catch (error) {
    console.error(`❌ [ENSURE USER] Error in ensureUserExists:`, error)
    return false
  }
}

