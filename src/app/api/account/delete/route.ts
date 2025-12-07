import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest, clearSessionCookieResponse } from '@/lib/auth/session-cookies'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Delete user account and all associated data
 * POST /api/account/delete
 * 
 * This will:
 * 1. Delete the user's profile (cascades to related data via foreign keys)
 * 2. Delete player stats
 * 3. Delete all game rooms owned by the user
 * 4. Delete all room memberships
 * 5. Delete all quiz sessions
 * 6. Delete all documents and study notes
 * 7. Clear the session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const supabase = createAdminClient()
    
    // Delete user data (cascade deletes will handle related data)
    // Note: We delete from profiles table, which should cascade to:
    // - player_stats (via user_id)
    // - game_rooms (via owner_id)
    // - room_members (via user_id)
    // - quiz_sessions (via room_id -> game_rooms)
    // - documents (via user_id or room_id)
    // - study_notes (via room_id)
    
    // First, delete from custom users table if it exists
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (usersError && usersError.code !== 'PGRST116') {
      console.error('❌ [DELETE ACCOUNT] Error deleting from users table:', usersError)
      // Continue even if this fails (might not exist)
    }
    
    // Delete from profiles table (cascades to related data)
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)
    
    if (profilesError) {
      console.error('❌ [DELETE ACCOUNT] Error deleting profile:', profilesError)
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      )
    }
    
    // Delete player stats
    const { error: statsError } = await supabase
      .from('player_stats')
      .delete()
      .eq('user_id', userId)
    
    if (statsError && statsError.code !== 'PGRST116') {
      console.error('❌ [DELETE ACCOUNT] Error deleting player stats:', statsError)
      // Continue even if this fails
    }
    
    // Delete game rooms owned by user
    const { error: roomsError } = await supabase
      .from('game_rooms')
      .delete()
      .eq('owner_id', userId)
    
    if (roomsError && roomsError.code !== 'PGRST116') {
      console.error('❌ [DELETE ACCOUNT] Error deleting game rooms:', roomsError)
      // Continue even if this fails
    }
    
    // Delete room memberships
    const { error: membersError } = await supabase
      .from('room_members')
      .delete()
      .eq('user_id', userId)
    
    if (membersError && membersError.code !== 'PGRST116') {
      console.error('❌ [DELETE ACCOUNT] Error deleting room members:', membersError)
      // Continue even if this fails
    }
    
    // Delete quiz sessions (via room_id or user_id if exists)
    // Note: This might be handled by cascade, but we'll try explicitly
    const { data: userRooms } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('owner_id', userId)
    
    if (userRooms && userRooms.length > 0) {
      const roomIds = userRooms.map(r => r.id)
      const { error: sessionsError } = await supabase
        .from('quiz_sessions')
        .delete()
        .in('room_id', roomIds)
      
      if (sessionsError && sessionsError.code !== 'PGRST116') {
        console.error('❌ [DELETE ACCOUNT] Error deleting quiz sessions:', sessionsError)
        // Continue even if this fails
      }
    }
    
    // Delete documents
    const { error: docsError } = await supabase
      .from('documents')
      .delete()
      .eq('user_id', userId)
    
    if (docsError && docsError.code !== 'PGRST116') {
      console.error('❌ [DELETE ACCOUNT] Error deleting documents:', docsError)
      // Continue even if this fails
    }
    
    // Delete study notes (via room_id)
    if (userRooms && userRooms.length > 0) {
      const roomIds = userRooms.map(r => r.id)
      const { error: notesError } = await supabase
        .from('study_notes')
        .delete()
        .in('room_id', roomIds)
      
      if (notesError && notesError.code !== 'PGRST116') {
        console.error('❌ [DELETE ACCOUNT] Error deleting study notes:', notesError)
        // Continue even if this fails
      }
    }
    
    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
    
    clearSessionCookieResponse(response)
    
    console.log(`✅ [DELETE ACCOUNT] Account deleted for user: ${userId}`)
    
    return response
  } catch (error) {
    console.error('❌ [DELETE ACCOUNT] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

