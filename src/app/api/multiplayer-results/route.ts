import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PlayerResult {
  user_id: string
  score: number
  questions_answered: number
  correct_answers: number
  total_time: number
  average_time_per_question: number
}

interface MultiplayerResultsRequest {
  session_id: string
  room_id: string
  player_results: PlayerResult[]
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: MultiplayerResultsRequest = await request.json()
    const { session_id, room_id, player_results } = body

    // Validate required fields
    if (!session_id || !room_id || !player_results || player_results.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, room_id, player_results' },
        { status: 400 }
      )
    }

    console.log('🏆 [MULTIPLAYER RESULTS] Processing results for session:', session_id)

    // Verify the session exists and get quiz details
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(`
        id,
        room_id,
        total_questions,
        time_limit,
        rooms!inner(id, difficulty)
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      console.error('❌ [MULTIPLAYER RESULTS] Session not found:', sessionError)
      return NextResponse.json(
        { error: 'Quiz session not found' },
        { status: 404 }
      )
    }

    // Sort players by score to determine rankings
    const sortedResults = [...player_results].sort((a, b) => b.score - a.score)
    
    // Create rankings (handle ties)
    const rankings = new Map<string, number>()
    let currentRank = 1
    
    for (let i = 0; i < sortedResults.length; i++) {
      const player = sortedResults[i]
      
      // Check if this score is tied with previous players
      if (i > 0 && sortedResults[i-1].score !== player.score) {
        currentRank = i + 1
      }
      
      rankings.set(player.user_id, currentRank)
    }

    console.log('📊 [MULTIPLAYER RESULTS] Rankings determined:', rankings)

    // Get user profiles for display names
    const userIds = player_results.map(p => p.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds)

    if (profilesError) {
      console.error('❌ [MULTIPLAYER RESULTS] Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch user profiles' },
        { status: 500 }
      )
    }

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || [])

    // Process each player's results
    const gameResults = []
    const statsUpdates = []

    for (const playerResult of player_results) {
      const rank = rankings.get(playerResult.user_id) || player_results.length
      const displayName = profileMap.get(playerResult.user_id) || 'Unknown Player'
      
      // Calculate XP using the enhanced system
      const gameResult = {
        room_id: room_id,
        user_id: playerResult.user_id,
        session_id: session_id,
        final_score: playerResult.score,
        questions_answered: playerResult.questions_answered,
        correct_answers: playerResult.correct_answers,
        total_time: playerResult.total_time,
        rank: rank,
        xp_earned: 0, // Will be calculated below
        completed_at: new Date().toISOString()
      }

      // Calculate XP
      const { calculateXP } = await import('@/lib/xp-calculator')
      
      // Get current user stats for streak calculation
      const { data: currentStats } = await supabase
        .from('player_stats')
        .select('win_streak')
        .eq('user_id', playerResult.user_id)
        .single()

      const xpResult = calculateXP({
        correctAnswers: playerResult.correct_answers,
        totalQuestions: playerResult.questions_answered,
        averageTimePerQuestion: playerResult.average_time_per_question,
        difficulty: session.rooms[0]?.difficulty || 'medium',
        winStreak: currentStats?.win_streak || 0,
        isPerfectScore: playerResult.correct_answers === playerResult.questions_answered,
        isMultiplayer: true,
        rank: rank
      })

      gameResult.xp_earned = xpResult.totalXP

      gameResults.push(gameResult)

      console.log(`🎯 [MULTIPLAYER RESULTS] Player ${displayName}: Rank ${rank}, XP ${xpResult.totalXP}`)
    }

    // Insert all game results
    const { data: insertedResults, error: insertError } = await supabase
      .from('game_results')
      .insert(gameResults)
      .select()

    if (insertError) {
      console.error('❌ [MULTIPLAYER RESULTS] Error inserting game results:', insertError)
      return NextResponse.json(
        { error: 'Failed to save game results' },
        { status: 500 }
      )
    }

    console.log('✅ [MULTIPLAYER RESULTS] Game results inserted successfully')

    // Update quiz session status
    const { error: sessionUpdateError } = await supabase
      .from('quiz_sessions')
      .update({ 
        status: 'complete',
        ended_at: new Date().toISOString()
      })
      .eq('id', session_id)

    if (sessionUpdateError) {
      console.error('❌ [MULTIPLAYER RESULTS] Error updating session status:', sessionUpdateError)
    }

    // Update room status
    const { error: roomUpdateError } = await supabase
      .from('game_rooms')
      .update({ 
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', room_id)

    if (roomUpdateError) {
      console.error('❌ [MULTIPLAYER RESULTS] Error updating room status:', roomUpdateError)
    }

    // Prepare response with rankings and XP breakdowns
    const responseResults = player_results.map(player => {
      const rank = rankings.get(player.user_id) || player_results.length
      const displayName = profileMap.get(player.user_id) || 'Unknown Player'
      
      // Find the corresponding inserted result for XP info
      const insertedResult = insertedResults?.find(r => r.user_id === player.user_id)
      
      return {
        user_id: player.user_id,
        display_name: displayName,
        rank: rank,
        score: player.score,
        questions_answered: player.questions_answered,
        correct_answers: player.correct_answers,
        accuracy: player.questions_answered > 0 ? (player.correct_answers / player.questions_answered * 100) : 0,
        total_time: player.total_time,
        xp_earned: insertedResult?.xp_earned || 0
      }
    })

    // Sort by rank for response
    responseResults.sort((a, b) => a.rank - b.rank)

    console.log('🎉 [MULTIPLAYER RESULTS] Results processed successfully')

    return NextResponse.json({
      success: true,
      results: responseResults,
      session_id: session_id,
      room_id: room_id
    })

  } catch (error) {
    console.error('❌ [MULTIPLAYER RESULTS] Error in multiplayer results API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
