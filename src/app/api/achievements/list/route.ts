import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { getUserAchievements, getAllAchievementDefinitions } from '@/lib/achievements/achievement-checker'

/**
 * GET /api/achievements/list
 * Gets all achievements for the authenticated user
 * Optionally includes all available achievements with progress
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

    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('includeAll') === 'true'

    // Get user's earned achievements
    const userAchievements = await getUserAchievements(userId)

    if (!includeAll) {
      return NextResponse.json({
        success: true,
        achievements: userAchievements,
        count: userAchievements.length,
      })
    }

    // Get all available achievements and merge with user's progress
    const allDefinitions = await getAllAchievementDefinitions()
    const earnedCodes = new Set(userAchievements.map(a => a.achievement_code))

    const allAchievements = allDefinitions.map(def => {
      const earned = userAchievements.find(a => a.achievement_code === def.code)
      return {
        ...def,
        earned: !!earned,
        earned_at: earned?.earned_at || null,
        progress: earned?.progress || {},
      }
    })

    return NextResponse.json({
      success: true,
      achievements: userAchievements,
      allAchievements,
      count: userAchievements.length,
      total: allDefinitions.length,
    })
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

