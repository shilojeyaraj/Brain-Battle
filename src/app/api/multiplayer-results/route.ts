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
    // SECURITY: Get userId from session cookie, not supabase.auth (custom auth doesn't use supabase.auth)
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

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

    // 🚀 OPTIMIZATION: Fetch all player stats at once (fix N+1 query)
    const { data: allPlayerStats, error: statsError } = await supabase
      .from('player_stats')
      .select('user_id, win_streak')
      .in('user_id', userIds)

    if (statsError) {
      console.error('❌ [MULTIPLAYER RESULTS] Error fetching player stats:', statsError)
    }

    const statsMap = new Map(allPlayerStats?.map(s => [s.user_id, s.win_streak]) || [])

    // Import XP calculator once (not in loop)
    const { calculateXP } = await import('@/lib/xp-calculator')

    // 🛡️ XP FARMING PREVENTION: Check for duplicate session completions
    const { data: existingResults, error: duplicateCheckError } = await supabase
      .from('game_results')
      .select('user_id, session_id, xp_earned, completed_at')
      .eq('session_id', session_id)
      .in('user_id', userIds)

    const duplicateMap = new Map<string, any>()
    if (existingResults && existingResults.length > 0) {
      existingResults.forEach((result: any) => {
        duplicateMap.set(result.user_id, result)
      })
    }

    // 🛡️ SECURITY FIX #6: Validate multiplayer results from database answers
    // Fetch all quiz_answers for this session to verify player results
    const { data: allSessionAnswers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('user_id, question_id, is_correct, submitted_at')
      .eq('session_id', session_id)

    if (answersError) {
      console.error('❌ [MULTIPLAYER RESULTS] Error fetching session answers:', answersError)
      return NextResponse.json(
        { error: 'Failed to validate player answers' },
        { status: 500 }
      )
    }

    // Group answers by user_id and calculate actual scores
    const userAnswerMap = new Map<string, { correct: number; total: number; times: number[] }>()
    
    if (allSessionAnswers && allSessionAnswers.length > 0) {
      allSessionAnswers.forEach((answer: any) => {
        const userId = answer.user_id
        if (!userAnswerMap.has(userId)) {
          userAnswerMap.set(userId, { correct: 0, total: 0, times: [] })
        }
        const userStats = userAnswerMap.get(userId)!
        userStats.total++
        if (answer.is_correct) {
          userStats.correct++
        }
        // Calculate time from submitted_at if available
        if (answer.submitted_at) {
          const submitTime = new Date(answer.submitted_at).getTime()
          userStats.times.push(submitTime)
        }
      })
    }

    // Process each player's results
    const gameResults = []
    const statsUpdates = []
    const skippedPlayers: string[] = []

    for (const playerResult of player_results) {
      // Skip if player already completed this session
      if (duplicateMap.has(playerResult.user_id)) {
        const existing = duplicateMap.get(playerResult.user_id)
        console.log(`⚠️ [MULTIPLAYER RESULTS] Player ${playerResult.user_id} already completed session ${session_id} - skipping XP`, {
          previousCompletion: existing.completed_at
        })
        skippedPlayers.push(playerResult.user_id)
        continue
      }

      // 🛡️ SECURITY: Use database-calculated values instead of client-provided values
      const dbStats = userAnswerMap.get(playerResult.user_id)
      const verifiedCorrectAnswers = dbStats?.correct ?? 0
      const verifiedTotalQuestions = dbStats?.total ?? 0
      const verifiedScore = verifiedTotalQuestions > 0 ? (verifiedCorrectAnswers / verifiedTotalQuestions) : 0
      
      // Calculate average time from database timestamps
      const dbTimes = dbStats?.times || []
      let verifiedAverageTime = playerResult.average_time_per_question
      if (dbTimes.length > 1) {
        const timeDiffs = []
        for (let i = 1; i < dbTimes.length; i++) {
          timeDiffs.push((dbTimes[i] - dbTimes[i-1]) / 1000) // Convert to seconds
        }
        if (timeDiffs.length > 0) {
          verifiedAverageTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length
        }
      }

      // Validate that client-provided values match database (with tolerance for rounding)
      const scoreDiff = Math.abs(verifiedScore - playerResult.score)
      const answersDiff = Math.abs(verifiedCorrectAnswers - playerResult.correct_answers)
      
      if (scoreDiff > 0.1 || answersDiff > 0) {
        console.warn(`⚠️ [MULTIPLAYER RESULTS] Score mismatch for player ${playerResult.user_id}:`, {
          client: { score: playerResult.score, correct: playerResult.correct_answers },
          database: { score: verifiedScore, correct: verifiedCorrectAnswers }
        })
        // Use database values but log warning
      }

      const rank = rankings.get(playerResult.user_id) || player_results.length
      const displayName = profileMap.get(playerResult.user_id) || 'Unknown Player'
      const winStreak = statsMap.get(playerResult.user_id) || 0
      
      // Calculate XP using verified values from database
      const xpResult = calculateXP({
        correctAnswers: verifiedCorrectAnswers,
        totalQuestions: verifiedTotalQuestions,
        averageTimePerQuestion: verifiedAverageTime,
        difficulty: session.rooms[0]?.difficulty || 'medium',
        winStreak: winStreak,
        isPerfectScore: verifiedCorrectAnswers === verifiedTotalQuestions && verifiedTotalQuestions > 0,
        isMultiplayer: true,
        rank: rank
      })

      const gameResult = {
        room_id: room_id,
        user_id: playerResult.user_id,
        session_id: session_id,
        final_score: verifiedScore, // Use verified score
        questions_answered: verifiedTotalQuestions, // Use verified count
        correct_answers: verifiedCorrectAnswers, // Use verified count
        total_time: playerResult.total_time, // Keep client time for now (could validate from timestamps)
        rank: rank,
        xp_earned: xpResult.totalXP,
        completed_at: new Date().toISOString()
      }

      gameResults.push(gameResult)

      console.log(`🎯 [MULTIPLAYER RESULTS] Player ${displayName}: Rank ${rank}, XP ${xpResult.totalXP} (verified: ${verifiedCorrectAnswers}/${verifiedTotalQuestions})`)
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
    if (skippedPlayers.length > 0) {
      console.log(`⚠️ [MULTIPLAYER RESULTS] Skipped ${skippedPlayers.length} players due to duplicate session completion`)
    }

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
      
      // Check if player was skipped due to duplicate
      const wasSkipped = skippedPlayers.includes(player.user_id)
      if (wasSkipped) {
        const existing = duplicateMap.get(player.user_id)
        return {
          user_id: player.user_id,
          display_name: displayName,
          rank: rank,
          score: player.score,
          questions_answered: player.questions_answered,
          correct_answers: player.correct_answers,
          accuracy: player.questions_answered > 0 ? (player.correct_answers / player.questions_answered * 100) : 0,
          total_time: player.total_time,
          xp_earned: 0,
          message: "You've already completed this quiz session. No XP awarded for repeats."
        }
      }
      
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
