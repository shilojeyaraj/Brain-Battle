import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { calculateUserStreak } from '@/lib/streak/streak-calculator'

/**
 * GET /api/user/streak
 * Fetches the current daily streak for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const streakData = await calculateUserStreak(userId)

    return NextResponse.json({
      success: true,
      ...streakData
    })
  } catch (error) {
    console.error('❌ [STREAK API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate streak' },
      { status: 500 }
    )
  }
}


