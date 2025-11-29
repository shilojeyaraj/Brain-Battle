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
 */
export async function verifySessionOwnership(
  userId: string,
  sessionId: string
): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('quiz_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return false
    }

    return data.user_id === userId
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

