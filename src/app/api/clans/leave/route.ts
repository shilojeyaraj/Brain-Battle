import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * Leave a clan (Pro feature only)
 * POST /api/clans/leave
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from session
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clan_id } = body

    if (!clan_id || typeof clan_id !== 'string') {
      return NextResponse.json(
        { error: 'Clan ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Check if user is a member
    const { data: membership } = await adminClient
      .from('clan_members')
      .select('role, clans!inner(owner_id)')
      .eq('clan_id', clan_id)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this clan' },
        { status: 404 }
      )
    }

    // Check if user is the owner
    const clan = membership.clans as any
    if (clan?.owner_id === userId) {
      // Owner cannot leave - they must delete the clan or transfer ownership
      return NextResponse.json(
        { error: 'Clan owners cannot leave. Delete the clan or transfer ownership first.' },
        { status: 400 }
      )
    }

    // Remove user from clan
    const { error: leaveError } = await adminClient
      .from('clan_members')
      .delete()
      .eq('clan_id', clan_id)
      .eq('user_id', userId)

    if (leaveError) {
      console.error('❌ [CLANS] Error leaving clan:', leaveError)
      const sanitized = sanitizeError(leaveError, 'Failed to leave clan')
      return NextResponse.json(
        createSafeErrorResponse(leaveError, 'Failed to leave clan'),
        { status: sanitized.statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left clan',
    })
  } catch (error) {
    console.error('❌ [CLANS] Error in leave clan:', error)
    const sanitized = sanitizeError(error, 'Failed to leave clan')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to leave clan'),
      { status: sanitized.statusCode }
    )
  }
}

