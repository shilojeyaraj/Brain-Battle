import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { isValidUUID, sanitizeString } from '@/lib/security/input-validation'

/**
 * API route to create/update user profile
 * Uses admin client to bypass RLS since custom auth doesn't set auth.uid()
 * SECURITY: userId comes from session cookie, not request body
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from session cookie, not request body
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // SECURITY: Validate userId format
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()
    
    // Parse request body with error handling
    let body: any = {}
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ [PROFILE API] Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      )
    }
    
    const { username } = body
    
    // SECURITY: Ensure user_id from session matches (prevent impersonation)
    // Note: user_id in body is ignored - we use session userId
    console.log('📝 [PROFILE API] Received request:', { userId, username })

    // SECURITY: Sanitize username input
    const sanitizedUsername = sanitizeString(username, 50)
    if (!sanitizedUsername) {
      return NextResponse.json(
        { error: 'Username is required and must be a valid string' },
        { status: 400 }
      )
    }

    // First, verify the user exists in the users table
    let { data: userExists } = await adminClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    // If user doesn't exist in users table, try to create them
    if (!userExists) {
      console.log('⚠️ [PROFILE API] User not found in users table, attempting to create:', userId)
      
      let authUserEmail = ''
      let authUserCreatedAt: string | null = null
      
      // Try to get user from auth.users (Supabase Auth)
      try {
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)
        
        if (authUser?.user) {
          console.log('✅ [PROFILE API] User found in auth.users')
          authUserEmail = authUser.user.email || ''
          authUserCreatedAt = authUser.user.created_at || null
        } else if (authError) {
          console.log('⚠️ [PROFILE API] Could not fetch from auth.users (may be using custom auth):', authError.message)
        }
      } catch (error: any) {
        console.log('⚠️ [PROFILE API] Error checking auth.users (may be using custom auth):', error.message)
        // Continue - we'll create user anyway with defaults
      }
      
      // Create user in users table (works for both Supabase Auth and custom auth)
      const generatedUsername = sanitizedUsername || `user_${userId.slice(0, 8)}`
      
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
        console.error('❌ [PROFILE API] Failed to create user in users table:', createError)
        // If it's a unique constraint error, user might have been created between checks
        if (createError.code === '23505') {
          console.log('⚠️ [PROFILE API] User may have been created concurrently, retrying check...')
          const { data: retryUser } = await adminClient
            .from('users')
            .select('id')
            .eq('id', userId)
            .single()
          if (retryUser) {
            userExists = retryUser
            console.log('✅ [PROFILE API] User found after retry')
          } else {
            return NextResponse.json(
              { error: 'Failed to create user. Please try registering again.' },
              { status: 500 }
            )
          }
        } else if (createError.code === '23502') {
          // NOT NULL constraint violation
          console.error('❌ [PROFILE API] Required field is missing:', createError.message)
          return NextResponse.json(
            { error: 'User creation failed: Missing required fields. Please contact support.' },
            { status: 500 }
          )
        } else {
          return NextResponse.json(
            { error: 'Failed to create user. Please try again.' },
            { status: 500 }
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
          console.error('❌ [PROFILE API] User creation verification failed')
          return NextResponse.json(
            { error: 'User creation failed verification. Please try again.' },
            { status: 500 }
          )
        }
        
        userExists = newUser
        console.log('✅ [PROFILE API] User created and verified in users table successfully')
      }
    }

    // Verify user exists before creating profile (required for foreign key)
    if (!userExists) {
      console.error('❌ [PROFILE API] Cannot create profile: user does not exist in users table')
      return NextResponse.json(
        { error: 'User does not exist. Please ensure the user is created first.' },
        { status: 400 }
      )
    }

    // Use sanitized username
    const actualUsername = sanitizedUsername

    // Check if profile exists (handle "not found" errors gracefully)
    const { data: existingProfile, error: profileCheckError } = await adminClient
      .from('profiles')
      .select('user_id, username')
      .eq('user_id', userId)
      .single()

    // Only treat as existing if we have data and no error (or error is just "not found")
    const profileExists = existingProfile && (!profileCheckError || (profileCheckError && typeof profileCheckError === 'object' && 'code' in profileCheckError && (profileCheckError as { code?: string }).code === 'PGRST116'))

    if (profileExists) {
      // SECURITY: Verify user owns this profile before updating
      if (existingProfile.user_id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized - you can only update your own profile' },
          { status: 403 }
        )
      }

      // Update existing profile (profiles table doesn't have email column)
      const { data, error } = await adminClient
        .from('profiles')
        .update({
          username: actualUsername || existingProfile.username,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('❌ [PROFILE API] Error updating profile:', error)
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Create new profile (profiles table doesn't have email column)
      // Ensure user exists first (should be guaranteed by check above, but double-check)
      const finalUsername = actualUsername || `user_${userId.slice(0, 8)}`
      
      console.log('📝 [PROFILE API] Creating new profile:', { userId, username: finalUsername, userExists: !!userExists })
      
      const { data, error } = await adminClient
        .from('profiles')
        .insert({
          user_id: userId,
          username: finalUsername,
          tutorial_completed: false, // 🚀 FIX: Explicitly set tutorial_completed to false for new users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [PROFILE API] Error creating profile:', error)
        console.error('❌ [PROFILE API] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
          username: finalUsername,
          userExists: !!userExists
        })
        
        // Handle specific error cases
        if (error.code === '23503') {
          // Foreign key constraint violation - user doesn't exist in users table
          return NextResponse.json(
            { error: 'User does not exist. Please ensure the user is created first.' },
            { status: 400 }
          )
        } else if (error.code === '23505') {
          // Unique constraint violation (likely username already exists)
          // Try with a more unique username
          const uniqueUsername = `${finalUsername}_${Date.now().toString().slice(-6)}`
          console.log('🔄 [PROFILE API] Retrying with unique username:', uniqueUsername)
          
          const { data: retryData, error: retryError } = await adminClient
            .from('profiles')
            .insert({
              user_id: userId,
              username: uniqueUsername,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (retryError) {
            return NextResponse.json(
              { error: 'Failed to create profile. Please try again.' },
              { status: 500 }
            )
          }
          
          return NextResponse.json({ success: true, data: retryData })
        } else if (error.code === '23502') {
          // NOT NULL constraint violation
          return NextResponse.json(
            { error: 'Missing required field. Please check your input.' },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to create profile. Please try again.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error('❌ [PROFILE API] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

