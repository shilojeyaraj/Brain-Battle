import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { getUserLimits } from '@/lib/subscription/limits'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * Get members of a clan (Pro feature only)
 * GET /api/clans/members?clan_id=xxx
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

    // Both Pro and Free users can view clan members (if they're members)
    const limits = await getUserLimits(userId)
    if (!limits.canJoinClans) {
      return NextResponse.json(
        { 
          error: 'Unable to access clan members. Please contact support.',
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clanId = searchParams.get('clan_id')

    if (!clanId) {
      return NextResponse.json(
        { error: 'Clan ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify user is a member of the clan
    const { data: membership } = await adminClient
      .from('clan_members')
      .select('*')
      .eq('clan_id', clanId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this clan' },
        { status: 403 }
      )
    }

    // Get all members with their profiles and stats
    const { data: members, error: membersError } = await adminClient
      .from('clan_members')
      .select(`
        id,
        role,
        joined_at,
        user_id,
        profiles!inner (
          user_id,
          username,
          avatar_url
        )
      `)
      .eq('clan_id', clanId)
      .order('role', { ascending: false }) // Owners/admins first
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('❌ [CLANS] Error fetching members:', membersError)
      const sanitized = sanitizeError(membersError, 'Failed to fetch clan members')
      return NextResponse.json(
        createSafeErrorResponse(membersError, 'Failed to fetch clan members'),
        { status: sanitized.statusCode }
      )
    }

    // Get stats for each member
    const membersWithStats = await Promise.all(
      (members || []).map(async (member: any) => {
        const profile = member.profiles
        const memberUserId = member.user_id

        // Get player stats
        const { data: stats } = await adminClient
          .from('player_stats')
          .select('xp, level, total_wins, total_games, accuracy')
          .eq('user_id', memberUserId)
          .single()

        return {
          user_id: memberUserId,
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          role: member.role,
          joined_at: member.joined_at,
          stats: stats || {
            xp: 0,
            level: 1,
            total_wins: 0,
            total_games: 0,
            accuracy: 0,
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      members: membersWithStats,
    })
  } catch (error) {
    console.error('❌ [CLANS] Error in get clan members:', error)
    const sanitized = sanitizeError(error, 'Failed to fetch clan members')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to fetch clan members'),
      { status: sanitized.statusCode }
    )
  }
}

