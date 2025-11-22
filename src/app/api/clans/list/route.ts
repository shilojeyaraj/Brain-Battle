import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { getUserLimits } from '@/lib/subscription/limits'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * Get list of clans user belongs to
 * 
 * FREEMIUM MODEL: Both Pro and Free users can list their clans
 * - Returns all clans the user is a member of
 * - Includes role (owner/admin/member) and clan details
 * 
 * GET /api/clans/list
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from session
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Both Pro and Free users can list their clans
    const limits = await getUserLimits(userId)
    if (!limits.canJoinClans) {
      return NextResponse.json(
        { 
          error: 'Unable to access clans. Please contact support.',
        },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()

    // Get all clans user is a member of
    const { data: memberships, error: membershipError } = await adminClient
      .from('clan_members')
      .select(`
        id,
        role,
        joined_at,
        clans (
          id,
          name,
          description,
          code,
          is_private,
          max_members,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })

    if (membershipError) {
      console.error('❌ [CLANS] Error fetching clans:', membershipError)
      const sanitized = sanitizeError(membershipError, 'Failed to fetch clans')
      return NextResponse.json(
        createSafeErrorResponse(membershipError, 'Failed to fetch clans'),
        { status: sanitized.statusCode }
      )
    }

    // Get member counts for each clan
    const clansWithCounts = await Promise.all(
      (memberships || []).map(async (membership: any) => {
        const clan = membership.clans
        if (!clan) return null

        const { count } = await adminClient
          .from('clan_members')
          .select('*', { count: 'exact', head: true })
          .eq('clan_id', clan.id)

        return {
          id: clan.id,
          name: clan.name,
          description: clan.description,
          code: clan.code,
          is_private: clan.is_private,
          max_members: clan.max_members,
          member_count: count || 0,
          role: membership.role,
          is_owner: clan.owner_id === userId,
          joined_at: membership.joined_at,
          created_at: clan.created_at,
        }
      })
    )

    return NextResponse.json({
      success: true,
      clans: clansWithCounts.filter(Boolean),
    })
  } catch (error) {
    console.error('❌ [CLANS] Error in list clans:', error)
    const sanitized = sanitizeError(error, 'Failed to fetch clans')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to fetch clans'),
      { status: sanitized.statusCode }
    )
  }
}

