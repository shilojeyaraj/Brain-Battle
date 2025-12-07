import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Check if user has completed the tutorial
 * GET /api/tutorial/check
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tutorial_completed')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('❌ [TUTORIAL CHECK] Error fetching profile:', error)
      // If profile doesn't exist, assume tutorial not completed (new user)
      return NextResponse.json({
        success: true,
        tutorialCompleted: false
      })
    }
    
    return NextResponse.json({
      success: true,
      tutorialCompleted: profile?.tutorial_completed ?? false
    })
  } catch (error) {
    console.error('❌ [TUTORIAL CHECK] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

