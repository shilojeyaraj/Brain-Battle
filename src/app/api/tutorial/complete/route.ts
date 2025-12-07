import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Mark tutorial as completed for the current user
 * POST /api/tutorial/complete
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
    const { error } = await supabase
      .from('profiles')
      .update({ tutorial_completed: true })
      .eq('user_id', userId)
    
    if (error) {
      console.error('❌ [TUTORIAL COMPLETE] Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update tutorial status' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tutorial marked as completed'
    })
  } catch (error) {
    console.error('❌ [TUTORIAL COMPLETE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

