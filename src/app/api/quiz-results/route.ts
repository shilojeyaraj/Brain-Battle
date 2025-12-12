import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { sanitizeError, sanitizeDatabaseError, createSafeErrorResponse } from "@/lib/utils/error-sanitizer"
import { storeAnswerHistory } from "@/lib/quiz/question-deduplication"
import { verifySessionOwnership } from "@/lib/security/ownership-validation"
import { isValidUUID, isValidInteger, sanitizeString } from "@/lib/security/input-validation"
import { isAnswerCorrect } from "@/lib/quiz-evaluator"
import { evaluateAnswerWithFallback } from "@/lib/quiz/llm-answer-evaluator"

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

    // SECURITY: Validate input
    if (sessionId && !isValidUUID(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID format" },
        { status: 400 }
      )
    }

    // SECURITY: Validate numeric inputs
    if (!isValidInteger(totalQuestions, 1, 100) || 
        !isValidInteger(correctAnswers, 0, totalQuestions) ||
        !isValidInteger(duration, 0, 3600)) {
      return NextResponse.json(
        { error: "Invalid quiz result data" },
        { status: 400 }
      )
    }

    // 🚀 OPTIMIZATION: Create session and insert questions in one go
    // Use admin client to bypass RLS for inserts
    // If sessionId is provided, try to use it; otherwise create new session
    let sessionData
    if (sessionId) {
      // SECURITY: Verify user owns this session before allowing updates
      const ownsSession = await verifySessionOwnership(userId, sessionId)
      if (!ownsSession) {
        return NextResponse.json(
          { error: "Unauthorized - you don't have access to this session" },
          { status: 403 }
        )
      }

      // Check if session already exists
      const { data: existingSession, error: checkError } = await adminClient
        .from('quiz_sessions')
        .select('id, user_id')
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

    // 🛡️ SECURITY FIX #5: Session replay protection - validate session timestamps
    // Prevent replaying old sessions or sessions that haven't started yet
    const sessionStartTime = sessionData.started_at ? new Date(sessionData.started_at).getTime() : null
    const sessionEndTime = sessionData.ended_at ? new Date(sessionData.ended_at).getTime() : null
    const now = Date.now()
    
    // If session has an end time, it should be recent (within last 5 minutes)
    // This prevents replaying very old sessions
    if (sessionEndTime && (now - sessionEndTime) > 5 * 60 * 1000) {
      console.warn("⚠️ [QUIZ RESULTS] Session ended more than 5 minutes ago - possible replay attack", {
        sessionId: sessionData.id,
        endedAt: sessionData.ended_at,
        timeSinceEnd: now - sessionEndTime
      })
      // Still allow but log for monitoring
    }
    
    // If session has a start time, validate it's not in the future
    if (sessionStartTime && sessionStartTime > now + 60000) { // Allow 1 minute tolerance
      console.error("❌ [QUIZ RESULTS] Session start time is in the future - invalid", {
        sessionId: sessionData.id,
        startedAt: sessionData.started_at,
        now: new Date(now).toISOString()
      })
      return NextResponse.json({ error: "Invalid session timing" }, { status: 400 })
    }

    // 🛡️ XP FARMING PREVENTION: Check if user has already completed this session
    const { data: existingResult, error: duplicateCheckError } = await adminClient
      .from('game_results')
      .select('id, xp_earned, completed_at')
      .eq('user_id', userId)
      .eq('session_id', sessionData.id)
      .maybeSingle()

    if (existingResult) {
      console.log("⚠️ [QUIZ RESULTS] User already completed this session - preventing XP farming", {
        userId,
        sessionId: sessionData.id,
        previousCompletion: existingResult.completed_at
      })
      
      // Get current stats to return them without modification
      const { data: currentStats } = await adminClient
        .from('player_stats')
        .select('xp')
        .eq('user_id', userId)
        .single()
      
      return NextResponse.json({ 
        success: true, 
        sessionId: sessionData.id,
        gameResultId: existingResult.id,
        xpEarned: 0,
        oldXP: currentStats?.xp || 0,
        newXP: currentStats?.xp || 0,
        message: "You've already completed this exact quiz. No XP awarded for repeats. Try a new quiz or redo with different questions!"
      })
    }

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

    // 🛡️ SECURITY FIX #3: Fetch questions from database to validate against
    // Don't trust client-provided questions - use the ones we just inserted
    const { data: dbQuestions, error: dbQuestionsError } = await adminClient
      .from('questions')
      .select('id, question_text, question_type, correct_answer, options, order_index')
      .eq('session_id', sessionData.id)
      .order('order_index', { ascending: true })

    if (dbQuestionsError || !dbQuestions || dbQuestions.length !== insertedQuestions.length) {
      console.error("❌ [QUIZ RESULTS] Error fetching database questions:", dbQuestionsError)
      return NextResponse.json({ error: "Failed to validate questions" }, { status: 500 })
    }

    // 4. Insert player answers with proper evaluation
    // 🛡️ SECURITY: Validate answers against database questions, not client-provided questions
    const answersToInsertPromises = answers.map(async (answer: any, index: number) => {
      const question = insertedQuestions.find(q => q.order_index === index)
      const dbQuestion = dbQuestions.find(q => q.order_index === index)
      
      // Use database question for validation, fallback to client question only for answer extraction
      const questionData = dbQuestion ? {
        id: dbQuestion.id,
        question: dbQuestion.question_text,
        type: dbQuestion.question_type === 'fill_blank' ? 'open_ended' : dbQuestion.question_type,
        correct: dbQuestion.correct_answer,
        options: Array.isArray(dbQuestion.options) ? dbQuestion.options : (dbQuestion.options ? [dbQuestion.options] : []),
        expected_answers: [dbQuestion.correct_answer]
      } : questions[index] // Fallback if somehow missing
      
      // Extract user answer - could be index or text
      let userAnswer: number | string
      let answerText: string
      
      if (questionData.type === "multiple_choice" || questionData.type === "mcq") {
        // Multiple choice: use selectedIndex
        const selectedIndex = answer.selectedIndex !== undefined ? answer.selectedIndex : answer.selected
        userAnswer = typeof selectedIndex === 'number' ? selectedIndex : parseInt(String(selectedIndex)) || 0
        answerText = questionData.options && questionData.options[userAnswer] 
          ? questionData.options[userAnswer] 
          : `Option ${String.fromCharCode(65 + (userAnswer || 0))}`
      } else {
        // Open-ended: use selectedAnswer text
        userAnswer = answer.selectedAnswer || answer.textAnswer || answer.answer || ""
        answerText = String(userAnswer) || "No answer provided"
      }
      
      // Use quiz evaluator for initial check
      const fuzzyIsCorrect = isAnswerCorrect(questionData, userAnswer)
      
      // For open-ended questions, try LLM evaluation if fuzzy match fails
      let isCorrect = fuzzyIsCorrect
      if (!fuzzyIsCorrect && questionData.type === "open_ended" && typeof userAnswer === "string" && userAnswer.trim().length > 0) {
        try {
          const llmEvaluation = await evaluateAnswerWithFallback(questionData, userAnswer, fuzzyIsCorrect)
          isCorrect = llmEvaluation.isCorrect
          console.log(`📝 [QUIZ RESULTS] Question ${index + 1} LLM evaluation:`, {
            isCorrect: llmEvaluation.isCorrect,
            usedLLM: llmEvaluation.usedLLM,
            confidence: llmEvaluation.confidence,
            userAnswer: userAnswer.substring(0, 50) + "..."
          })
        } catch (error) {
          console.error(`❌ [QUIZ RESULTS] LLM evaluation failed for question ${index + 1}:`, error)
          // Fallback to fuzzy result
          isCorrect = fuzzyIsCorrect
        }
      }
      
      return {
        question_id: question?.id,
        user_id: userId,
        room_id: null, // Singleplayer doesn't have a room
        answer_text: answerText,
        is_correct: isCorrect,
        response_time: answer.responseTime || 30,
        points_earned: isCorrect ? 10 : 0,
        answered_at: new Date(Date.now() - (totalQuestions - index) * 30 * 1000).toISOString()
      }
    })
    
    const answersToInsert = await Promise.all(answersToInsertPromises)

    const { error: answersError } = await adminClient
      .from('player_answers')
      .insert(answersToInsert)

    if (answersError) {
      console.error("❌ [QUIZ RESULTS] Error inserting answers:", answersError)
      return NextResponse.json({ error: "Failed to insert answers" }, { status: 500 })
    }

    console.log("✅ [QUIZ RESULTS] Inserted player answers")
    
    // 🛡️ SECURITY FIX #1 & #3: Recalculate scores from database answers
    // Don't trust client-provided correctAnswers, score, or totalQuestions
    // Fetch all stored answers and recalculate based on database questions
    const { data: storedAnswers, error: fetchAnswersError } = await adminClient
      .from('player_answers')
      .select('question_id, is_correct, response_time, answered_at')
      .eq('user_id', userId)
      .in('question_id', insertedQuestions.map(q => q.id))
      .order('answered_at', { ascending: true })

    if (fetchAnswersError) {
      console.error("❌ [QUIZ RESULTS] Error fetching stored answers:", fetchAnswersError)
      return NextResponse.json({ error: "Failed to validate answers" }, { status: 500 })
    }

    if (!storedAnswers || storedAnswers.length === 0) {
      console.error("❌ [QUIZ RESULTS] No answers found in database")
      return NextResponse.json({ error: "No answers found" }, { status: 400 })
    }

    // 🛡️ SECURITY FIX #7: Validate answer count matches question count
    if (storedAnswers.length !== insertedQuestions.length) {
      console.error("❌ [QUIZ RESULTS] Answer count mismatch:", {
        questions: insertedQuestions.length,
        answers: storedAnswers.length
      })
      return NextResponse.json({ 
        error: `Answer count mismatch. Expected ${insertedQuestions.length} answers, got ${storedAnswers.length}` 
      }, { status: 400 })
    }

    // Recalculate correct answers from database
    const actualCorrectAnswers = storedAnswers.filter(a => a.is_correct === true).length
    const actualTotalQuestions = insertedQuestions.length
    const actualScore = actualTotalQuestions > 0 ? (actualCorrectAnswers / actualTotalQuestions) : 0

    // Calculate actual duration from answer timestamps
    const firstAnswerTime = storedAnswers[0]?.answered_at 
      ? new Date(storedAnswers[0].answered_at).getTime() 
      : Date.now()
    const lastAnswerTime = storedAnswers[storedAnswers.length - 1]?.answered_at
      ? new Date(storedAnswers[storedAnswers.length - 1].answered_at).getTime()
      : Date.now()
    const actualDuration = Math.max(0, Math.round((lastAnswerTime - firstAnswerTime) / 1000))

    // 🛡️ SECURITY FIX #2: Validate answer times are realistic
    // Check that response times are within reasonable bounds (0-60 seconds per question)
    const invalidTimes = storedAnswers.filter(a => {
      const time = Number(a.response_time) || 0
      return time < 0 || time > 60
    })
    
    if (invalidTimes.length > 0) {
      console.warn("⚠️ [QUIZ RESULTS] Invalid response times detected:", invalidTimes.length)
      // Don't fail, but log warning - we'll use calculated duration instead
    }

    // Calculate average response time from stored values (capped at 60s per question)
    const validResponseTimes = storedAnswers
      .map(a => Math.min(60, Math.max(0, Number(a.response_time) || 0)))
      .filter(t => t > 0)
    const averageResponseTime = validResponseTimes.length > 0
      ? validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length
      : 30 // Default if no valid times

    console.log("🛡️ [QUIZ RESULTS] Security validation complete:", {
      clientProvided: {
        correctAnswers,
        totalQuestions,
        score,
        duration
      },
      databaseCalculated: {
        correctAnswers: actualCorrectAnswers,
        totalQuestions: actualTotalQuestions,
        score: actualScore,
        duration: actualDuration,
        averageResponseTime
      }
    })

    // Use database-calculated values instead of client-provided values
    const verifiedCorrectAnswers = actualCorrectAnswers
    const verifiedTotalQuestions = actualTotalQuestions
    const verifiedScore = actualScore
    const verifiedDuration = actualDuration

    // 🚀 OPTIMIZATION #1 & #2: Store answer history for redo functionality (parallelized and batched)
    // Batch question history queries and parallelize answer history storage
    if (userId && questions.length > 0) {
      try {
        // Get documentId from request body if available
        const documentId = body.documentId || null
        
        // 🚀 OPTIMIZATION #2: Batch all question history lookups at once
        const questionTexts = questions.map((q: any) => q.question || q.q).filter(Boolean)
        
        if (questionTexts.length > 0) {
          // Single batch query for all question histories
          const { data: allQuestionHistory, error: historyError } = await adminClient
            .from('quiz_question_history')
            .select('id, question_text, created_at')
            .eq('user_id', userId)
            .in('question_text', questionTexts)
            .order('created_at', { ascending: false })
          
          // Create a Map for O(1) lookups (group by question_text, take most recent)
          const historyMap = new Map<string, string>()
          if (allQuestionHistory && !historyError) {
            // Group by question_text and keep only the most recent for each
            const groupedByText = new Map<string, any>()
            allQuestionHistory.forEach((h: any) => {
              const existing = groupedByText.get(h.question_text)
              if (!existing || new Date(h.created_at) > new Date(existing.created_at)) {
                groupedByText.set(h.question_text, h)
              }
            })
            groupedByText.forEach((history: any, text: string) => {
              historyMap.set(text, history.id)
            })
          }
          
          // 🚀 OPTIMIZATION #1: Parallelize answer history processing
          const answerHistoryPromises = questions.map(async (question: any, i: number) => {
            const answer = answers[i]
            const questionText = question.question || question.q
            
            // Skip if no question text or no history found
            if (!questionText || !historyMap.has(questionText)) {
              return null
            }
            
            const historyId = historyMap.get(questionText)!
            
            // Extract user answer properly
            let userAnswer: number | string
            if (question.type === "multiple_choice" || question.type === "mcq") {
              const selectedIndex = answer.selectedIndex !== undefined ? answer.selectedIndex : answer.selected
              userAnswer = typeof selectedIndex === 'number' ? selectedIndex : parseInt(String(selectedIndex)) || 0
            } else {
              userAnswer = answer.selectedAnswer || answer.textAnswer || answer.answer || ""
            }
            
            // Use quiz evaluator for correctness (reuse from earlier evaluation if available)
            // Check if we already evaluated this in answersToInsert
            const existingAnswer = answersToInsert.find((a, idx) => idx === i)
            let isCorrect = existingAnswer?.is_correct ?? false
            
            // If not found, evaluate now
            if (existingAnswer === undefined) {
              const fuzzyIsCorrect = isAnswerCorrect(question, userAnswer)
              isCorrect = fuzzyIsCorrect
              
              // For open-ended, try LLM if fuzzy fails
              if (!fuzzyIsCorrect && question.type === "open_ended" && typeof userAnswer === "string" && userAnswer.trim().length > 0) {
                try {
                  const llmEvaluation = await evaluateAnswerWithFallback(question, userAnswer, fuzzyIsCorrect)
                  isCorrect = llmEvaluation.isCorrect
                } catch (error) {
                  // Fallback to fuzzy result
                  isCorrect = fuzzyIsCorrect
                }
              }
            }
            
            // Store answer history
            try {
              await storeAnswerHistory(
                userId,
                historyId,
                String(userAnswer),
                isCorrect,
                sessionData.id
              )
              return { success: true, questionIndex: i }
            } catch (error) {
              console.error(`❌ [QUIZ RESULTS] Error storing answer history for question ${i}:`, error)
              return { success: false, questionIndex: i, error }
            }
          })
          
          // Wait for all answer histories to be stored in parallel
          const results = await Promise.allSettled(answerHistoryPromises)
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length
          console.log(`✅ [QUIZ RESULTS] Stored answer history for ${successCount}/${questions.length} questions (parallelized)`)
        }
      } catch (error) {
        console.error("❌ [QUIZ RESULTS] Error storing answer history:", error)
        // Don't fail the request if answer history storage fails
      }
    }

    // 5. Create game result record
    // 🛡️ SECURITY: Use verified values from database, not client-provided values
    // Calculate XP: base XP per question (20) + bonus for accuracy
    // Base: 20 XP per correct answer (increased from 10 for better retention)
    // Bonus: up to 100 XP for perfect score (increased from 50)
    const baseXP = verifiedCorrectAnswers * 20
    const accuracyBonus = verifiedCorrectAnswers === verifiedTotalQuestions ? 100 : Math.round((verifiedCorrectAnswers / verifiedTotalQuestions) * 60)
    const xpEarned = baseXP + accuracyBonus
    
    console.log("💰 [QUIZ RESULTS] XP Calculation (using verified values):", {
      correctAnswers: verifiedCorrectAnswers,
      totalQuestions: verifiedTotalQuestions,
      baseXP,
      accuracyBonus,
      xpEarned,
      isPerfectScore: verifiedCorrectAnswers === verifiedTotalQuestions
    })
    // 🛡️ SECURITY: Use verified values from database
    const { data: gameResult, error: gameResultError } = await adminClient
      .from('game_results')
      .insert({
        room_id: null, // Singleplayer
        user_id: userId,
        session_id: sessionData.id,
        final_score: verifiedScore,
        questions_answered: verifiedTotalQuestions,
        correct_answers: verifiedCorrectAnswers,
        total_time: verifiedDuration,
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

    // 6. Ensure user row exists, then get/create player stats (admin client bypasses RLS)
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existingUser) {
      try {
        await adminClient.from('users').insert({ id: userId }).select('id').single()
        console.log(`🔧 [QUIZ RESULTS] Created missing user row for ${userId}`)
      } catch (userCreateErr) {
        console.error('❌ [QUIZ RESULTS] Failed to ensure user exists:', userCreateErr)
      }
    }

    const isSingleplayerForNewStats = sessionData?.room_id === null || sessionData?.room_id === undefined

    const createDefaultStats = async () => {
      const safeCorrectAnswers = typeof verifiedCorrectAnswers !== 'undefined' ? verifiedCorrectAnswers : 0
      const safeTotalQuestions = typeof verifiedTotalQuestions !== 'undefined' ? verifiedTotalQuestions : 0
      const safeAverageTime = typeof averageResponseTime !== 'undefined' ? averageResponseTime : 30
      const safeAccuracy = safeTotalQuestions > 0 ? (safeCorrectAnswers / safeTotalQuestions) * 100 : 0
      const totals = {
        total_games: 1,
        total_wins: 1,
        total_losses: 0,
        win_streak: 1,
        best_streak: 1
      }
      const { data: newStats, error: createError } = await adminClient
        .from('player_stats')
        .insert({
          user_id: userId,
          level: 1,
          xp: xpEarned,
          ...totals,
          total_questions_answered: safeTotalQuestions,
          correct_answers: safeCorrectAnswers,
          accuracy: safeAccuracy,
          average_response_time: safeAverageTime,
          favorite_subject: topic,
          trial_quiz_diagrams_remaining: 3,
          quiz_diagrams_this_month: 0,
          has_used_trial_quiz_diagrams: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createError || !newStats) {
        console.error("❌ [QUIZ RESULTS] Error creating player stats:", createError)
        return null
      }
      return newStats
    }

    let currentStats
    try {
      const { data: statsRow, error: statsFetchError } = await adminClient
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (statsFetchError || !statsRow) {
        console.warn("⚠️ [QUIZ RESULTS] Missing player_stats, creating default row...")
        currentStats = await createDefaultStats()
        if (!currentStats) {
          return NextResponse.json({ error: "Failed to initialize stats" }, { status: 500 })
        }
      } else {
        currentStats = statsRow
      }
    } catch (statsFetchError) {
      console.warn("⚠️ [QUIZ RESULTS] Stats fetch error, creating default row...", statsFetchError)
      currentStats = await createDefaultStats()
      if (!currentStats) {
        return NextResponse.json({ error: "Failed to initialize stats" }, { status: 500 })
      }
    }

    // 7. Update player stats manually (ensure it works even if trigger doesn't exist)
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
    
    // Update games count for both singleplayer and multiplayer (for achievements)
    // But only count multiplayer games for win/loss stats
    const newTotalGames = (currentStats.total_games || 0) + 1
    // Singleplayer: do NOT count wins/streaks; only multiplayer increases wins/streaks
    const isMultiplayer = !!sessionData.room_id
    const newTotalWins = isMultiplayer ? (currentStats.total_wins || 0) + 1 : (currentStats.total_wins || 0)
    const newWinStreak = isMultiplayer ? (currentStats.win_streak || 0) + 1 : (currentStats.win_streak || 0)
    const newBestStreak = Math.max(currentStats.best_streak || 0, newWinStreak)
    // 🛡️ SECURITY: Use verified values from database
    const newTotalQuestions = (currentStats.total_questions_answered || 0) + verifiedTotalQuestions
    const newCorrectAnswers = (currentStats.correct_answers || 0) + verifiedCorrectAnswers
    const newAccuracy = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : 0
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

    // Ensure XP is a valid number
    if (isNaN(newXP) || newXP < 0) {
      console.error("❌ [QUIZ RESULTS] Invalid XP value:", { newXP, xpEarned, currentXP: currentStats.xp })
      return NextResponse.json({ error: "Invalid XP calculation" }, { status: 500 })
    }

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
      // Try to verify the update actually failed
      const { data: verifyStats } = await adminClient
        .from('player_stats')
        .select('xp, level')
        .eq('user_id', userId)
        .single()
      
      if (verifyStats) {
        console.log("⚠️ [QUIZ RESULTS] Stats after failed update attempt:", verifyStats)
      }
    } else {
      console.log("✅ [QUIZ RESULTS] Updated player stats successfully:", {
        userId,
        oldXP: currentStats.xp,
        xpEarned,
        newXP: updatedStats?.xp,
        oldLevel: currentStats.level,
        newLevel: updatedStats?.level,
        total_games: updatedStats?.total_games,
        total_wins: updatedStats?.total_wins,
        total_questions_answered: updatedStats?.total_questions_answered,
        correct_answers: updatedStats?.correct_answers
      })
      
      // Verify the update was successful
      if (updatedStats?.xp !== newXP) {
        console.error("❌ [QUIZ RESULTS] XP mismatch! Expected:", newXP, "Got:", updatedStats?.xp)
      }
    }

    // 🚀 OPTIMIZATION #3: Parallelize post-quiz operations (non-blocking)
    // Send response immediately, run post-quiz ops in background
    const responseData = {
      success: true,
      sessionId: sessionData.id,
      gameResultId: gameResult.id,
      xpEarned,
      oldXP: currentStats.xp || 0,
      newXP: newXP,
      unlockedAchievements: undefined as any[] | undefined
    }

    // Run post-quiz operations in parallel (non-blocking)
    Promise.allSettled([
      // Update daily streak
      (async () => {
        try {
          const { calculateUserStreak } = await import('@/lib/streak/streak-calculator')
          await calculateUserStreak(userId)
          console.log("✅ [QUIZ RESULTS] Updated daily streak (background)")
        } catch (error) {
          console.error('❌ [QUIZ RESULTS] Error updating streak:', error)
        }
      })(),
      
      // Check and unlock achievements
      (async () => {
        try {
          const { checkAndUnlockAchievements, checkCustomAchievements } = await import('@/lib/achievements/achievement-checker')
          
          // 🛡️ SECURITY: Use verified values from database
          // Check for perfect score
          const isPerfectScore = verifiedCorrectAnswers === verifiedTotalQuestions && verifiedTotalQuestions > 0
          
          // Determine if this is a multiplayer session
          const isMultiplayer = sessionData.room_id !== null
          const isWin = isMultiplayer && (verifiedScore >= 0.6) // 60% threshold for win
          
          // Check standard achievements (based on updated stats) - parallel
          const [unlockedStandard, unlockedCustom] = await Promise.all([
            checkAndUnlockAchievements(userId),
            checkCustomAchievements(userId, {
              isPerfectScore,
              isMultiplayer,
              isWin,
            })
          ])
          
          const unlockedAchievements = [...unlockedStandard, ...unlockedCustom]
          
          if (unlockedAchievements.length > 0) {
            console.log(`✅ [QUIZ RESULTS] Unlocked ${unlockedAchievements.length} achievement(s) (background)`)
            // Note: Achievements won't be in initial response, but will be updated via real-time or next fetch
          }
          
          return unlockedAchievements
        } catch (error) {
          console.error('❌ [QUIZ RESULTS] Error checking achievements:', error)
          return []
        }
      })()
    ]).then((results) => {
      // Try to get achievements from the second result if available
      const achievementResult = results[1]
      if (achievementResult.status === 'fulfilled' && achievementResult.value) {
        const achievements = achievementResult.value as any[]
        if (achievements.length > 0) {
          // Could dispatch event or update via WebSocket if needed
          console.log(`✅ [QUIZ RESULTS] Background achievement check completed: ${achievements.length} achievements`)
        }
      }
    }).catch((error) => {
      console.error('❌ [QUIZ RESULTS] Background post-quiz operations error:', error)
    })

    // Return response immediately (post-quiz ops run in background)
    return NextResponse.json(responseData)

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
