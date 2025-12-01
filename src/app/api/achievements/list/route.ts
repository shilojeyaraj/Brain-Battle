import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { getUserAchievements, getAllAchievementDefinitions } from '@/lib/achievements/achievement-checker'
import { ensureAchievementDefinitions } from '@/lib/achievements/initialize-achievements'

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

    // Ensure achievements are initialized (this checks for tables first)
    const initialized = await ensureAchievementDefinitions()
    
    if (!initialized) {
      return NextResponse.json({
        success: false,
        error: 'Achievement tables do not exist',
        message: 'Please run the migration: supabase/migrations/create-achievements-system.sql',
        achievements: [],
        count: 0,
        total: 0,
        migrationRequired: true
      }, { status: 503 }) // Service Unavailable
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
    
    if (allDefinitions.length === 0) {
      console.warn('⚠️ [ACHIEVEMENTS API] No achievement definitions found')
      return NextResponse.json({
        success: true,
        achievements: userAchievements,
        allAchievements: [],
        count: userAchievements.length,
        total: 0,
        message: 'Achievement definitions table is empty. Run the migration to populate it.'
      })
    }

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

    console.log(`✅ [ACHIEVEMENTS API] Returning ${allAchievements.length} achievements (${userAchievements.length} earned)`)

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
      { 
        error: 'Failed to fetch achievements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

