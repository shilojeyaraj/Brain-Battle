import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { joinClanSchema } from '@/lib/validation/schemas'
import { getUserLimits } from '@/lib/subscription/limits'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * Join a clan/classroom by code
 * 
 * FREEMIUM MODEL: Both Pro and Free users can JOIN clans
 * - Free users can join up to 3 clans
 * - Pro users can join up to 10 clans
 * - This allows students (Free) to participate in teacher's (Pro) classroom
 * 
 * POST /api/clans/join
 * 
 * @example
 * // Student joins teacher's classroom (Free account works)
 * POST /api/clans/join
 * {
 *   "code": "ABC123XY"
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

    // FREEMIUM MODEL: Both Pro and Free users can JOIN clans
    // Only creating clans requires Pro - joining is available to all
    const limits = await getUserLimits(userId)
    if (!limits.canJoinClans) {
      return NextResponse.json(
        { 
          error: 'Unable to join clans. Please contact support.',
        },
        { status: 403 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = joinClanSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid clan code', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { code } = validation.data

    const adminClient = createAdminClient()

    // Find clan by code
    const { data: clan, error: clanError } = await adminClient
      .from('clans')
      .select('*')
      .eq('code', code)
      .single()

    if (clanError || !clan) {
      return NextResponse.json(
        { error: 'Clan not found. Please check the code and try again.' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await adminClient
      .from('clan_members')
      .select('*')
      .eq('clan_id', clan.id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this clan' },
        { status: 400 }
      )
    }

    // Check if clan is full
    const { count: memberCount } = await adminClient
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('clan_id', clan.id)

    if (memberCount && memberCount >= clan.max_members) {
      return NextResponse.json(
        { error: 'This clan is full. Maximum members reached.' },
        { status: 400 }
      )
    }

    // Check if user has reached clan limit
    // Free users: 3 clans max | Pro users: 10 clans max
    const { count: userClanCount } = await adminClient
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (userClanCount && userClanCount >= limits.maxClansPerUser) {
      const isFreeUser = limits.maxClansPerUser === 3
      return NextResponse.json(
        { 
          error: `You can only join up to ${limits.maxClansPerUser} clans. ${isFreeUser ? 'Leave a clan to join this one, or upgrade to Pro to join up to 10 clans!' : 'Leave a clan to join this one.'}`,
          maxClansReached: true,
          currentLimit: limits.maxClansPerUser,
          isFreeUser
        },
        { status: 400 }
      )
    }

    // Add user to clan
    const { data: member, error: memberError } = await adminClient
      .from('clan_members')
      .insert({
        clan_id: clan.id,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single()

    if (memberError) {
      console.error('❌ [CLANS] Error joining clan:', memberError)
      const sanitized = sanitizeError(memberError, 'Failed to join clan')
      return NextResponse.json(
        createSafeErrorResponse(memberError, 'Failed to join clan'),
        { status: sanitized.statusCode }
      )
    }

    // Get updated member count
    const { count: newMemberCount } = await adminClient
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('clan_id', clan.id)

    return NextResponse.json({
      success: true,
      clan: {
        id: clan.id,
        name: clan.name,
        description: clan.description,
        code: clan.code,
        is_private: clan.is_private,
        max_members: clan.max_members,
        member_count: newMemberCount || 0,
        role: 'member',
      },
    })
  } catch (error) {
    console.error('❌ [CLANS] Error in join clan:', error)
    const sanitized = sanitizeError(error, 'Failed to join clan')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to join clan'),
      { status: sanitized.statusCode }
    )
  }
}

