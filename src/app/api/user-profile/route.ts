import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * API route to create/update user profile
 * Uses admin client to bypass RLS since custom auth doesn't set auth.uid()
 */
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()
    const { user_id, username } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // First, verify the user exists in the users table
    let { data: userExists } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single()

    // If user doesn't exist in users table, try to create them
    if (!userExists) {
      console.log('⚠️ [PROFILE API] User not found in users table, attempting to create:', user_id)
      
      let authUserEmail = ''
      let authUserCreatedAt: string | null = null
      
      // Try to get user from auth.users (Supabase Auth)
      try {
        const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(user_id)
        
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
      const generatedUsername = username || `user_${user_id.slice(0, 8)}`
      
      // Validate user_id is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(user_id)) {
        console.error('❌ [PROFILE API] Invalid user_id format:', user_id)
        return NextResponse.json(
          { error: 'Invalid user ID format. Please log in again.' },
          { status: 400 }
        )
      }
      
      const { data: newUser, error: createError } = await adminClient
        .from('users')
        .insert({
          id: user_id,
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
            .eq('id', user_id)
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
            { error: `Failed to create user: ${createError.message}` },
            { status: 500 }
          )
        }
      } else {
        // Verify user was actually created
        const { data: verifyUser } = await adminClient
          .from('users')
          .select('id')
          .eq('id', user_id)
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

    // Check if profile exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('user_id, username')
      .eq('user_id', user_id)
      .single()

    if (existingProfile) {
      // Update existing profile (profiles table doesn't have email column)
      const { data, error } = await adminClient
        .from('profiles')
        .update({
          username: username || existingProfile.username,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
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
      const { data, error } = await adminClient
        .from('profiles')
        .insert({
          user_id,
          username: username || `user_${user_id.slice(0, 8)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [PROFILE API] Error creating profile:', error)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error('❌ [PROFILE API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

