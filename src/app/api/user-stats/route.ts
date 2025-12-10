import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'

export async function GET(request: NextRequest) {
  try {
    // Get userId from secure session cookie instead of query parameter
    const userId = await getUserIdFromRequest(request)
    
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('❌ [USER STATS] No authenticated session found')
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Ensure userId is a string (not a Promise or object)
    const userIdString = String(userId).trim()
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userIdString)) {
      console.error('❌ [USER STATS] Invalid userId format:', userIdString)
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Use admin client to bypass RLS for reading stats
    // Custom auth doesn't set auth.uid(), so we need admin client
    const supabase = createAdminClient()

    console.log('📊 [USER STATS] Fetching stats for user:', userIdString)

    // 🚀 OPTIMIZATION: Parallelize all database queries for 60-70% faster response
    const [
      { data: profile, error: profileError },
      { data: stats, error: statsError },
      { data: recentGames, error: gamesError },
      { data: achievements, error: achievementsError }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username, email, avatar_url, created_at')
        .eq('user_id', userIdString)
        .single(),
      supabase
        .from('player_stats')
        .select('level, xp, total_games, total_wins, win_streak, best_streak, total_questions_answered, correct_answers, accuracy, daily_streak, longest_streak, last_activity_date, updated_at')
        .eq('user_id', userIdString)
        .single(),
      supabase
        .from('game_results')
        .select(`
          id,
          final_score,
          questions_answered,
          correct_answers,
          total_time,
          rank,
          xp_earned,
          completed_at,
          session_id,
          quiz_sessions!left(
            id,
            session_name,
            room_id
          )
        `)
        .eq('user_id', userIdString)
        .order('completed_at', { ascending: false })
        .limit(10),
      supabase
        .from('achievements')
        .select(`
          *,
          achievement_definitions (
            name,
            description,
            icon,
            category,
            rarity
          )
        `)
        .eq('user_id', userIdString)
        .order('earned_at', { ascending: false })
    ])

    // Check for critical errors (profile and stats are required)
    if (profileError) {
      console.error('❌ [USER STATS] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    if (statsError) {
      console.error('❌ [USER STATS] Error fetching player stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch player stats' },
        { status: 500 }
      )
    }

    // Log non-critical errors but don't fail the request
    if (gamesError) {
      console.error('❌ [USER STATS] Error fetching recent games:', gamesError)
    }

    if (achievementsError) {
      console.error('❌ [USER STATS] Error fetching achievements:', achievementsError)
    }

    console.log('✅ [USER STATS] Stats fetched successfully')

    // Transform achievements to include definition data
    const formattedAchievements = (achievements || []).map((achievement: any) => ({
      id: achievement.id,
      code: achievement.achievement_code,
      name: achievement.achievement_definitions?.name || achievement.achievement_code,
      description: achievement.achievement_definitions?.description || '',
      icon: achievement.achievement_definitions?.icon || 'trophy',
      category: achievement.achievement_definitions?.category || 'special',
      rarity: achievement.achievement_definitions?.rarity || 'common',
      earned_at: achievement.earned_at,
      xp_earned: achievement.xp_earned,
      progress: achievement.progress || {},
    }))

    // Transform recent games to match expected format
    // Filter out games without quiz_sessions (shouldn't happen, but handle gracefully)
    const formattedRecentGames = (recentGames || [])
      .filter((game: any) => {
        // Only include games that have a valid quiz session or at least have the required fields
        if (!game.quiz_sessions && !game.session_id) {
          console.warn('⚠️ [USER STATS] Game result missing quiz session:', game.id)
          return false
        }
        return true
      })
      .map((game: any) => {
        const isSingleplayer = !game.quiz_sessions?.room_id
        const baseName = game.quiz_sessions?.session_name || `Battle ${game.id.substring(0, 8)}`
        return {
          id: game.id,
          session_id: game.session_id || game.quiz_sessions?.id,
          name: baseName,
          subject: isSingleplayer
            ? baseName.replace('Singleplayer: ', '')
            : baseName,
          result: isSingleplayer
            ? "Practice"
            : game.correct_answers >= game.questions_answered * 0.6
            ? "Won"
            : "Lost",
          score: `${game.correct_answers}/${game.questions_answered}`,
          duration: `${Math.round(game.total_time || 0)}s`,
          players: isSingleplayer ? "1" : "Multiplayer",
          date: new Date(game.completed_at).toLocaleDateString(),
          xpEarned: game.xp_earned || 0,
          percentage: Math.round((game.correct_answers / game.questions_answered) * 100)
        }
      })

    // 🚀 OPTIMIZATION: Return data directly (already filtered by select())
    // 🚀 OPTIMIZATION: Reduced cache time to 0 for immediate updates after quiz completion
    return NextResponse.json({
      success: true,
      profile,
      stats,
      recentGames: formattedRecentGames,
      achievements: formattedAchievements
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private', // No cache - always fresh data
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('❌ [USER STATS] Error in user stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
