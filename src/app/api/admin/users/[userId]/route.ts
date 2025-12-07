import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth/admin-auth'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * DELETE /api/admin/users/[userId] - Delete a user
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Check admin authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      )
    }

    const { userId } = await context.params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Delete user (this should cascade to related tables)
    const { error } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('❌ [ADMIN DELETE USER] Error:', error)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    console.log(`✅ [ADMIN DELETE USER] User ${userId} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('❌ [ADMIN DELETE USER] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[userId] - Update user (ban/unban, grant pro, etc.)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Check admin authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      )
    }

    const { userId } = await context.params
    const body = await request.json()
    const { is_active, subscription_tier, subscription_status } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Build update object
    const updates: any = {}
    if (typeof is_active === 'boolean') {
      updates.is_active = is_active
    }
    if (subscription_tier) {
      updates.subscription_tier = subscription_tier
      // If granting pro, also set status to active
      if (subscription_tier === 'pro') {
        updates.subscription_status = 'active'
        updates.subscription_current_period_end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      }
    }
    if (subscription_status) {
      updates.subscription_status = subscription_status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) {
      console.error('❌ [ADMIN UPDATE USER] Error:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    console.log(`✅ [ADMIN UPDATE USER] User ${userId} updated:`, updates)

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('❌ [ADMIN UPDATE USER] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

