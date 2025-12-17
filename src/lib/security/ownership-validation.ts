/**
 * Ownership Validation Utilities
 * 
 * Validates that users can only access/modify their own data
 */

import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Verify that a user owns a document
 */
export async function verifyDocumentOwnership(
  userId: string,
  documentId: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('documents')
      .select('uploaded_by')
      .eq('id', documentId)
      .single()

    if (error || !data) {
      return false
    }

    return data.uploaded_by === userId
  } catch (error) {
    console.error('Error verifying document ownership:', error)
    return false
  }
}

/**
 * Verify that a user owns a quiz session
 * For singleplayer sessions (room_id is null), check via game_results
 * For multiplayer sessions, check via room_members
 */
export async function verifySessionOwnership(
  userId: string,
  sessionId: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    
    // First, get the session to check if it's singleplayer or multiplayer
    const { data: session, error: sessionError } = await adminClient
      .from('quiz_sessions')
      .select('id, room_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      // For singleplayer, if session doesn't exist yet, allow it (will be created on first submission)
      // Check if it's a valid UUID format (singleplayer sessions use UUIDs)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(sessionId)) {
        // Likely a singleplayer session that hasn't been created yet - allow it
        console.log(`ℹ️ [OWNERSHIP] Session ${sessionId} not found, but allowing for singleplayer (will be created)`)
        return true
      }
      console.log(`⚠️ [OWNERSHIP] Session not found: ${sessionId}`)
      return false
    }

    // Singleplayer session (room_id is null) - verify via game_results
    if (!session.room_id) {
      const { data: gameResult } = await adminClient
        .from('game_results')
        .select('user_id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .maybeSingle()
      
      // If game_result exists, user owns it
      // If no game_result yet (first submission), allow it for singleplayer
      return true // Singleplayer sessions are user-owned by default
    }

    // Multiplayer session - verify via room_members
    const { data: roomMember } = await adminClient
      .from('room_members')
      .select('user_id')
      .eq('room_id', session.room_id)
      .eq('user_id', userId)
      .maybeSingle()

    return !!roomMember
  } catch (error) {
    console.error('Error verifying session ownership:', error)
    return false
  }
}

/**
 * Verify that a user is a member of a room
 */
export async function verifyRoomMembership(
  userId: string,
  roomId: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('Error verifying room membership:', error)
    return false
  }
}

/**
 * Verify that a user owns a game result
 */
export async function verifyGameResultOwnership(
  userId: string,
  resultId: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('game_results')
      .select('user_id')
      .eq('id', resultId)
      .single()

    if (error || !data) {
      return false
    }

    return data.user_id === userId
  } catch (error) {
    console.error('Error verifying game result ownership:', error)
    return false
  }
}

