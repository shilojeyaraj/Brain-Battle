import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { checkAndUnlockAchievements, checkCustomAchievements } from '@/lib/achievements/achievement-checker'

/**
 * POST /api/achievements/check
 * Checks and unlocks achievements for the authenticated user
 * Can optionally pass context for custom achievements
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse optional context for custom achievements
    let context: {
      isPerfectScore?: boolean
      answerTime?: number
      isMultiplayer?: boolean
      isWin?: boolean
    } = {}

    try {
      const body = await request.json()
      context = {
        isPerfectScore: body.isPerfectScore,
        answerTime: body.answerTime,
        isMultiplayer: body.isMultiplayer,
        isWin: body.isWin,
      }
    } catch {
      // No body provided, that's fine
    }

    // Check standard achievements (based on stats)
    const unlockedStandard = await checkAndUnlockAchievements(userId)

    // Check custom achievements (require context)
    const unlockedCustom = await checkCustomAchievements(userId, context)

    const allUnlocked = [...unlockedStandard, ...unlockedCustom]

    return NextResponse.json({
      success: true,
      unlocked: allUnlocked,
      count: allUnlocked.length,
    })
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    )
  }
}

