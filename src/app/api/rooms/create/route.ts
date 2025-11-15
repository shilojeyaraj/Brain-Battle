/**
 * Room Creation API Route
 * 
 * POST /api/rooms/create
 * 
 * Creates a new game room with subscription-based player limits.
 * Free users: max 4 players
 * Pro users: max 20 players
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { checkRoomSizeLimit } from '@/lib/subscription/limits'
import { generateRoomCode } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      name, 
      maxPlayers = 4,
      subject,
      difficulty = 'medium',
      isPrivate = false,
      timeLimit = 30,
      totalQuestions = 10
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      )
    }

    // Check room size limit based on subscription
    const sizeCheck = await checkRoomSizeLimit(userId, maxPlayers)
    
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        { 
          success: false,
          error: `Free users can create rooms with up to ${sizeCheck.maxAllowed} players. Upgrade to Pro for rooms with up to 20 players.`,
          requiresPro: sizeCheck.requiresPro,
          maxAllowed: sizeCheck.maxAllowed,
          requestedSize: sizeCheck.requestedSize
        },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()
    const roomCode = generateRoomCode()

    // Create the room
    const { data: room, error: roomError } = await adminClient
      .from('game_rooms')
      .insert({
        name,
        room_code: roomCode,
        host_id: userId,
        subject: subject || null,
        difficulty,
        max_players: maxPlayers,
        current_players: 1,
        status: 'waiting',
        is_private: isPrivate,
        time_limit: timeLimit,
        total_questions: totalQuestions,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (roomError) {
      console.error('❌ [ROOM CREATE API] Error creating room:', roomError)
      return NextResponse.json(
        { 
          success: false,
          error: `Failed to create room: ${roomError.message}` 
        },
        { status: 500 }
      )
    }

    // Add creator as a member
    const { error: memberError } = await adminClient
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_ready: true
      })

    if (memberError) {
      console.error('❌ [ROOM CREATE API] Error adding creator as member:', memberError)
      // Try to clean up the room
      await adminClient.from('game_rooms').delete().eq('id', room.id)
      return NextResponse.json(
        { 
          success: false,
          error: `Failed to add creator to room: ${memberError.message}` 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      room
    })
  } catch (error) {
    console.error('❌ [ROOM CREATE API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create room' 
      },
      { status: 500 }
    )
  }
}

