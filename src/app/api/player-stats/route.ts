import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { playerStatsSchema } from '@/lib/validation/schemas'
import { sanitizeDatabaseError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * API route to create/update player stats
 * Uses admin client to bypass RLS since custom auth doesn't set auth.uid()
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from session cookie, not request body
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()
    const body = await request.json()
    
    // SECURITY: Validate stats data
    const validation = playerStatsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid stats data', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { stats } = validation.data
    // user_id is now from session, not body

    // First, verify the user exists in the users table
    let { data: userExists } = await adminClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    // If user doesn't exist in users table, try to create them
    if (!userExists) {
      console.log('⚠️ [STATS API] User not found in users table, attempting to create:', userId)
      
      let authUserEmail = ''
      let authUserCreatedAt: string | null = null
      
      // Try to get user from auth.users (Supabase Auth)
      try {
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)
        
        if (authUser?.user) {
          console.log('✅ [STATS API] User found in auth.users')
          authUserEmail = authUser.user.email || ''
          authUserCreatedAt = authUser.user.created_at || null
        } else if (authError) {
          console.log('⚠️ [STATS API] Could not fetch from auth.users (may be using custom auth):', authError.message)
        }
      } catch (error: any) {
        console.log('⚠️ [STATS API] Error checking auth.users (may be using custom auth):', error.message)
        // Continue - we'll create user anyway with defaults
      }
      
      // Create user in users table (works for both Supabase Auth and custom auth)
      const generatedUsername = `user_${userId.slice(0, 8)}`
      
      // Validate userId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        console.error('❌ [STATS API] Invalid userId format:', userId)
        return NextResponse.json(
          { error: 'Invalid user ID format. Please log in again.' },
          { status: 400 }
        )
      }
      
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
        console.error('❌ [STATS API] Failed to create user in users table:', createError)
        // SECURITY: Sanitize database error
        const sanitized = sanitizeDatabaseError(createError)
        
        // If it's a unique constraint error, user might have been created between checks
        if (createError.code === '23505') {
          console.log('⚠️ [STATS API] User may have been created concurrently, retrying check...')
          const { data: retryUser } = await adminClient
            .from('users')
            .select('id')
            .eq('id', userId)
            .single()
          if (retryUser) {
            userExists = retryUser
            console.log('✅ [STATS API] User found after retry')
          } else {
            return NextResponse.json(
              createSafeErrorResponse(createError, 'Failed to create user. Please try registering again.'),
              { status: sanitized.statusCode }
            )
          }
        } else {
          return NextResponse.json(
            createSafeErrorResponse(createError, 'Failed to create user. Please try again.'),
            { status: sanitized.statusCode }
          )
        }
      } else {
        // Verify user was actually created
        const { data: verifyUser } = await adminClient
          .from('users')
          .select('id')
          .eq('id', userId)
          .single()
        
        if (!verifyUser) {
          console.error('❌ [STATS API] User creation verification failed')
          return NextResponse.json(
            { error: 'User creation failed verification. Please try again.' },
            { status: 500 }
          )
        }
        
        userExists = newUser
        console.log('✅ [STATS API] User created and verified in users table successfully')
      }
    }

    // Check if stats exist
    const { data: existingStats } = await adminClient
      .from('player_stats')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (existingStats) {
      // Update existing stats
      const { data, error } = await adminClient
        .from('player_stats')
        .update({
          ...stats,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ [STATS API] Error updating stats:', error)
        // SECURITY: Sanitize database error
        const sanitized = sanitizeDatabaseError(error)
        return NextResponse.json(
          createSafeErrorResponse(error, 'Failed to update stats'),
          { status: sanitized.statusCode }
        )
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Create new stats with defaults
      const defaultStats = {
        user_id: userId,
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
        total_games: 0,
        win_streak: 0,
        best_streak: 0,
        total_questions_answered: 0,
        correct_answers: 0,
        accuracy: 0.00,
        average_response_time: 0.00,
        favorite_subject: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...stats
      }

      const { data, error } = await adminClient
        .from('player_stats')
        .insert(defaultStats)
        .select()
        .single()

      if (error) {
        console.error('❌ [STATS API] Error creating stats:', error)
        // SECURITY: Sanitize database error
        const sanitized = sanitizeDatabaseError(error)
        return NextResponse.json(
          createSafeErrorResponse(error, 'Failed to create stats. Please try again.'),
          { status: sanitized.statusCode }
        )
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error('❌ [STATS API] Error:', error)
    // SECURITY: Sanitize error message
    const sanitized = sanitizeError(error, 'Internal server error')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Internal server error'),
      { status: sanitized.statusCode }
    )
  }
}

