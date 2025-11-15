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
    const { data: userExists } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single()

    if (!userExists) {
      console.error('❌ [PROFILE API] User does not exist in users table:', user_id)
      return NextResponse.json(
        { error: 'User does not exist. Please register first.' },
        { status: 404 }
      )
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

