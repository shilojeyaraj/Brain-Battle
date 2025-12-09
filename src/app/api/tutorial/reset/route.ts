import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Reset tutorial completion status for the current user
 * POST /api/tutorial/reset
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
      .update({ tutorial_completed: false })
      .eq('user_id', userId)
    
    if (error) {
      console.error('❌ [TUTORIAL RESET] Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to reset tutorial status' },
        { status: 500 }
      )
    }
    
    console.log('✅ [TUTORIAL RESET] Tutorial reset for user:', userId)
    
    return NextResponse.json({
      success: true,
      message: 'Tutorial reset successfully'
    })
  } catch (error) {
    console.error('❌ [TUTORIAL RESET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

