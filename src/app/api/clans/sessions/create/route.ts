import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { createClanSessionSchema } from '@/lib/validation/schemas'
import { getUserLimits } from '@/lib/subscription/limits'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'
import { randomUUID } from 'crypto'

/**
 * Create a clan-wide quiz session
 * 
 * FREEMIUM MODEL: Only clan owners/admins can create sessions
 * - Usually Pro users (since only Pro can create clans)
 * - All clan members (Pro and Free) can participate in sessions
 * - Like Kahoot: teacher hosts, students play
 * 
 * POST /api/clans/sessions/create
 * 
 * @example
 * // Teacher creates quiz session for entire class
 * POST /api/clans/sessions/create
 * {
 *   "clan_id": "uuid",
 *   "topic": "Cell Biology",
 *   "difficulty": "medium",
 *   "total_questions": 20
 * }
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

    // Only clan owners/admins can create sessions (usually Pro users, but check role)
    // Note: Since only Pro users can create clans, owners will be Pro, but we check role anyway
    const limits = await getUserLimits(userId)
    if (!limits.canJoinClans) {
      return NextResponse.json(
        { 
          error: 'Unable to create clan sessions. Please contact support.',
        },
        { status: 403 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = createClanSessionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { clan_id, topic, difficulty, total_questions, question_types } = validation.data

    const adminClient = createAdminClient()

    // Verify user is an admin/owner of the clan
    const { data: membership } = await adminClient
      .from('clan_members')
      .select('role')
      .eq('clan_id', clan_id)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this clan' },
        { status: 403 }
      )
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only clan owners and admins can create clan sessions' },
        { status: 403 }
      )
    }

    // Get clan info
    const { data: clan } = await adminClient
      .from('clans')
      .select('name, max_members')
      .eq('id', clan_id)
      .single()

    if (!clan) {
      return NextResponse.json(
        { error: 'Clan not found' },
        { status: 404 }
      )
    }

    // Create quiz session for the clan
    const sessionId = randomUUID()
    const sessionName = `Clan: ${clan.name} - ${topic || 'Quiz Session'}`

    const { data: quizSession, error: sessionError } = await adminClient
      .from('quiz_sessions')
      .insert({
        id: sessionId,
        session_name: sessionName,
        user_id: userId,
        room_id: null, // Clan sessions don't use rooms
        topic: topic || null,
        difficulty: difficulty || 'medium',
        total_questions: total_questions || 10,
        status: 'waiting', // Waiting for members to join
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) {
      console.error('❌ [CLAN SESSIONS] Error creating quiz session:', sessionError)
      const sanitized = sanitizeError(sessionError, 'Failed to create quiz session')
      return NextResponse.json(
        createSafeErrorResponse(sessionError, 'Failed to create quiz session'),
        { status: sanitized.statusCode }
      )
    }

    // Link session to clan
    const { error: linkError } = await adminClient
      .from('clan_sessions')
      .insert({
        clan_id,
        session_id: sessionId,
        created_by: userId,
      })

    if (linkError) {
      console.error('❌ [CLAN SESSIONS] Error linking session to clan:', linkError)
      // Try to clean up the session
      await adminClient.from('quiz_sessions').delete().eq('id', sessionId)
      const sanitized = sanitizeError(linkError, 'Failed to link session to clan')
      return NextResponse.json(
        createSafeErrorResponse(linkError, 'Failed to link session to clan'),
        { status: sanitized.statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        session_name: sessionName,
        clan_id,
        topic: topic || null,
        difficulty: difficulty || 'medium',
        total_questions: total_questions || 10,
        question_types: question_types || null,
        status: 'waiting',
        created_at: quizSession.created_at,
      },
      message: 'Clan session created. Members can now join!',
    })
  } catch (error) {
    console.error('❌ [CLAN SESSIONS] Error in create clan session:', error)
    const sanitized = sanitizeError(error, 'Failed to create clan session')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to create clan session'),
      { status: sanitized.statusCode }
    )
  }
}

