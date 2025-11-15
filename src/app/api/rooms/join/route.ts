/**
 * Room Join API Route
 * 
 * POST /api/rooms/join
 * 
 * Allows a user to join a room, checking room capacity and subscription limits.
 * Free users cannot join rooms with more than 4 players.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserLimits } from '@/lib/subscription/limits'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, roomCode } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!roomCode) {
      return NextResponse.json(
        { error: 'roomCode is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Find room by code
    const { data: room, error: roomError } = await adminClient
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Room not found. Please check the code and try again.' 
        },
        { status: 404 }
      )
    }

    // Check if room is full
    if (room.current_players >= room.max_players) {
      return NextResponse.json(
        { 
          success: false,
          error: 'This room is full. Maximum players reached.' 
        },
        { status: 403 }
      )
    }

    // Check subscription limits - Free users cannot join rooms with > 4 players
    const limits = await getUserLimits(userId)
    if (room.max_players > limits.maxPlayersPerRoom) {
      return NextResponse.json(
        { 
          success: false,
          error: `This room supports up to ${room.max_players} players, but free users can only join rooms with up to ${limits.maxPlayersPerRoom} players. Upgrade to Pro to join larger rooms.`,
          requiresPro: true,
          roomMaxPlayers: room.max_players,
          userMaxPlayers: limits.maxPlayersPerRoom
        },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await adminClient
      .from('room_members')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return NextResponse.json({
        success: true,
        message: 'User is already a member',
        room
      })
    }

    // Add user as a member
    const { error: memberError } = await adminClient
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_ready: false
      })

    if (memberError) {
      console.error('❌ [ROOM JOIN API] Error adding member:', memberError)
      return NextResponse.json(
        { 
          success: false,
          error: `Failed to join room: ${memberError.message}` 
        },
        { status: 500 }
      )
    }

    // Update current_players count
    const { error: updateError } = await adminClient
      .from('game_rooms')
      .update({ 
        current_players: room.current_players + 1 
      })
      .eq('id', room.id)

    if (updateError) {
      console.error('❌ [ROOM JOIN API] Error updating player count:', updateError)
      // Don't fail the request, just log the error
    }

    // Fetch updated room
    const { data: updatedRoom } = await adminClient
      .from('game_rooms')
      .select('*')
      .eq('id', room.id)
      .single()

    return NextResponse.json({
      success: true,
      room: updatedRoom || room
    })
  } catch (error) {
    console.error('❌ [ROOM JOIN API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join room' 
      },
      { status: 500 }
    )
  }
}

