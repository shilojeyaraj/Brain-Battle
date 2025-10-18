import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    console.log('📊 [USER STATS] Fetching stats for user:', userId)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('❌ [USER STATS] Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // Get player stats
    const { data: stats, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (statsError) {
      console.error('❌ [USER STATS] Error fetching player stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch player stats' },
        { status: 500 }
      )
    }

    // Get recent game results
    const { data: recentGames, error: gamesError } = await supabase
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
        quiz_sessions!inner(
          id,
          session_name
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(10)

    if (gamesError) {
      console.error('❌ [USER STATS] Error fetching recent games:', gamesError)
      // Don't fail the request if recent games can't be fetched
    }

    // Get achievements/badges (if any)
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (achievementsError) {
      console.error('❌ [USER STATS] Error fetching achievements:', achievementsError)
      // Don't fail the request if achievements can't be fetched
    }

    console.log('✅ [USER STATS] Stats fetched successfully')

    return NextResponse.json({
      success: true,
      profile: {
        user_id: profile.user_id,
        display_name: profile.display_name,
        username: profile.username,
        email: profile.email,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at
      },
      stats: {
        level: stats.level,
        xp: stats.xp,
        total_games: stats.total_games,
        total_wins: stats.total_wins,
        win_streak: stats.win_streak,
        best_streak: stats.best_streak,
        total_questions_answered: stats.total_questions_answered,
        correct_answers: stats.correct_answers,
        accuracy: stats.accuracy,
        updated_at: stats.updated_at
      },
      recentGames: recentGames || [],
      achievements: achievements || []
    })

  } catch (error) {
    console.error('❌ [USER STATS] Error in user stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
