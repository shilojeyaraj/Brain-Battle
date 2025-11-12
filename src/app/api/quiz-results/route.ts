import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient() // Use admin client for inserts to bypass RLS
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      userId, 
      topic, 
      score, 
      totalQuestions, 
      correctAnswers, 
      duration, 
      questions, 
      answers 
    } = body

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
    const { data: sessionData, error: sessionError } = await adminClient
      .from('quiz_sessions')
      .insert({
        session_name: `Singleplayer: ${topic}`,
        total_questions: totalQuestions,
        time_limit: 30,
        started_at: new Date(Date.now() - duration * 1000).toISOString(),
        ended_at: new Date().toISOString(),
        is_active: false,
        room_id: null // Singleplayer
      })
      .select()
      .single()

    if (sessionError) {
      console.error("❌ [QUIZ RESULTS] Error creating quiz session:", sessionError)
      return NextResponse.json({ error: "Failed to create quiz session" }, { status: 500 })
    }

    console.log("✅ [QUIZ RESULTS] Created quiz session:", sessionData.id)

    // 🚀 OPTIMIZATION: Insert questions and get IDs back in one operation
    const questionsToInsert = questions.map((q: any, index: number) => ({
      session_id: sessionData.id,
      question_text: q.question || q.q,
      question_type: 'multiple_choice',
      correct_answer: q.options ? q.options[q.correct] : q.a,
      options: q.options || [q.a],
      explanation: q.explanation || q.a,
      difficulty: 'medium',
      points: 10,
      time_limit: 30,
      order_index: index
    }))

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
    const xpEarned = Math.round((correctAnswers / totalQuestions) * 100) // XP based on percentage
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
      if (statsFetchError?.code === 'PGRST116' || !currentStats) {
        console.log("📝 [QUIZ RESULTS] Creating initial player stats for user:", userId)
        const { data: newStats, error: createError } = await adminClient
          .from('player_stats')
          .insert({
            user_id: userId,
            level: 1,
            xp: xpEarned,
            total_games: 1,
            total_wins: 1,
            total_losses: 0,
            win_streak: 1,
            best_streak: 1,
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
    const newTotalGames = (currentStats.total_games || 0) + 1
    const newTotalWins = (currentStats.total_wins || 0) + 1 // Singleplayer completion counts as a win
    const newWinStreak = (currentStats.win_streak || 0) + 1
    const newBestStreak = Math.max(currentStats.best_streak || 0, newWinStreak)
    const newTotalQuestions = (currentStats.total_questions_answered || 0) + totalQuestions
    const newCorrectAnswers = (currentStats.correct_answers || 0) + correctAnswers
    const newAccuracy = (newCorrectAnswers / newTotalQuestions) * 100
    const newXP = (currentStats.xp || 0) + xpEarned
    const newLevel = Math.floor(newXP / 1000) + 1

    console.log("📊 [QUIZ RESULTS] Updating stats:", {
      userId,
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
    return NextResponse.json(
      { error: "Failed to save quiz results" },
      { status: 500 }
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
    const recentBattles = gameResults.map((result: any) => ({
      id: result.id,
      name: result.quiz_sessions.session_name,
      subject: result.quiz_sessions.session_name.replace('Singleplayer: ', ''),
      result: result.correct_answers >= result.questions_answered * 0.6 ? "Won" : "Lost",
      score: `${result.correct_answers}/${result.questions_answered}`,
      duration: `${Math.round(result.total_time)}s`,
      players: "1", // Singleplayer
      date: new Date(result.completed_at).toLocaleDateString(),
      xpEarned: result.xp_earned,
      percentage: Math.round((result.correct_answers / result.questions_answered) * 100)
    }))

    console.log("✅ [QUIZ RESULTS] Fetched recent battles:", recentBattles.length)

    return NextResponse.json({ recentBattles })

  } catch (error) {
    console.error("❌ [QUIZ RESULTS] Error fetching recent battles:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent battles" },
      { status: 500 }
    )
  }
}
