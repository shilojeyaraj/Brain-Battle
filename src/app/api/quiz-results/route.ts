import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { sanitizeError, sanitizeDatabaseError, createSafeErrorResponse } from "@/lib/utils/error-sanitizer"

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from session cookie, not request body
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient() // Use admin client for inserts to bypass RLS
    
    const body = await request.json()
    const { 
      sessionId, // Optional: if provided, use it; otherwise generate new
      topic, 
      score, 
      totalQuestions, 
      correctAnswers, 
      duration, 
      questions, 
      answers 
    } = body
    // userId is now from session, not body

    console.log("🎯 [QUIZ RESULTS] Saving quiz results:", {
      userId,
      topic,
      score,
      totalQuestions,
      correctAnswers,
      duration
    })

    // 🚀 OPTIMIZATION: Create session and insert questions in one go
    // Use admin client to bypass RLS for inserts
    // If sessionId is provided, try to use it; otherwise create new session
    let sessionData
    if (sessionId) {
      // Check if session already exists
      const { data: existingSession, error: checkError } = await adminClient
        .from('quiz_sessions')
        .select('id')
        .eq('id', sessionId)
        .single()
      
      if (existingSession) {
        // First, get the current session to check room_id
        const { data: currentSession, error: fetchError } = await adminClient
          .from('quiz_sessions')
          .select('id, room_id')
          .eq('id', sessionId)
          .single()
        
        // Update existing session
        const { data: updatedSession, error: updateError } = await adminClient
          .from('quiz_sessions')
          .update({
            session_name: `Singleplayer: ${topic}`,
            total_questions: totalQuestions,
            time_limit: 30,
            started_at: new Date(Date.now() - duration * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            is_active: false,
            room_id: null // Ensure it's explicitly null for singleplayer
          })
          .eq('id', sessionId)
          .select('id, room_id, session_name, total_questions, started_at, ended_at, is_active')
          .single()
        
        if (updateError) {
          console.error("❌ [QUIZ RESULTS] Error updating quiz session:", updateError)
          return NextResponse.json({ error: "Failed to update quiz session" }, { status: 500 })
        }
        sessionData = updatedSession
      } else {
        // Create new session with provided ID (if valid UUID)
        const { data: newSession, error: createError } = await adminClient
          .from('quiz_sessions')
          .insert({
            id: sessionId,
            session_name: `Singleplayer: ${topic}`,
            total_questions: totalQuestions,
            time_limit: 30,
            started_at: new Date(Date.now() - duration * 1000).toISOString(),
            ended_at: new Date().toISOString(),
            is_active: false,
            room_id: null
          })
          .select('id, room_id, session_name, total_questions, started_at, ended_at, is_active')
          .single()
        
        if (createError) {
          console.error("❌ [QUIZ RESULTS] Error creating quiz session with provided ID:", createError)
          // Fall through to create new session without ID
          const { data: fallbackSession, error: fallbackError } = await adminClient
            .from('quiz_sessions')
            .insert({
              session_name: `Singleplayer: ${topic}`,
              total_questions: totalQuestions,
              time_limit: 30,
              started_at: new Date(Date.now() - duration * 1000).toISOString(),
              ended_at: new Date().toISOString(),
              is_active: false,
              room_id: null
            })
            .select('id, room_id, session_name, total_questions, started_at, ended_at, is_active')
            .single()
          
          if (fallbackError) {
            console.error("❌ [QUIZ RESULTS] Error creating fallback quiz session:", fallbackError)
            return NextResponse.json({ error: "Failed to create quiz session" }, { status: 500 })
          }
          sessionData = fallbackSession
        } else {
          sessionData = newSession
        }
      }
    } else {
      // Create new session without provided ID
      const { data: newSession, error: sessionError } = await adminClient
        .from('quiz_sessions')
        .insert({
          session_name: `Singleplayer: ${topic}`,
          total_questions: totalQuestions,
          time_limit: 30,
          started_at: new Date(Date.now() - duration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          is_active: false,
          room_id: null
        })
        .select('id, room_id, session_name, total_questions, started_at, ended_at, is_active')
        .single()
      
      if (sessionError) {
        console.error("❌ [QUIZ RESULTS] Error creating quiz session:", sessionError)
        return NextResponse.json({ error: "Failed to create quiz session" }, { status: 500 })
      }
      sessionData = newSession
    }

    if (!sessionData) {
      console.error("❌ [QUIZ RESULTS] Failed to create or retrieve quiz session")
      return NextResponse.json({ error: "Failed to create quiz session" }, { status: 500 })
    }

    console.log("✅ [QUIZ RESULTS] Created/retrieved quiz session:", sessionData.id)

    // 🚀 OPTIMIZATION: Insert questions and get IDs back in one operation
    const questionsToInsert = questions.map((q: any, index: number) => {
      // Determine correct answer based on question type
      let correctAnswer: string | null = null
      
      if (q.type === 'multiple_choice' && q.options) {
        // For multiple choice, get the correct option
        const correctIndex = q.correct !== undefined ? q.correct : 0
        correctAnswer = q.options[correctIndex] || q.options[0] || null
      } else if (q.type === 'open_ended') {
        // For open-ended, use the first expected answer or the answer field
        correctAnswer = q.expected_answers && q.expected_answers.length > 0 
          ? q.expected_answers[0] 
          : q.answer || q.a || null
      } else {
        // Fallback: use answer field or first option
        correctAnswer = q.answer || q.a || (q.options && q.options[0]) || null
      }
      
      // Ensure we have a valid correct answer
      if (!correctAnswer) {
        console.warn(`⚠️ [QUIZ RESULTS] Question ${index} has no valid correct answer, using placeholder`)
        correctAnswer = 'N/A'
      }
      
      // Map question type to database enum values
      // Database enum: 'multiple_choice', 'true_false', 'fill_blank'
      // Map 'open_ended' to 'fill_blank' as it's the closest match
      let questionType: 'multiple_choice' | 'true_false' | 'fill_blank' = 'multiple_choice'
      if (q.type === 'open_ended') {
        questionType = 'fill_blank'
      } else if (q.type === 'true_false') {
        questionType = 'true_false'
      } else if (q.type === 'multiple_choice') {
        questionType = 'multiple_choice'
      }
      
      return {
        session_id: sessionData.id,
        question_text: q.question || q.q,
        question_type: questionType,
        correct_answer: correctAnswer,
        options: q.options || (q.a ? [q.a] : []),
        explanation: q.explanation || q.answer || q.a || '',
        difficulty: q.difficulty || 'medium',
        points: 10,
        time_limit: 30,
        order_index: index
      }
    })

    const { data: insertedQuestions, error: questionsError } = await adminClient
      .from('questions')
      .insert(questionsToInsert)
      .select('id, order_index')
      .order('order_index')

    if (questionsError || !insertedQuestions) {
      console.error("❌ [QUIZ RESULTS] Error inserting questions:", questionsError)
      return NextResponse.json({ error: "Failed to insert questions" }, { status: 500 })
    }

    console.log("✅ [QUIZ RESULTS] Inserted questions with IDs")

    // 4. Insert player answers
    const answersToInsert = answers.map((answer: any, index: number) => {
      const question = insertedQuestions.find(q => q.order_index === index)
      const questionData = questions[index]
      const isCorrect = answer.selectedIndex === (questionData.correct !== undefined ? questionData.correct : 0)
      
      return {
        question_id: question?.id,
        user_id: userId,
        room_id: null, // Singleplayer doesn't have a room
        answer_text: questionData.options ? questionData.options[answer.selectedIndex] : answer.selectedAnswer,
        is_correct: isCorrect,
        response_time: answer.responseTime || 30,
        points_earned: isCorrect ? 10 : 0,
        answered_at: new Date(Date.now() - (totalQuestions - index) * 30 * 1000).toISOString()
      }
    })

    const { error: answersError } = await adminClient
      .from('player_answers')
      .insert(answersToInsert)

    if (answersError) {
      console.error("❌ [QUIZ RESULTS] Error inserting answers:", answersError)
      return NextResponse.json({ error: "Failed to insert answers" }, { status: 500 })
    }

    console.log("✅ [QUIZ RESULTS] Inserted player answers")

    // 5. Create game result record
    // Calculate XP: base XP per question (10) + bonus for accuracy
    // Base: 10 XP per correct answer
    // Bonus: up to 50 XP for perfect score
    const baseXP = correctAnswers * 10
    const accuracyBonus = correctAnswers === totalQuestions ? 50 : Math.round((correctAnswers / totalQuestions) * 30)
    const xpEarned = baseXP + accuracyBonus
    const { data: gameResult, error: gameResultError } = await adminClient
      .from('game_results')
      .insert({
        room_id: null, // Singleplayer
        user_id: userId,
        session_id: sessionData.id,
        final_score: score,
        questions_answered: totalQuestions,
        correct_answers: correctAnswers,
        total_time: duration,
        rank: 1, // Singleplayer is always rank 1
        xp_earned: xpEarned,
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (gameResultError) {
      console.error("❌ [QUIZ RESULTS] Error creating game result:", gameResultError)
      return NextResponse.json({ error: "Failed to create game result" }, { status: 500 })
    }

    console.log("✅ [QUIZ RESULTS] Created game result:", gameResult.id)

    // 6. Get current player stats (use admin client to bypass RLS)
    const { data: currentStats, error: statsFetchError } = await adminClient
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (statsFetchError || !currentStats) {
      console.error("❌ [QUIZ RESULTS] Error fetching current stats:", statsFetchError)
      // Try to create stats if they don't exist
      // IMPORTANT: Check if this is singleplayer before creating stats
      const isSingleplayerForNewStats = sessionData?.room_id === null || sessionData?.room_id === undefined
      
      if (statsFetchError?.code === 'PGRST116' || !currentStats) {
        console.log("📝 [QUIZ RESULTS] Creating initial player stats for user:", userId, "isSingleplayer:", isSingleplayerForNewStats)
        const { data: newStats, error: createError } = await adminClient
          .from('player_stats')
          .insert({
            user_id: userId,
            level: 1,
            xp: xpEarned,
            total_games: isSingleplayerForNewStats ? 0 : 1,
            total_wins: isSingleplayerForNewStats ? 0 : 1,
            total_losses: 0,
            win_streak: isSingleplayerForNewStats ? 0 : 1,
            best_streak: isSingleplayerForNewStats ? 0 : 1,
            total_questions_answered: totalQuestions,
            correct_answers: correctAnswers,
            accuracy: (correctAnswers / totalQuestions) * 100,
            average_response_time: duration / totalQuestions,
            favorite_subject: topic,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (createError) {
          console.error("❌ [QUIZ RESULTS] Error creating player stats:", createError)
          return NextResponse.json({ error: "Failed to create player stats" }, { status: 500 })
        }
        
        console.log("✅ [QUIZ RESULTS] Created initial player stats")
        return NextResponse.json({ 
          success: true, 
          sessionId: sessionData.id,
          gameResultId: gameResult.id,
          xpEarned,
          oldXP: 0,
          newXP: xpEarned
        })
      }
      return NextResponse.json({ error: "Failed to fetch current stats" }, { status: 500 })
    }

    // 7. Update player stats manually (ensure it works even if trigger doesn't exist)
    // IMPORTANT: Singleplayer battles (room_id IS NULL or undefined) should NOT count as wins/games
    // Determine if this is singleplayer (sessionData is already set)
    const isSingleplayer = !sessionData.room_id || sessionData.room_id === null || sessionData.room_id === undefined
    
    // Debug log to verify singleplayer detection
    console.log("🎮 [QUIZ RESULTS] Session type check:", {
      sessionId: sessionData.id,
      room_id: sessionData.room_id,
      room_id_type: typeof sessionData.room_id,
      isSingleplayer: isSingleplayer,
      sessionName: sessionData.session_name
    })
    
    // Only update games/wins for multiplayer battles
    const newTotalGames = isSingleplayer 
      ? (currentStats.total_games || 0) 
      : (currentStats.total_games || 0) + 1
    const newTotalWins = isSingleplayer
      ? (currentStats.total_wins || 0)
      : (currentStats.total_wins || 0) + 1 // Only multiplayer wins count
    const newWinStreak = isSingleplayer
      ? (currentStats.win_streak || 0) // Don't update streak for singleplayer
      : (currentStats.win_streak || 0) + 1
    const newBestStreak = Math.max(currentStats.best_streak || 0, newWinStreak)
    const newTotalQuestions = (currentStats.total_questions_answered || 0) + totalQuestions
    const newCorrectAnswers = (currentStats.correct_answers || 0) + correctAnswers
    const newAccuracy = (newCorrectAnswers / newTotalQuestions) * 100
    const newXP = (currentStats.xp || 0) + xpEarned
    const newLevel = Math.floor(newXP / 1000) + 1

    console.log("📊 [QUIZ RESULTS] Updating stats:", {
      userId,
      isSingleplayer,
      oldGames: currentStats.total_games,
      newGames: newTotalGames,
      oldXP: currentStats.xp,
      newXP: newXP,
      xpEarned
    })

    const { data: updatedStats, error: statsError } = await adminClient
      .from('player_stats')
      .update({
        total_games: newTotalGames,
        total_wins: newTotalWins,
        win_streak: newWinStreak,
        best_streak: newBestStreak,
        total_questions_answered: newTotalQuestions,
        correct_answers: newCorrectAnswers,
        accuracy: newAccuracy,
        xp: newXP,
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (statsError) {
      console.error("❌ [QUIZ RESULTS] Error updating player stats:", statsError)
      console.error("❌ [QUIZ RESULTS] Stats error details:", JSON.stringify(statsError, null, 2))
      // Don't fail the request if stats update fails, but log it
    } else {
      console.log("✅ [QUIZ RESULTS] Updated player stats successfully:", {
        total_games: updatedStats?.total_games,
        total_wins: updatedStats?.total_wins,
        xp: updatedStats?.xp,
        level: updatedStats?.level
      })
    }

    return NextResponse.json({ 
      success: true, 
      sessionId: sessionData.id,
      gameResultId: gameResult.id,
      xpEarned,
      oldXP: currentStats.xp || 0,
      newXP: newXP
    })

  } catch (error) {
    console.error("❌ [QUIZ RESULTS] Error saving quiz results:", error)
    // SECURITY: Sanitize error message
    const sanitized = sanitizeError(error, 'Failed to save quiz results')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to save quiz results'),
      { status: sanitized.statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("📊 [QUIZ RESULTS] Fetching recent battles for user:", userId)

    // Get recent game results for the user
    const { data: gameResults, error } = await supabase
      .from('game_results')
      .select(`
        id,
        final_score,
        questions_answered,
        correct_answers,
        total_time,
        xp_earned,
        completed_at,
        quiz_sessions!inner(
          session_name,
          total_questions
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error("❌ [QUIZ RESULTS] Error fetching game results:", error)
      return NextResponse.json({ error: "Failed to fetch game results" }, { status: 500 })
    }

    // Transform the data to match the expected format
    const recentBattles = gameResults.map((result: any) => {
      const baseName = result.quiz_sessions.session_name
      const isSingleplayer = true // This endpoint is used for singleplayer summaries
      return {
        id: result.id,
        name: baseName,
        subject: baseName.replace('Singleplayer: ', ''),
        result: isSingleplayer
          ? "Practice"
          : result.correct_answers >= result.questions_answered * 0.6
          ? "Won"
          : "Lost",
        score: `${result.correct_answers}/${result.questions_answered}`,
        duration: `${Math.round(result.total_time)}s`,
        players: "1", // Singleplayer
        date: new Date(result.completed_at).toLocaleDateString(),
        xpEarned: result.xp_earned,
        percentage: Math.round((result.correct_answers / result.questions_answered) * 100)
      }
    })

    console.log("✅ [QUIZ RESULTS] Fetched recent battles:", recentBattles.length)

    return NextResponse.json({ recentBattles })

  } catch (error) {
    console.error("❌ [QUIZ RESULTS] Error fetching recent battles:", error)
    // SECURITY: Sanitize error message
    const sanitized = sanitizeError(error, 'Failed to fetch recent battles')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to fetch recent battles'),
      { status: sanitized.statusCode }
    )
  }
}
