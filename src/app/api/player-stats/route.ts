import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { playerStatsSchema } from '@/lib/validation/schemas'
import { sanitizeError, sanitizeDatabaseError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * API route to GET player stats (read-only)
 * 🛡️ SECURITY FIX #4: Stats can only be updated through game results, not directly via API
 * This prevents users from manipulating their XP, wins, etc. by calling this endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get userId from session cookie or query param
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(request) || request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()

    // Fetch stats (read-only)
    const { data: stats, error } = await adminClient
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ [STATS API] Error fetching stats:', error)
      const sanitized = sanitizeDatabaseError(error)
      return NextResponse.json(
        createSafeErrorResponse(error, 'Failed to fetch stats'),
        { status: sanitized.statusCode }
      )
    }

    // Return stats or empty object if not found
    return NextResponse.json({ 
      success: true, 
      stats: stats || {
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
        accuracy: 0,
        average_response_time: 0,
        favorite_subject: null
      }
    })
  } catch (error) {
    console.error('❌ [STATS API] Error:', error)
    const sanitized = sanitizeError(error, 'Internal server error')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Internal server error'),
      { status: sanitized.statusCode }
    )
  }
}

/**
 * 🛡️ SECURITY: POST method is disabled - stats can only be updated through game results
 * This prevents direct manipulation of XP, wins, etc.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Stats cannot be updated directly. Stats are automatically updated when you complete quizzes.',
      message: 'To update your stats, complete quizzes through the game interface.'
    },
    { status: 403 }
  )
}

