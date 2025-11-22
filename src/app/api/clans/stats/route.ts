import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { getUserLimits } from '@/lib/subscription/limits'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * Get clan leaderboard/stats (Pro feature only)
 * GET /api/clans/stats?clan_id=xxx
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

    // Both Pro and Free users can view clan stats (if they're members)
    const limits = await getUserLimits(userId)
    if (!limits.canJoinClans) {
      return NextResponse.json(
        { 
          error: 'Unable to access clan stats. Please contact support.',
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

    // Get all members with their stats
    const { data: members } = await adminClient
      .from('clan_members')
      .select('user_id, profiles!inner(username)')
      .eq('clan_id', clanId)

    const memberIds = (members || []).map((m: any) => m.user_id)

    // Get stats for all members
    const { data: allStats } = await adminClient
      .from('player_stats')
      .select('user_id, xp, level, total_wins, total_games, accuracy, correct_answers, total_questions_answered')
      .in('user_id', memberIds)
      .order('xp', { ascending: false })

    // Get profiles for usernames
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', memberIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))

    // Combine stats with profiles and rank
    const leaderboard = (allStats || []).map((stat: any, index: number) => {
      const profile = profileMap.get(stat.user_id)
      return {
        rank: index + 1,
        user_id: stat.user_id,
        username: profile?.username || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        xp: stat.xp || 0,
        level: stat.level || 1,
        total_wins: stat.total_wins || 0,
        total_games: stat.total_games || 0,
        accuracy: stat.accuracy || 0,
        correct_answers: stat.correct_answers || 0,
        total_questions: stat.total_questions_answered || 0,
      }
    })

    // Calculate clan totals
    const clanTotals = {
      total_members: memberIds.length,
      total_xp: leaderboard.reduce((sum, m) => sum + m.xp, 0),
      total_wins: leaderboard.reduce((sum, m) => sum + m.total_wins, 0),
      total_games: leaderboard.reduce((sum, m) => sum + m.total_games, 0),
      average_accuracy: leaderboard.length > 0
        ? leaderboard.reduce((sum, m) => sum + m.accuracy, 0) / leaderboard.length
        : 0,
    }

    return NextResponse.json({
      success: true,
      leaderboard,
      totals: clanTotals,
    })
  } catch (error) {
    console.error('❌ [CLANS] Error in get clan stats:', error)
    const sanitized = sanitizeError(error, 'Failed to fetch clan stats')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to fetch clan stats'),
      { status: sanitized.statusCode }
    )
  }
}

