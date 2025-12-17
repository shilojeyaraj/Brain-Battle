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

      const rank = rankings.get(playerResult.user_id) || player_results.length
      const displayName = profileMap.get(playerResult.user_id) || 'Unknown Player'
      const winStreak = statsMap.get(playerResult.user_id) || 0
      
      // Calculate XP using the enhanced system
      const xpResult = calculateXP({
        correctAnswers: playerResult.correct_answers,
        totalQuestions: playerResult.questions_answered,
        averageTimePerQuestion: playerResult.average_time_per_question,
        difficulty: session.rooms[0]?.difficulty || 'medium',
        winStreak: winStreak,
        isPerfectScore: playerResult.correct_answers === playerResult.questions_answered,
        isMultiplayer: true,
        rank: rank
      })

      const gameResult = {
        room_id: room_id,
        user_id: playerResult.user_id,
        session_id: session_id,
        final_score: playerResult.score,
        questions_answered: playerResult.questions_answered,
        correct_answers: playerResult.correct_answers,
        total_time: playerResult.total_time,
        rank: rank,
        xp_earned: xpResult.totalXP,
        completed_at: new Date().toISOString()
      }

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

    // Update player_stats for each player and check achievements
    const { createAdminClient } = await import('@/lib/supabase/server-admin')
    const adminClient = createAdminClient()
    
    for (const playerResult of player_results) {
      // Skip if player was already processed (duplicate)
      if (skippedPlayers.includes(playerResult.user_id)) {
        continue
      }
      
      const rank = rankings.get(playerResult.user_id) || player_results.length
      const isWin = rank === 1 // First place is a win
      const insertedResult = gameResults.find(r => r.user_id === playerResult.user_id)
      const xpEarned = insertedResult?.xp_earned || 0
      
      try {
        // Get current stats
        const { data: currentStats, error: statsGetError } = await adminClient
          .from('player_stats')
          .select('*')
          .eq('user_id', playerResult.user_id)
          .single()
        
        if (statsGetError || !currentStats) {
          console.error(`❌ [MULTIPLAYER RESULTS] Error fetching stats for player ${playerResult.user_id}:`, statsGetError)
          continue
        }
        
        // Calculate new stats
        const newTotalGames = (currentStats.total_games || 0) + 1
        const newTotalWins = isWin ? (currentStats.total_wins || 0) + 1 : (currentStats.total_wins || 0)
        const newTotalLosses = !isWin ? (currentStats.total_losses || 0) + 1 : (currentStats.total_losses || 0)
        const newWinStreak = isWin ? (currentStats.win_streak || 0) + 1 : 0
        const newBestStreak = Math.max(currentStats.best_streak || 0, newWinStreak)
        const newTotalQuestions = (currentStats.total_questions_answered || 0) + playerResult.questions_answered
        const newCorrectAnswers = (currentStats.correct_answers || 0) + playerResult.correct_answers
        const newAccuracy = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : 0
        const newXP = (currentStats.xp || 0) + xpEarned
        const newLevel = Math.floor(newXP / 1000) + 1
        
        // Update player stats
        const { error: statsUpdateError } = await adminClient
          .from('player_stats')
          .update({
            total_games: newTotalGames,
            total_wins: newTotalWins,
            total_losses: newTotalLosses,
            win_streak: newWinStreak,
            best_streak: newBestStreak,
            total_questions_answered: newTotalQuestions,
            correct_answers: newCorrectAnswers,
            accuracy: newAccuracy,
            xp: newXP,
            level: newLevel,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', playerResult.user_id)
        
        if (statsUpdateError) {
          console.error(`❌ [MULTIPLAYER RESULTS] Error updating stats for player ${playerResult.user_id}:`, statsUpdateError)
        } else {
          console.log(`✅ [MULTIPLAYER RESULTS] Updated stats for player ${playerResult.user_id}: +${xpEarned} XP, ${isWin ? 'WIN' : 'LOSS'}`)
        }
        
        // Check and unlock achievements
        try {
          const { checkAndUnlockAchievements, checkCustomAchievements } = await import('@/lib/achievements/achievement-checker')
          
          const isPerfectScore = playerResult.correct_answers === playerResult.questions_answered && playerResult.questions_answered > 0
          
          // Check standard achievements
          const unlockedStandard = await checkAndUnlockAchievements(playerResult.user_id)
          
          // Check custom achievements
          const unlockedCustom = await checkCustomAchievements(playerResult.user_id, {
            isPerfectScore,
            isMultiplayer: true,
            isWin: isWin,
          })
          
          const totalUnlocked = unlockedStandard.length + unlockedCustom.length
          if (totalUnlocked > 0) {
            console.log(`🏆 [MULTIPLAYER RESULTS] Player ${playerResult.user_id} unlocked ${totalUnlocked} achievement(s)`)
          }
        } catch (achievementError) {
          console.error(`❌ [MULTIPLAYER RESULTS] Error checking achievements for player ${playerResult.user_id}:`, achievementError)
        }
        
        // Update daily streak
        try {
          const { calculateUserStreak } = await import('@/lib/streak/streak-calculator')
          await calculateUserStreak(playerResult.user_id)
        } catch (streakError) {
          console.error(`❌ [MULTIPLAYER RESULTS] Error updating streak for player ${playerResult.user_id}:`, streakError)
        }
      } catch (playerError) {
        console.error(`❌ [MULTIPLAYER RESULTS] Error processing player ${playerResult.user_id}:`, playerError)
      }
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
