"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Target, Trophy, Zap, AlertTriangle, EyeOff, X, Star, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { useAntiCheat, CheatEvent } from "@/hooks/use-anti-cheat"
import { QuizProgressBar } from "@/components/ui/quiz-progress-bar"
import { getCurrentUserId } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { useFeedback } from "@/hooks/useFeedback"
import { RewardToast } from "@/components/feedback/GameFeedback"

interface Question {
  id: number
  prompt: string
  type: 'mcq' | 'short' | 'truefalse'
  options?: string[]
  answer: string
  meta?: any
}

interface PlayerProgress {
  user_id: string
  correct_count: number
  total_answered: number
  last_idx: number
  display_name?: string
}

interface QuizSession {
  id: string
  room_id: string
  status: 'pending' | 'generating' | 'active' | 'complete'
  total_questions: number
  started_at: string | null
}

export default function MultiplayerBattlePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [showRewardToast, setShowRewardToast] = useState(false)
  const [rewardMessage, setRewardMessage] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(30)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null)
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [cheatViolations, setCheatViolations] = useState<CheatEvent[]>([])
  const [showCheatWarning, setShowCheatWarning] = useState(false)
  const [battleComplete, setBattleComplete] = useState(false)
  
  const { id: roomId } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<any>(null)
  const { playCorrect, playWrong, burstConfetti } = useFeedback()

  // Track if battle is actively running
  const isBattleActive = !isLoading && !hasError && !battleComplete && questions.length > 0

  // Anti-cheat functionality
  const handleCheatDetected = (event: CheatEvent) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 [MULTIPLAYER BATTLE] Cheat detected:', event)
    }
    setCheatViolations(prev => [...prev, event])
    setShowCheatWarning(true)
    
    // Send cheat event to server
    fetch('/api/cheat-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room_id: roomId,
        user_id: currentUserId,
        violation_type: event.type,
        duration_seconds: Math.round(event.duration / 1000),
        timestamp: new Date().toISOString()
      })
    })
    
    // Auto-hide warning after 5 seconds
    setTimeout(() => {
      setShowCheatWarning(false)
    }, 5000)
  }

  // Initialize anti-cheat hook
  const { isAway } = useAntiCheat({
    isGameActive: isBattleActive,
    thresholdMs: 2500,
    onCheatDetected: handleCheatDetected
  })

  // Load quiz session and questions
  useEffect(() => {
    const loadQuizData = async () => {
      try {
        setIsLoading(true)
        
        // Get current user
        const userId = await getCurrentUserId()
        setCurrentUserId(userId)

        // Load active quiz session
        const { data: sessionData, error: sessionError } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'active')
          .single()

        if (sessionError || !sessionData) {
          console.error('❌ [BATTLE] No active quiz session found:', sessionError)
          setHasError(true)
          return
        }

        setQuizSession(sessionData)

        // Load questions for this session
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('idx')

        if (questionsError || !questionsData || questionsData.length === 0) {
          console.error('❌ [BATTLE] No questions found:', questionsError)
          setHasError(true)
          return
        }

        setQuestions(questionsData)
        setTimeLeft(30) // Default time limit

        // Load initial player progress
        await loadPlayerProgress(sessionData.id)

        console.log('✅ [BATTLE] Quiz data loaded successfully')
        
      } catch (error) {
        console.error('❌ [BATTLE] Error loading quiz data:', error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    if (roomId) {
      loadQuizData()
    }
  }, [roomId])

  // Load player progress
  const loadPlayerProgress = async (sessionId: string) => {
    try {
      const { data: progressData, error: progressError } = await supabase
        .from('player_progress')
        .select(`
          user_id,
          correct_count,
          total_answered,
          last_idx,
          profiles!inner(display_name)
        `)
        .eq('session_id', sessionId)

      if (progressError) {
        console.error('❌ [BATTLE] Error loading player progress:', progressError)
        return
      }

      const formattedProgress = progressData?.map(p => ({
        user_id: p.user_id,
        correct_count: p.correct_count,
        total_answered: p.total_answered,
        last_idx: p.last_idx,
        display_name: p.profiles?.[0]?.display_name || 'Unknown Player'
      })) || []

      setPlayerProgress(formattedProgress)
    } catch (error) {
      console.error('❌ [BATTLE] Error loading player progress:', error)
    }
  }

  // Set up real-time subscriptions
  useEffect(() => {
    if (!quizSession?.id || !roomId) return

    console.log('🔄 [BATTLE] Setting up real-time subscriptions')

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create channel for real-time updates
    const channel = supabase.channel(`battle:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_progress',
        filter: `session_id=eq.${quizSession.id}`
      }, async (payload) => {
        console.log('📊 [BATTLE] Player progress updated:', payload)
        await loadPlayerProgress(quizSession.id)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_events',
        filter: `session_id=eq.${quizSession.id}`
      }, (payload) => {
        console.log('🎯 [BATTLE] Session event:', payload)
        
        if (payload.eventType === 'INSERT' && payload.new.type === 'complete') {
          setBattleComplete(true)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [quizSession?.id, roomId])

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !showResult && !battleComplete && isBattleActive) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult && isBattleActive) {
      handleAnswer(-1) // Time's up
    }
  }, [timeLeft, showResult, battleComplete, isBattleActive])

  const currentQuestionData = useMemo(() => questions[currentQuestion] || null, [questions, currentQuestion])

  const handleAnswer = useCallback(async (answerIndex: number) => {
    if (!currentQuestionData || !currentUserId || !quizSession) return
    
    setSelectedAnswer(answerIndex)
    setShowResult(true)
    
    const isCorrect = answerIndex === 0 // Assuming first option is correct for now
    const answerText = answerIndex === -1 ? 'timeout' : 
                      currentQuestionData.type === 'mcq' ? 
                        currentQuestionData.options?.[answerIndex] || '' : 
                        textAnswer

    try {
      if (isCorrect) {
        playCorrect()
        burstConfetti({ particleCount: 80, spread: 60 })
        setRewardMessage("+10 XP!")
        setShowRewardToast(true)
        setTimeout(() => setShowRewardToast(false), 1200)
      } else {
        playWrong()
      }
      // Submit answer to database
      const { error: answerError } = await supabase
        .from('quiz_answers')
        .insert({
          session_id: quizSession.id,
          question_id: currentQuestionData.id,
          user_id: currentUserId,
          submission: answerText,
          is_correct: isCorrect,
          score_delta: isCorrect ? 10 : 0
        })

      if (answerError) {
        console.error('❌ [BATTLE] Error submitting answer:', answerError)
        return
      }

      // Update player progress
      const currentProgress = playerProgress.find(p => p.user_id === currentUserId)
      const newCorrectCount = isCorrect ? (currentProgress?.correct_count || 0) + 1 : currentProgress?.correct_count || 0
      const newTotalAnswered = (currentProgress?.total_answered || 0) + 1

      const { error: progressError } = await supabase
        .from('player_progress')
        .upsert({
          session_id: quizSession.id,
          user_id: currentUserId,
          correct_count: newCorrectCount,
          total_answered: newTotalAnswered,
          last_idx: currentQuestion
        })

      if (progressError) {
        console.error('❌ [BATTLE] Error updating progress:', progressError)
      }

      // Log session event
      await supabase
        .from('session_events')
        .insert({
          session_id: quizSession.id,
          type: 'answer',
          payload: {
            user_id: currentUserId,
            question_idx: currentQuestion,
            is_correct: isCorrect,
            answer: answerText,
            timestamp: new Date().toISOString()
          }
        })

    } catch (error) {
      console.error('❌ [BATTLE] Error handling answer:', error)
    }
  }, [currentQuestionData, currentUserId, quizSession, playerProgress, currentQuestion, textAnswer, playCorrect, playWrong, burstConfetti])

  const handleTextAnswer = useCallback(() => {
    if (!currentQuestionData || !textAnswer.trim()) return
    
    // For text answers, we'll need to implement proper checking
    // For now, let's assume it's correct if it matches the answer
    const isCorrect = textAnswer.trim().toLowerCase() === currentQuestionData.answer.toLowerCase()
    handleAnswer(isCorrect ? 0 : 1)
  }, [currentQuestionData, textAnswer, handleAnswer])

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setTextAnswer("")
      setShowResult(false)
      setTimeLeft(30)
    } else {
      // Quiz completed
      setBattleComplete(true)
    }
  }, [currentQuestion, questions.length])

  const getScoreColor = useMemo(() => {
    const currentPlayerProgress = playerProgress.find(p => p.user_id === currentUserId)
    if (!currentPlayerProgress) return "text-muted-foreground"
    
    const accuracy = currentPlayerProgress.total_answered > 0 ? 
      (currentPlayerProgress.correct_count / currentPlayerProgress.total_answered) * 100 : 0
    
    if (accuracy >= 80) return "text-chart-3"
    if (accuracy >= 60) return "text-primary"
    return "text-destructive"
  }, [playerProgress, currentUserId])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-foreground"></div>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Loading Battle...
            </h1>
            <p className="text-muted-foreground font-bold">Preparing your multiplayer quiz</p>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (hasError || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-destructive flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <Zap className="w-10 h-10 text-destructive-foreground" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              No Quiz Available
            </h1>
            <p className="text-muted-foreground font-bold mb-6">
              No active quiz session found. Please check with the room host.
            </p>
            <Link href={`/room/${roomId}`}>
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover">
                <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
                Back to Room
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  if (battleComplete) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-chart-3 flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <Trophy className="w-10 h-10 text-foreground" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Battle Complete!
            </h1>
            <p className="text-muted-foreground font-bold mb-6">
              Great job! Check the final results in the room.
            </p>
            <Link href={`/room/${roomId}`}>
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover">
                <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
                Back to Room
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  // Guard clause to prevent rendering when question is not available
  if (!currentQuestionData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-foreground"></div>
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Loading Question...</h2>
            <p className="text-muted-foreground font-bold">Preparing your next challenge</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Cheat Warning Banner */}
        {showCheatWarning && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-800 text-sm">
                      Focus Warning
                    </span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    You switched away from the battle for {cheatViolations[cheatViolations.length - 1]?.duration ? Math.round(cheatViolations[cheatViolations.length - 1].duration / 1000) : 'some'} seconds{cheatViolations[cheatViolations.length - 1]?.type === 'visibility_change' ? ' (tab switched)' : ' (window lost focus)'}. Please stay focused!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheatWarning(false)}
                className="flex-shrink-0 p-1 hover:bg-yellow-100 rounded-full transition-colors"
                aria-label="Dismiss warning"
              >
                <X className="h-4 w-4 text-yellow-600" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <Link href={`/room/${roomId}`}>
                <Button variant="outline" className="cartoon-border cartoon-shadow">
                  <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
                  Back to Room
                </Button>
              </Link>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card cartoon-border cartoon-shadow">
                  <Target className="h-5 w-5 text-primary" strokeWidth={3} />
                  <span className="text-muted-foreground font-bold">Question:</span>
                  <span className="font-black text-primary">{currentQuestion + 1}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card cartoon-border cartoon-shadow">
                  <Clock className="h-5 w-5 text-secondary" strokeWidth={3} />
                  <span className="font-black text-secondary">{timeLeft}s</span>
                </div>
                {isAway && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border-2 border-yellow-300 cartoon-border">
                    <EyeOff className="h-5 w-5 text-yellow-600" strokeWidth={3} />
                    <span className="font-black text-yellow-700">Away</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <QuizProgressBar
              currentQuestion={currentQuestion}
              totalQuestions={questions.length}
              score={playerProgress.find(p => p.user_id === currentUserId)?.correct_count || 0}
              timeLeft={timeLeft}
              topic="Multiplayer Battle"
              isAway={isAway}
              streak={0}
            />

            {/* Question Card */}
            <Card className="p-8 bg-card cartoon-border cartoon-shadow">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-2xl font-black text-foreground leading-relaxed">
                    {currentQuestionData.prompt}
                  </h2>
                  <Badge className={`cartoon-border font-black ${
                    currentQuestionData.type === 'short' 
                      ? "bg-secondary text-secondary-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}>
                    {currentQuestionData.type === 'short' ? "Short Answer" : "Multiple Choice"}
                  </Badge>
                </div>
                
                {/* Multiple Choice Questions */}
                {currentQuestionData.type === 'mcq' && currentQuestionData.options && (
                  <div className="space-y-4">
                    {currentQuestionData.options.map((option: string, index: number) => {
                      let buttonClass = "w-full p-4 text-left font-bold text-lg rounded-xl cartoon-border cartoon-shadow transition-all duration-200 "
                      
                      if (showResult) {
                        if (index === 0) { // Assuming first option is correct
                          buttonClass += "bg-chart-3 text-foreground border-chart-3"
                        } else if (index === selectedAnswer && index !== 0) {
                          buttonClass += "bg-destructive text-destructive-foreground border-destructive"
                        } else {
                          buttonClass += "bg-muted text-muted-foreground"
                        }
                      } else {
                        buttonClass += "bg-card hover:bg-muted hover:border-primary cartoon-hover"
                      }
                      
                      return (
                        <button
                          key={index}
                          onClick={() => !showResult && handleAnswer(index)}
                          disabled={showResult}
                          className={buttonClass}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                              showResult && index === 0
                                ? "bg-foreground text-chart-3"
                                : showResult && index === selectedAnswer && index !== 0
                                ? "bg-foreground text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            {option}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Short Answer Questions */}
                {currentQuestionData.type === 'short' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <textarea
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Enter your answer here..."
                        disabled={showResult}
                        className="w-full p-4 text-lg font-bold rounded-xl cartoon-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={3}
                      />
                      
                      {!showResult && (
                        <Button
                          onClick={handleTextAnswer}
                          disabled={!textAnswer.trim()}
                          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50"
                        >
                          Submit Answer
                        </Button>
                      )}
                    </div>

                    {/* Show user's answer after submission */}
                    {showResult && textAnswer && (
                      <div className="p-4 rounded-xl bg-secondary/50 cartoon-border">
                        <h4 className="font-black text-foreground mb-2">Your Answer:</h4>
                        <p className="text-foreground font-bold">{textAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showResult && (
                <div className="p-6 rounded-xl bg-secondary/50 cartoon-border mb-6">
                  <h3 className="font-black text-foreground mb-2">Correct Answer:</h3>
                  <p className="text-muted-foreground font-bold">{currentQuestionData.answer}</p>
                </div>
              )}

              {showResult && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleNext}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg px-8 py-3 cartoon-border cartoon-shadow cartoon-hover"
                  >
                    {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Live Leaderboard */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-card cartoon-border cartoon-shadow sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" strokeWidth={3} />
                <h3 className="text-lg font-black text-foreground">Live Scores</h3>
              </div>
              
              <div className="space-y-3">
                {playerProgress
                  .sort((a, b) => b.correct_count - a.correct_count)
                  .map((player, index) => {
                    const isCurrentPlayer = player.user_id === currentUserId
                    const accuracy = player.total_answered > 0 ? 
                      (player.correct_count / player.total_answered) * 100 : 0
                    
                    return (
                      <div
                        key={player.user_id}
                        className={`p-3 rounded-xl border-2 ${
                          isCurrentPlayer 
                            ? "bg-primary/10 border-primary" 
                            : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              index === 0 ? "bg-chart-3 text-foreground" :
                              index === 1 ? "bg-primary text-primary-foreground" :
                              index === 2 ? "bg-secondary text-secondary-foreground" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {index + 1}
                            </div>
                            <span className={`font-bold text-sm ${
                              isCurrentPlayer ? "text-primary" : "text-foreground"
                            }`}>
                              {player.display_name}
                              {isCurrentPlayer && " (You)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-chart-3" strokeWidth={3} />
                            <span className="font-black text-chart-3">{player.correct_count}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-bold">
                            {player.total_answered} answered
                          </span>
                          <span className={`font-bold ${
                            accuracy >= 80 ? "text-chart-3" :
                            accuracy >= 60 ? "text-primary" :
                            "text-destructive"
                          }`}>
                            {accuracy.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </Card>
          </div>
        </div>
      </div>
      <RewardToast show={showRewardToast} message={rewardMessage} />
    </div>
  )
}
