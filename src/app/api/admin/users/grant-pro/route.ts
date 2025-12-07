import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth/admin-auth'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * POST /api/admin/users/grant-pro - Grant pro rank to user by email or username
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, username } = body

    if (!email && !username) {
      return NextResponse.json(
        { error: 'Email or username is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Find user by email or username
    let query = adminClient
      .from('users')
      .select('id, email, username, subscription_tier')
    
    if (email) {
      query = query.eq('email', email.toLowerCase().trim())
    } else {
      query = query.eq('username', username.trim())
    }

    const { data: user, error: findError } = await query.maybeSingle()

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ [ADMIN GRANT PRO] Error finding user:', findError)
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Grant pro subscription
    const { error: updateError } = await adminClient
      .from('users')
      .update({
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ [ADMIN GRANT PRO] Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to grant pro subscription' },
        { status: 500 }
      )
    }

    console.log(`✅ [ADMIN GRANT PRO] Pro subscription granted to user ${user.id} (${user.email || user.username})`)

    return NextResponse.json({
      success: true,
      message: 'Pro subscription granted successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        subscription_tier: 'pro'
      }
    })
  } catch (error) {
    console.error('❌ [ADMIN GRANT PRO] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

