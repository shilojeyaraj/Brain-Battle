import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { checkAndUnlockAchievements } from '@/lib/achievements/achievement-checker'

/**
 * GET /api/achievements/diagnose
 * Diagnostic endpoint to verify achievements system is working
 * Returns information about achievement definitions, user stats, and test results
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

    const adminClient = createAdminClient()
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      userId,
      checks: {}
    }

    // 1. Check if achievement_definitions table has data
    const { data: definitions, error: defError } = await adminClient
      .from('achievement_definitions')
      .select('code, name, category, requirement_type, requirement_value, is_active')
      .eq('is_active', true)

    if (defError) {
      diagnostics.checks.definitions = {
        status: 'error',
        error: defError.message,
        count: 0
      }
    } else {
      diagnostics.checks.definitions = {
        status: 'ok',
        count: definitions?.length || 0,
        sample: definitions?.slice(0, 5) || []
      }
    }

    // 2. Check user's current stats
    const { data: stats, error: statsError } = await adminClient
      .from('player_stats')
      .select('total_games, total_wins, total_questions_answered, level, accuracy, win_streak, daily_streak')
      .eq('user_id', userId)
      .single()

    if (statsError || !stats) {
      diagnostics.checks.stats = {
        status: 'error',
        error: statsError?.message || 'No stats found',
        exists: false
      }
    } else {
      diagnostics.checks.stats = {
        status: 'ok',
        exists: true,
        data: {
          total_games: stats.total_games || 0,
          total_wins: stats.total_wins || 0,
          total_questions_answered: stats.total_questions_answered || 0,
          level: stats.level || 1,
          accuracy: stats.accuracy || 0,
          win_streak: stats.win_streak || 0,
          daily_streak: stats.daily_streak || 0
        }
      }
    }

    // 3. Check user's current achievements
    const { data: userAchievements, error: achievementsError } = await adminClient
      .from('achievements')
      .select('achievement_code, earned_at, xp_earned')
      .eq('user_id', userId)

    if (achievementsError) {
      diagnostics.checks.userAchievements = {
        status: 'error',
        error: achievementsError.message,
        count: 0
      }
    } else {
      diagnostics.checks.userAchievements = {
        status: 'ok',
        count: userAchievements?.length || 0,
        achievements: userAchievements || []
      }
    }

    // 4. Test the achievement checking function
    try {
      const unlocked = await checkAndUnlockAchievements(userId)
      diagnostics.checks.achievementFunction = {
        status: 'ok',
        works: true,
        newlyUnlocked: unlocked.length,
        unlocked: unlocked
      }
    } catch (error: any) {
      diagnostics.checks.achievementFunction = {
        status: 'error',
        works: false,
        error: error.message
      }
    }

    // 5. Check which achievements user qualifies for (without unlocking)
    if (definitions && stats) {
      const qualifying: any[] = []
      const notQualifying: any[] = []

      for (const def of definitions) {
        let qualifies = false
        let reason = ''

        switch (def.requirement_type) {
          case 'win_count':
            const winCount = (def.requirement_value as any)?.count || 0
            qualifies = (stats.total_wins || 0) >= winCount
            reason = `Wins: ${stats.total_wins || 0} / ${winCount}`
            break
          case 'sessions_completed':
            const sessionCount = (def.requirement_value as any)?.count || 0
            qualifies = (stats.total_games || 0) >= sessionCount
            reason = `Games: ${stats.total_games || 0} / ${sessionCount}`
            break
          case 'questions_answered':
            const questionCount = (def.requirement_value as any)?.count || 0
            qualifies = (stats.total_questions_answered || 0) >= questionCount
            reason = `Questions: ${stats.total_questions_answered || 0} / ${questionCount}`
            break
          case 'level_reached':
            const levelReq = (def.requirement_value as any)?.level || 0
            qualifies = (stats.level || 1) >= levelReq
            reason = `Level: ${stats.level || 1} / ${levelReq}`
            break
          case 'accuracy_threshold':
            const accuracyReq = (def.requirement_value as any)?.threshold || 0
            qualifies = (stats.accuracy || 0) >= accuracyReq
            reason = `Accuracy: ${stats.accuracy || 0}% / ${accuracyReq}%`
            break
          case 'win_streak':
            const streakReq = (def.requirement_value as any)?.count || 0
            qualifies = (stats.win_streak || 0) >= streakReq
            reason = `Win Streak: ${stats.win_streak || 0} / ${streakReq}`
            break
          case 'daily_streak':
            const dailyStreakReq = (def.requirement_value as any)?.days || 0
            qualifies = (stats.daily_streak || 0) >= dailyStreakReq
            reason = `Daily Streak: ${stats.daily_streak || 0} / ${dailyStreakReq}`
            break
          default:
            reason = `Custom achievement (handled in application code)`
        }

        const achievementInfo = {
          code: def.code,
          name: def.name,
          category: def.category,
          requirement_type: def.requirement_type,
          reason
        }

        // Check if user already has this achievement
        const alreadyHas = userAchievements?.some(a => a.achievement_code === def.code)
        
        if (alreadyHas) {
          // Skip - already earned
        } else if (qualifies) {
          qualifying.push(achievementInfo)
        } else {
          notQualifying.push(achievementInfo)
        }
      }

      diagnostics.checks.qualification = {
        status: 'ok',
        qualifying: qualifying.length,
        notQualifying: notQualifying.length,
        qualifyingList: qualifying.slice(0, 10), // Show first 10
        closestAchievements: notQualifying.slice(0, 5) // Show 5 closest
      }
    }

    // Summary
    diagnostics.summary = {
      definitionsExist: (diagnostics.checks.definitions.count || 0) > 0,
      statsExist: diagnostics.checks.stats.exists === true,
      achievementFunctionWorks: diagnostics.checks.achievementFunction?.works === true,
      userHasAchievements: (diagnostics.checks.userAchievements.count || 0) > 0,
      qualifiesForAchievements: (diagnostics.checks.qualification?.qualifying || 0) > 0
    }

    return NextResponse.json({
      success: true,
      diagnostics
    })
  } catch (error: any) {
    console.error('❌ [ACHIEVEMENTS DIAGNOSE] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to diagnose achievements system',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

