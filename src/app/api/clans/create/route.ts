import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { createClanSchema } from '@/lib/validation/schemas'
import { getUserLimits } from '@/lib/subscription/limits'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'

/**
 * Fallback function to generate clan code if database function fails
 */
function generateClanCodeFallback(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create a new clan/classroom
 * 
 * FREEMIUM MODEL: Only Pro users can CREATE clans
 * - Teachers/organizers need Pro to create classrooms
 * - Free users can JOIN clans but cannot create them
 * - This allows one Pro account to enable unlimited free participation
 * 
 * POST /api/clans/create
 * 
 * @example
 * // Teacher creates classroom (Pro account required)
 * POST /api/clans/create
 * {
 *   "name": "AP Biology 2024",
 *   "description": "Period 1 Biology Class",
 *   "is_private": true,
 *   "max_members": 50
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

    // FREEMIUM MODEL: Only Pro users can CREATE clans
    // Free users can JOIN clans but cannot create them
    // This allows teachers (Pro) to create classrooms where students (Free) can participate
    const limits = await getUserLimits(userId)
    if (!limits.canCreateClans) {
      return NextResponse.json(
        { 
          error: 'Creating clans requires a Pro account. Upgrade to Pro ($4.99/month) to create classrooms and host clan sessions! Free users can join clans created by Pro members.',
          requiresPro: true,
          feature: 'create_clans',
          message: 'Only clan creators need Pro - members can join for free!'
        },
        { status: 403 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = createClanSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { name, description, is_private, max_members } = validation.data

    // Check if user has reached clan limit
    const adminClient = createAdminClient()
    const { count: clanCount } = await adminClient
      .from('clan_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (clanCount && clanCount >= limits.maxClansPerUser) {
      return NextResponse.json(
        { 
          error: `You can only join up to ${limits.maxClansPerUser} clans. Leave a clan to create a new one.` 
        },
        { status: 400 }
      )
    }

    // Generate unique clan code using database function
    let code: string
    const { data: codeData, error: codeError } = await adminClient.rpc('generate_clan_code')
    if (codeError || !codeData) {
      console.error('❌ [CLANS] Error generating clan code:', codeError)
      // Fallback: generate code client-side if RPC fails
      code = generateClanCodeFallback()
      
      // Verify code is unique (retry if collision)
      let attempts = 0
      while (attempts < 5) {
        const { data: existingClan } = await adminClient
          .from('clans')
          .select('id')
          .eq('code', code)
          .single()
        
        if (!existingClan) break
        code = generateClanCodeFallback()
        attempts++
      }
      
      if (attempts >= 5) {
        return NextResponse.json(
          { error: 'Failed to generate unique clan code. Please try again.' },
          { status: 500 }
        )
      }
    } else {
      code = codeData
    }

    // Create clan
    const { data: clan, error: clanError } = await adminClient
      .from('clans')
      .insert({
        name,
        description: description || null,
        code,
        owner_id: userId,
        is_private: is_private ?? true,
        max_members: Math.min(max_members, limits.maxClanMembers),
      })
      .select()
      .single()

    if (clanError) {
      console.error('❌ [CLANS] Error creating clan:', clanError)
      const sanitized = sanitizeError(clanError, 'Failed to create clan')
      return NextResponse.json(
        createSafeErrorResponse(clanError, 'Failed to create clan'),
        { status: sanitized.statusCode }
      )
    }

    // Add creator as owner
    const { error: memberError } = await adminClient
      .from('clan_members')
      .insert({
        clan_id: clan.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('❌ [CLANS] Error adding owner to clan:', memberError)
      // Try to delete the clan if adding owner fails
      await adminClient.from('clans').delete().eq('id', clan.id)
      return NextResponse.json(
        { error: 'Failed to create clan membership' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      clan: {
        id: clan.id,
        name: clan.name,
        description: clan.description,
        code: clan.code,
        is_private: clan.is_private,
        max_members: clan.max_members,
        member_count: 1,
        role: 'owner',
      },
    })
  } catch (error) {
    console.error('❌ [CLANS] Error in create clan:', error)
    const sanitized = sanitizeError(error, 'Failed to create clan')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to create clan'),
      { status: sanitized.statusCode }
    )
  }
}

