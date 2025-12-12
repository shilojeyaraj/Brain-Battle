"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Target, Trophy, Zap, AlertTriangle, EyeOff, X, Star, TrendingUp, FileText, Image, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useAntiCheat, CheatEvent } from "@/hooks/use-anti-cheat"
import { calculateXP, getXPExplanation, checkLevelUp } from "@/lib/xp-calculator"
import { getRankFromXP, getRankIcon, formatXP } from "@/lib/rank-system"
import { XPProgressBar } from "@/components/ui/xp-progress-bar"
import { LevelUpModal } from "@/components/ui/level-up-modal"
import { QuizProgressBar } from "@/components/ui/quiz-progress-bar"
import { useFeedback } from "@/hooks/useFeedback"
import { RewardToast } from "@/components/feedback/GameFeedback"
import { isAnswerCorrect } from "@/lib/quiz-evaluator"
import { BrainBattleLoading } from "@/components/ui/brain-battle-loading"
import { AchievementNotification } from "@/components/achievements/achievement-notification"
import { useAchievements } from "@/hooks/use-achievements"
import { Lightbulb, BookOpen, ExternalLink } from "lucide-react"

// Default empty questions - will be loaded from sessionStorage
const defaultQuestions: any[] = []

export default function BattlePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params?.sessionId as string
  const isAdminMode = searchParams?.get('admin') === 'true'
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [currentAnswerIsCorrect, setCurrentAnswerIsCorrect] = useState<boolean | null>(null)
  const [showRewardToast, setShowRewardToast] = useState(false)
  const [rewardMessage, setRewardMessage] = useState<string>("")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [battleComplete, setBattleComplete] = useState(false)
  const [questions, setQuestions] = useState(defaultQuestions)
  const [topic, setTopic] = useState("General Knowledge")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [userAnswers, setUserAnswers] = useState<(number | string)[]>([])
  const [cheatViolations, setCheatViolations] = useState<CheatEvent[]>([])
  const [showCheatWarning, setShowCheatWarning] = useState(false)
  const [battleResults, setBattleResults] = useState<{
    xpEarned: number
    oldXP: number
    newXP: number
    xpBreakdown: string[]
    leveledUp: boolean
    sessionId?: string
  } | null>(null)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [isSubmittingResults, setIsSubmittingResults] = useState(false)
  const { unlockedAchievements, dismissAchievement, addAchievements } = useAchievements()

  // Track if battle is actively running (not in loading, error, or complete state)
  const isBattleActive = !isLoading && !hasError && !battleComplete && questions.length > 0

  // Anti-cheat functionality for singleplayer
  const handleCheatDetected = (event: CheatEvent) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 [SINGLEPLAYER] Cheat detected:', event)
    }
    setCheatViolations(prev => [...prev, event])
    setShowCheatWarning(true)
    
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

  const { playCorrect, playWrong, playClick, burstConfetti, playSelect, playTimeUp, playPurchaseConfirm } = useFeedback()

  // Load questions from sessionStorage on component mount
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return
    
    // Admin mode: Load test questions or create default test questions
    if (isAdminMode && sessionId.startsWith('test-')) {
      // Create default test questions for admin mode
      // Include questions with requires_image: true to test diagram generation
      const testQuestions = [
        {
          id: "test-1",
          question: "What is 2 + 2?",
          type: "multiple_choice",
          options: ["3", "4", "5", "6"],
          correct_answer: 1,
          explanation: "2 + 2 equals 4."
        },
        {
          id: "test-2",
          question: "What is the capital of France?",
          type: "open_ended",
          correct_answer: "Paris",
          explanation: "Paris is the capital and largest city of France."
        },
        {
          id: "test-3",
          question: "The Earth is round.",
          type: "true_false",
          options: ["True", "False"],
          correct_answer: 0,
          explanation: "Yes, the Earth is approximately spherical (an oblate spheroid)."
        },
        {
          id: "test-4",
          question: "Based on the force diagram shown, what is the net force acting on the object?",
          type: "multiple_choice",
          options: ["0 N", "5 N", "10 N", "15 N"],
          correct_answer: 1,
          explanation: "The net force is calculated by summing all forces. Based on the diagram, the net force is 5 N.",
          requires_image: true,
          image_data_b64: null // Will be generated if diagram generation works
        },
        {
          id: "test-5",
          question: "Looking at the circuit diagram, which component has the highest voltage?",
          type: "multiple_choice",
          options: ["Resistor R1", "Resistor R2", "Battery", "Cannot determine"],
          correct_answer: 2,
          explanation: "The battery provides the source voltage, which is the highest in the circuit.",
          requires_image: true,
          image_data_b64: null // Will be generated if diagram generation works
        }
      ]
      
      setQuestions(testQuestions)
      setTimeLeft(testQuestions[0]?.type === "open_ended" ? 60 : 30)
      setTopic("Admin Test Quiz")
      setDifficulty("medium")
      setIsLoading(false)
      return
    }
    
    // Normal mode: Verify sessionId matches stored one
    const storedSessionId = sessionStorage.getItem('quizSessionId')
    if (storedSessionId && storedSessionId !== sessionId) {
      console.warn('Session ID mismatch. Redirecting...')
      window.location.href = '/singleplayer'
      return
    }
    
    const storedQuestions = sessionStorage.getItem('quizQuestions')
    const storedTopic = sessionStorage.getItem('quizTopic')
    const storedDifficulty = sessionStorage.getItem('quizDifficulty')
    
    if (storedQuestions) {
      try {
        const parsedQuestions = JSON.parse(storedQuestions)
        if (parsedQuestions && parsedQuestions.length > 0) {
          setQuestions(parsedQuestions)
          // Set initial timer based on first question type
          setTimeLeft(parsedQuestions[0]?.type === "open_ended" ? 60 : 30)
          setIsLoading(false)
        } else {
          setHasError(true)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error parsing stored questions:", error)
        setHasError(true)
        setIsLoading(false)
      }
    } else {
      setHasError(true)
      setIsLoading(false)
    }
    
    if (storedTopic) {
      setTopic(storedTopic)
    }
    
    if (storedDifficulty) {
      setDifficulty(storedDifficulty as "easy" | "medium" | "hard")
    }
  }, [sessionId, isAdminMode])

  const question = useMemo(() => questions[currentQuestion] || null, [questions, currentQuestion])

  // Memoize expensive calculations
  const scorePercentage = useMemo(() => (score / questions.length) * 100, [score, questions.length])
  const isLastQuestion = useMemo(() => currentQuestion >= questions.length - 1, [currentQuestion, questions.length])

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !showResult && !battleComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      // Handle time's up based on question type
      playTimeUp()
      if (question?.type === "open_ended") {
        // For open-ended questions, just show result without submitting
        setShowResult(true)
      } else {
        handleAnswer(-1) // Time's up for multiple choice
      }
    }
  }, [timeLeft, showResult, battleComplete, question?.type])

  const handleAnswer = useCallback((answerIndex: number) => {
    if (!question) return
    
    // selection feedback
    playSelect()

    setSelectedAnswer(answerIndex)
    setShowResult(true)
    
    const isCorrect = isAnswerCorrect(question, answerIndex)
    setCurrentAnswerIsCorrect(isCorrect)
    
    if (isCorrect) {
      setScore(prev => prev + 1)
      playCorrect()
      burstConfetti({ particleCount: 80, spread: 60 })
      setRewardMessage("+10 XP!")
      setShowRewardToast(true)
      setTimeout(() => setShowRewardToast(false), 1200)
    } else {
      playWrong()
    }
    
    // Store user answer
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      newAnswers[currentQuestion] = answerIndex
      return newAnswers
    })
  }, [question, currentQuestion, playCorrect, playWrong, burstConfetti, playSelect])

  const handleTextAnswer = useCallback(() => {
    if (!question || !textAnswer.trim()) return
    
    // submit/lock feedback
    playPurchaseConfirm()

    setShowResult(true)
    
    const userAnswer = textAnswer.trim()
    const isCorrect = isAnswerCorrect(question, userAnswer)
    setCurrentAnswerIsCorrect(isCorrect)

    if (isCorrect) {
      setScore(prev => prev + 1)
      playCorrect()
      burstConfetti({ particleCount: 80, spread: 60 })
      setRewardMessage("+10 XP!")
      setShowRewardToast(true)
      setTimeout(() => setShowRewardToast(false), 1200)
    } else {
      playWrong()
    }
    
    // Store user answer
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      newAnswers[currentQuestion] = textAnswer.trim()
      return newAnswers
    })
  }, [question, textAnswer, currentQuestion, playCorrect, playWrong, burstConfetti, playPurchaseConfirm])

  const handleBattleComplete = useCallback(async () => {
    setIsSubmittingResults(true)
    
    try {
      // Calculate battle statistics
      const correctAnswers = score
      const totalQuestions = questions.length
      const totalTime = questions.length * 30 - timeLeft // Rough estimate
      const averageTimePerQuestion = totalTime / totalQuestions
      
      // Calculate XP
      const xpResult = calculateXP({
        correctAnswers,
        totalQuestions,
        averageTimePerQuestion,
        difficulty: difficulty,
        winStreak: 0, // Would need to fetch from user stats
        isPerfectScore: correctAnswers === totalQuestions,
        isMultiplayer: false
      })

      // Submit results to API with sessionId (user is taken from secure session cookie on the server)
      // Get documentId from sessionStorage if available
      const documentId = typeof window !== 'undefined' ? sessionStorage.getItem('documentId') : null
      
      const response = await fetch('/api/quiz-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId, // Pass the sessionId
          questions: questions,
          answers: userAnswers,
          score: score,
          totalQuestions: totalQuestions,
          correctAnswers: correctAnswers,
          duration: totalTime,
          topic: topic,
          documentId: documentId // Pass documentId for answer history tracking
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Dispatch event to refresh stats on dashboard
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quizCompleted', { 
            detail: { xpEarned: result.xpEarned, newXP: result.newXP } 
          }))
        }
        console.log('✅ Battle results submitted:', result)
        
        // Check if user leveled up
        const leveledUp = checkLevelUp(result.oldXP || 0, result.newXP || 0)
        
        // Set results state
        const results = {
          xpEarned: result.xpEarned || xpResult.totalXP,
          oldXP: result.oldXP || 0,
          newXP: result.newXP || 0,
          xpBreakdown: getXPExplanation(xpResult, {
            correctAnswers,
            totalQuestions,
            averageTimePerQuestion,
            difficulty: difficulty,
            winStreak: 0,
            isPerfectScore: correctAnswers === totalQuestions,
            isMultiplayer: false
          }),
          leveledUp,
          sessionId: result.sessionId || sessionId
        }
        
        setBattleResults(results)
        
        // Store results in sessionStorage for the results screen
        sessionStorage.setItem('battleResults', JSON.stringify(results))

        // Show level up modal if applicable
        if (leveledUp) {
          setShowLevelUpModal(true)
        }

        // Handle unlocked achievements
        if (result.unlockedAchievements && result.unlockedAchievements.length > 0) {
          addAchievements(result.unlockedAchievements)
        }
      } else {
        console.error('❌ Failed to submit battle results')
      }
    } catch (error) {
      console.error('❌ Error submitting battle results:', error)
    } finally {
      setIsSubmittingResults(false)
      setBattleComplete(true)
    }
  }, [score, questions, userAnswers, topic, difficulty, sessionId])

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setTextAnswer("")
      setShowResult(false)
      setCurrentAnswerIsCorrect(null)
      // Set different timer based on question type
      const nextQuestion = questions[currentQuestion + 1]
      setTimeLeft(nextQuestion?.type === "open_ended" ? 60 : 30)
    } else {
      handleBattleComplete()
    }
  }, [currentQuestion, questions, handleBattleComplete])

  const getScoreColor = useMemo(() => {
    if (scorePercentage >= 80) return "text-chart-3"
    if (scorePercentage >= 60) return "text-primary"
    return "text-destructive"
  }, [scorePercentage])

  // Loading state
  if (isLoading) {
    return <BrainBattleLoading message="Loading your quiz battle..." />
  }

  // Error state
  if (hasError || questions.length === 0) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg text-center">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 border-2 border-red-400">
              <Zap className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-white mb-4">
              No Quiz Available
            </h1>
            <p className="text-blue-100/70 font-bold mb-6">
              No quiz questions were found. Please go back and generate a quiz first.
            </p>
            <div className="space-y-4">
              <Link href="/singleplayer">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400">
                  <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
                  Generate New Quiz
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full h-12 font-black border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70">
                  <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (battleComplete) {
    return (
      <BattleResultsScreen 
        score={score}
        totalQuestions={questions.length}
        topic={topic}
        userAnswers={userAnswers}
        questions={questions}
        sessionId={sessionId}
        onRetakeBattle={() => window.location.href = '/singleplayer'}
        onBackToDashboard={() => window.location.href = '/dashboard'}
        documentId={typeof window !== 'undefined' ? sessionStorage.getItem('documentId') : null}
        difficulty={difficulty}
        educationLevel={typeof window !== 'undefined' ? sessionStorage.getItem('educationLevel') || 'university' : 'university'}
        contentFocus={typeof window !== 'undefined' ? sessionStorage.getItem('contentFocus') || 'both' : 'both'}
        includeDiagrams={typeof window !== 'undefined' ? sessionStorage.getItem('includeDiagrams') !== 'false' : true}
      />
    )
  }

  // Guard clause to prevent rendering when question is not available
  if (!question) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg text-center">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 border-2 border-blue-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Loading Quiz...</h2>
            <p className="text-blue-100/70 font-bold">Preparing your questions</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Achievement Notifications */}
      {unlockedAchievements.map((achievement, index) => (
        <AchievementNotification
          key={`${achievement.code}-${index}`}
          achievement={achievement}
          onClose={() => dismissAchievement(index)}
        />
      ))}

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
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

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg cartoon-border cartoon-shadow">
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow">
              <Target className="h-5 w-5 text-orange-400" strokeWidth={3} />
              <span className="text-blue-100/70 font-bold">Score:</span>
              <span className="font-black text-orange-300">{score}/{questions.length}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow">
              <Clock className="h-5 w-5 text-blue-400" strokeWidth={3} />
              <span className="font-black text-blue-300">{timeLeft}s</span>
            </div>
            {isAway && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border-4 border-yellow-400/50 cartoon-border">
                <EyeOff className="h-5 w-5 text-yellow-300" strokeWidth={3} />
                <span className="font-black text-yellow-300">Away</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <QuizProgressBar
          currentQuestion={currentQuestion}
          totalQuestions={questions.length}
          score={score}
          timeLeft={timeLeft}
          topic={topic}
          isAway={isAway}
          streak={0} // Singleplayer doesn't track streaks yet
        />

        {/* Question Card */}
        <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-black text-white leading-relaxed">
                {question.question || question.q}
              </h2>
              <Badge className={`cartoon-border font-black border-4 ${
                question.type === "open_ended" 
                  ? "bg-blue-500/20 text-blue-300 border-blue-400/50" 
                  : "bg-orange-500/20 text-orange-300 border-orange-400/50"
              }`}>
                {question.type === "open_ended" ? "Open Answer" : "Multiple Choice"}
              </Badge>
            </div>
            
            {/* Show source document if available */}
            {question.source_document && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/20 border-4 border-blue-400/50 cartoon-border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" strokeWidth={3} />
                  <span className="text-sm text-blue-100/70 font-bold">Based on:</span>
                  <span className="text-sm text-white font-black">{question.source_document}</span>
                </div>
              </div>
            )}
            
            {/* Display image if question requires it */}
            {(question.requires_image || question.image_data_b64 || question.image_reference) && (
              <div className="mb-6 p-4 rounded-xl bg-card cartoon-border cartoon-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="h-5 w-5 text-primary" strokeWidth={3} />
                  <span className="text-sm font-black text-foreground">
                    {question.image_reference || "Reference Image"}
                  </span>
                </div>
                {question.image_data_b64 && (
                  <div className="relative w-full rounded-lg overflow-hidden cartoon-border">
                    <img
                      src={`data:image/png;base64,${question.image_data_b64}`}
                      alt={question.image_reference || "Question reference image"}
                      className="w-full h-auto max-h-96 object-contain bg-muted"
                    />
                  </div>
                )}
                {question.requires_image && !question.image_data_b64 && (
                  <div className="p-8 rounded-lg bg-muted/50 cartoon-border text-center">
                    <Image className="h-12 w-12 text-muted-foreground mx-auto mb-2" strokeWidth={2} />
                    <p className="text-sm text-muted-foreground font-bold">
                      This question references a diagram or figure from the source document.
                      {question.image_reference && ` (${question.image_reference})`}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Multiple Choice Questions */}
            {question.type === "multiple_choice" && (
              <div className="space-y-4">
                {(question.options || [question.a]).map((option: any, index: number) => {
                  let buttonClass = "w-full p-4 text-left font-bold text-lg rounded-xl cartoon-border cartoon-shadow transition-all duration-200 "
                  
                  if (showResult) {
                    const correctIndex = question.correct !== undefined ? question.correct : 0
                    const isCorrect = index === correctIndex
                    const isSelected = index === selectedAnswer
                    
                    if (isCorrect) {
                      // Correct answer - always green
                      buttonClass += "bg-green-500/20 text-green-300 border-green-400/50"
                    } else if (isSelected && !isCorrect) {
                      // Wrong selected answer - red
                      buttonClass += "bg-red-500/20 text-red-300 border-red-400/50"
                    } else {
                      // Other options - muted
                      buttonClass += "bg-slate-600/50 text-slate-300 border-slate-500/50"
                    }
                  } else {
                    // Before answer is submitted
                    if (index === selectedAnswer) {
                      // Selected but not yet submitted - show selection
                      buttonClass += "bg-blue-500/20 text-blue-300 border-blue-400/50"
                    } else {
                      buttonClass += "bg-slate-700/50 hover:bg-slate-600/50 hover:border-blue-400/50 text-white border-slate-600/50"
                    }
                  }
                  
                  return (
                    <button
                      key={index}
                      onClick={() => !showResult && handleAnswer(index)}
                      disabled={showResult}
                      className={buttonClass}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black border-2 ${
                          showResult && index === (question.correct !== undefined ? question.correct : 0)
                            ? "bg-green-500 text-white border-green-400"
                            : showResult && index === selectedAnswer && index !== (question.correct !== undefined ? question.correct : 0)
                            ? "bg-red-500 text-white border-red-400"
                            : index === selectedAnswer && !showResult
                            ? "bg-blue-500 text-white border-blue-400"
                            : "bg-slate-600 text-slate-300 border-slate-500"
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

            {/* Open-ended Questions */}
            {question.type === "open_ended" && (
              <div className="space-y-4">
                {/* Answer hints */}
                {question.hints && question.hints.length > 0 && (
                  <div className="p-4 rounded-xl bg-secondary/30 cartoon-border">
                    <h4 className="font-black text-foreground mb-2">💡 Hints:</h4>
                    <ul className="space-y-1">
                      {question.hints.map((hint: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground font-bold">
                          • {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Answer format info */}
                {question.answer_format && (
                  <div className="p-3 rounded-lg bg-primary/10 cartoon-border">
                    <p className="text-sm text-primary font-bold">
                      📝 Answer format: {question.answer_format === "number" ? "Enter a number" : "Enter your answer"}
                    </p>
                  </div>
                )}

                {/* Text input */}
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
            <div className={`p-6 rounded-xl border-4 cartoon-border mb-6 ${
              currentAnswerIsCorrect === true
                ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/50"
                : currentAnswerIsCorrect === false
                ? "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-400/50"
                : "bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/50"
            }`}>
              <div className="mb-3">
                {currentAnswerIsCorrect === false ? (
                  <div>
                    <h3 className="font-black text-white mb-1">❌ Your Answer Was Incorrect</h3>
                    <p className="text-white/70 font-bold text-sm mb-2">Explanation:</p>
                  </div>
                ) : currentAnswerIsCorrect === true ? (
                  <div>
                    <h3 className="font-black text-white mb-1">✅ Your Answer Was Correct</h3>
                    <p className="text-white/70 font-bold text-sm mb-2">Explanation:</p>
                  </div>
                ) : (
                  <h3 className="font-black text-white mb-2">Explanation:</h3>
                )}
              </div>
              {/* Explanation - make it slimmer and prevent overflow */}
              <div className="mb-3 max-w-full overflow-hidden">
                <p className="text-white font-bold leading-relaxed break-words whitespace-normal max-w-full text-sm">
                  {question.explanation || question.a}
                </p>
              </div>
              
              {/* Always show correct answers for open-ended questions */}
              {question.type === "open_ended" && (
                <div className="mt-3 p-3 rounded-lg bg-chart-3/10 border-2 border-chart-3/30 max-w-full overflow-hidden">
                  <h4 className="font-black text-chart-3 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-chart-3" strokeWidth={3} />
                    Correct Answer(s):
                  </h4>
                  {question.expected_answers && question.expected_answers.length > 0 ? (
                    <div className="space-y-3">
                      {question.expected_answers.map((answer: string, index: number) => {
                        // Check if answer contains multi-part indicators (a), (b), (c) or a), b), c)
                        const parts = answer.split(/(?=\([a-z]\)|^[a-z]\))/i).filter(p => p.trim())
                        
                        if (parts.length > 1) {
                          // Multi-part answer - display each part separately with spacing
                          return (
                            <div key={index} className="space-y-2">
                              {parts.map((part: string, partIndex: number) => (
                                <div key={partIndex} className="p-3 rounded-lg border-2 border-chart-3/40 bg-chart-3/20 text-foreground break-words whitespace-normal">
                                  <p className="font-bold text-sm leading-relaxed">{part.trim()}</p>
                                </div>
                              ))}
                            </div>
                          )
                        } else {
                          // Single answer or no clear parts - check for inline (a), (b), (c) patterns
                          const inlineParts = answer.match(/(\([a-z]\)[^\(]*?)(?=\([a-z]\)|$)/gi)
                          
                          if (inlineParts && inlineParts.length > 1) {
                            return (
                              <div key={index} className="space-y-2">
                                {inlineParts.map((part, partIndex) => (
                                  <div key={partIndex} className="p-3 rounded-lg border-2 border-chart-3/40 bg-chart-3/20 text-foreground break-words whitespace-normal">
                                    <p className="font-bold text-sm leading-relaxed">{part.trim()}</p>
                                  </div>
                                ))}
                              </div>
                            )
                          } else {
                            // Single answer - display normally
                            return (
                              <div key={index} className="p-3 rounded-lg border-2 border-chart-3/40 bg-chart-3/20 text-foreground break-words whitespace-normal">
                                <p className="font-bold text-sm leading-relaxed">{answer}</p>
                              </div>
                            )
                          }
                        }
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground font-bold break-words whitespace-normal max-w-full">
                      {(() => {
                        const answerText = question.answer || question.a || "See explanation above for the correct answer"
                        // Check if answer contains multi-part indicators
                        const parts = answerText.match(/(\([a-z]\)[^\(]*?)(?=\([a-z]\)|$)/gi)
                        
                        if (parts && parts.length > 1) {
                          return (
                            <div className="space-y-2">
                              {parts.map((part: string, partIndex: number) => (
                                <div key={partIndex} className="p-3 rounded-lg border-2 border-chart-3/40 bg-chart-3/20 text-foreground break-words whitespace-normal">
                                  <p className="font-bold text-sm leading-relaxed">{part.trim()}</p>
                                </div>
                              ))}
                            </div>
                          )
                        } else {
                          return answerText
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showResult && (
            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg px-8 py-3 cartoon-border cartoon-shadow cartoon-hover"
              >
                {!isLastQuestion ? "Next Question" : "Finish Quiz"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <RewardToast show={showRewardToast} message={rewardMessage} />
    </div>
    </>
  )
}

interface BattleResultsScreenProps {
  score: number
  totalQuestions: number
  topic: string
  userAnswers: (number | string)[]
  questions: any[]
  sessionId: string
  onRetakeBattle: () => void
  onBackToDashboard: () => void
  documentId: string | null
  difficulty: string
  educationLevel: string
  contentFocus: string
  includeDiagrams: boolean
}

function BattleResultsScreen({ 
  score, 
  totalQuestions, 
  topic, 
  userAnswers, 
  questions, 
  sessionId,
  onRetakeBattle,
  onBackToDashboard,
  documentId,
  difficulty,
  educationLevel,
  contentFocus,
  includeDiagrams
}: BattleResultsScreenProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [battleResults, setBattleResults] = useState<{
    xpEarned: number
    oldXP: number
    newXP: number
    xpBreakdown: string[]
    leveledUp: boolean
  } | null>(null)
  const { playWin, playLose, playDraw } = useFeedback()
  const didPlayRef = useRef(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch("/api/user-stats")
        if (response.ok) {
          const data = await response.json()
          setUserProfile({
            profile: data.profile,
            stats: data.stats,
          })
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }

    fetchUserProfile()
    
    // Check if we have battle results from sessionStorage
    const storedResults = sessionStorage.getItem('battleResults')
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults)
        setBattleResults(results)
        if (results.leveledUp) {
          setShowLevelUpModal(true)
        }
      } catch (error) {
        console.error('Error parsing stored battle results:', error)
      }
    }
  }, [])


  const accuracy = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0
  const rank = userProfile ? getRankFromXP(userProfile.stats?.xp || 0) : null

  // Play a single jingle based on outcome
  useEffect(() => {
    if (didPlayRef.current) return
    if (accuracy >= 80) {
      playWin()
      didPlayRef.current = true
    } else if (accuracy >= 60) {
      playDraw()
      didPlayRef.current = true
    } else {
      playLose()
      didPlayRef.current = true
    }
  }, [accuracy, playWin, playDraw, playLose])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Level Up Modal */}
        {battleResults && (
          <LevelUpModal
            isOpen={showLevelUpModal}
            onClose={() => setShowLevelUpModal(false)}
            oldXP={battleResults.oldXP}
            newXP={battleResults.newXP}
            xpEarned={battleResults.xpEarned}
          />
        )}

        {/* Back to Dashboard Button - Top of Screen */}
        <div className="mb-6">
          <Button 
            onClick={onBackToDashboard}
            className="font-black border-4 border-orange-400/50 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 cartoon-border cartoon-shadow"
          >
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
            Back to Dashboard
          </Button>
        </div>

        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-6 border-4 border-orange-400/50 cartoon-border cartoon-shadow">
            <Trophy className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          
          <h1 className="text-4xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Quiz Complete!
          </h1>
          
          <div className="mb-6">
            <p className="text-6xl font-black mb-2 text-orange-400">
              {score}/{totalQuestions}
            </p>
            <p className="text-2xl font-black text-white mb-2">
              {accuracy.toFixed(1)}% Correct
            </p>
            <p className="text-lg text-blue-100/70 font-bold mb-4">Topic: {topic}</p>
            <Badge className={`cartoon-border font-black text-lg px-4 py-2 border-4 ${
              accuracy >= 80
                ? "bg-orange-500/20 text-orange-300 border-orange-400/50"
                : accuracy >= 60
                ? "bg-blue-500/20 text-blue-300 border-blue-400/50"
                : "bg-red-500/20 text-red-300 border-red-400/50"
            }`}>
              {accuracy >= 80
                ? "Excellent!"
                : accuracy >= 60
                ? "Good Job!"
                : "Keep Studying!"}
            </Badge>
          </div>
        </div>

        {/* XP Earned Section */}
        {battleResults && (
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="h-6 w-6 text-orange-400" strokeWidth={3} />
                <h3 className="text-2xl font-black text-white">XP Earned</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-orange-500/20 rounded-xl border-4 border-orange-400/50 cartoon-border">
                  <div className="text-3xl font-black text-orange-300 mb-2">
                    +{battleResults.xpEarned}
                  </div>
                  <div className="text-sm text-blue-100/70 font-bold">XP Earned</div>
                </div>
                
                <div className="p-4 bg-blue-500/20 rounded-xl border-4 border-blue-400/50 cartoon-border">
                  <div className="text-3xl font-black text-blue-300 mb-2">
                    {battleResults.oldXP}
                  </div>
                  <div className="text-sm text-blue-100/70 font-bold">Previous XP</div>
                </div>
                
                <div className="p-4 bg-orange-500/20 rounded-xl border-4 border-orange-400/50 cartoon-border">
                  <div className="text-3xl font-black text-orange-300 mb-2">
                    {battleResults.newXP}
                  </div>
                  <div className="text-sm text-blue-100/70 font-bold">Total XP</div>
                </div>
              </div>

              {/* XP Breakdown */}
              {battleResults.xpBreakdown && battleResults.xpBreakdown.length > 0 && (
                <div className="bg-slate-700/50 rounded-xl p-4 border-4 border-slate-600/50 cartoon-border">
                  <h4 className="font-black text-white mb-3">XP Breakdown:</h4>
                  <div className="space-y-2">
                    {battleResults.xpBreakdown.map((explanation, index) => (
                      <div key={index} className="text-sm text-blue-100/70 font-bold">
                        • {explanation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {battleResults.leveledUp && (
                <div className="mt-4 p-3 bg-orange-500/20 border-4 border-orange-400/50 rounded-xl cartoon-border">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-orange-400" strokeWidth={3} />
                    <span className="font-black text-orange-300">Level Up!</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* User Stats and XP Progress */}
        {userProfile && (
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Stats */}
              <div>
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  {rank && getRankIcon(rank, "h-5 w-5")}
                  Your Progress
                </h3>
                <div className="space-y-3 text-white">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Current Level:</span>
                    <span className="font-black text-orange-200">Level {userProfile.stats?.level || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Total XP:</span>
                    <span className="font-black text-orange-200">{formatXP(userProfile.stats?.xp || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Total Wins:</span>
                    <span className="font-black text-orange-200">{userProfile.stats?.total_wins || 0}</span>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              <div>
                <h3 className="text-lg font-black text-white mb-4">XP Progress</h3>
                <XPProgressBar xp={userProfile.stats?.xp || 0} />
              </div>
            </div>
          </Card>
        )}

        {/* Question Review */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow mb-8">
          <h3 className="text-lg font-black text-white mb-4">Question Review</h3>
          <div className="space-y-4">
            {questions.map((question, index) => {
              const rawUserAnswer = userAnswers[index]
              
              // Derive display user answer
              let userAnswerText = ""
              if (question.type === "multiple_choice") {
                const answerIndex = typeof rawUserAnswer === 'number' ? rawUserAnswer : parseInt(rawUserAnswer as string)
                if (question.options && typeof answerIndex === 'number' && answerIndex >= 0 && answerIndex < question.options.length) {
                  userAnswerText = question.options[answerIndex]
                } else if (!Number.isNaN(answerIndex)) {
                  userAnswerText = `Option ${String.fromCharCode(65 + (answerIndex || 0))}`
                } else {
                  userAnswerText = "No answer provided"
                }
              } else {
                userAnswerText = (rawUserAnswer as string) || "No answer provided"
              }
              
              // Compute correctness via unified evaluator
              const coercedUserAnswer = question.type === "multiple_choice"
                ? (typeof rawUserAnswer === 'number' ? rawUserAnswer : parseInt(rawUserAnswer as string))
                : (typeof rawUserAnswer === 'string' ? rawUserAnswer : String(rawUserAnswer ?? ""))
              
              // Use quiz evaluator for initial check
              const fuzzyIsCorrect = isAnswerCorrect(question, coercedUserAnswer as any)
              
              // For open-ended questions, we'll use the stored is_correct from the database
              // since LLM evaluation happens server-side. For now, use fuzzy matching.
              // The server-side evaluation in quiz-results route will have the final say.
              let isCorrect = fuzzyIsCorrect
              
              // If fuzzy matching failed for open-ended, we could try LLM evaluation here
              // but to avoid extra API calls, we'll trust the server-side evaluation
              // The results screen should ideally use the stored is_correct value
              // For now, we'll use fuzzy matching as a fallback
              
              // Get correct answer text
              let correctAnswerText = ""
              if (question.type === "multiple_choice") {
                const correctIndex = question.correct !== undefined ? question.correct : 0
                if (question.options && correctIndex >= 0 && correctIndex < question.options.length) {
                  correctAnswerText = question.options[correctIndex]
                } else {
                  correctAnswerText = question.a || `Option ${String.fromCharCode(65 + correctIndex)}`
                }
              } else {
                if (question.expected_answers && question.expected_answers.length > 0) {
                  correctAnswerText = question.expected_answers.join(", ")
                } else {
                  correctAnswerText = question.answer || question.a || "See explanation"
                }
              }
              
              return (
                <div key={index} className={`p-4 rounded-xl border-4 ${
                  isCorrect 
                    ? "bg-green-500/20 border-green-400/50" 
                    : "bg-red-500/20 border-red-400/50"
                } cartoon-border`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black border-2 ${
                      isCorrect ? "bg-green-500 text-white border-green-400" : "bg-red-500 text-white border-red-400"
                    }`}>
                      {isCorrect ? "✓" : "✗"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white mb-2">
                        {question.question || question.q}
                      </p>
                      <div className="text-sm space-y-2">
                        <div className={`p-3 rounded-lg border-2 ${
                          isCorrect 
                            ? "bg-green-500/20 border-green-400/50" 
                            : "bg-red-500/20 border-red-400/50"
                        }`}>
                          <p className={`font-bold ${
                            isCorrect ? "text-green-300" : "text-red-300"
                          }`}>
                            <strong className={isCorrect ? "text-green-200" : "text-red-200"}>Your answer:</strong> <span className={isCorrect ? "text-green-100" : "text-red-100"}>{userAnswerText}</span>
                          </p>
                        </div>
                        <div className="text-blue-100/70">
                          <strong className="text-white">Correct answer:</strong>
                          {(() => {
                            // Check if answer contains multi-part indicators
                            const correctAnswerParts = correctAnswerText.match(/(\([a-z]\)[^\(]*?)(?=\([a-z]\)|$)/gi)
                            
                            if (correctAnswerParts && correctAnswerParts.length > 1) {
                              return (
                                <div className="mt-2 space-y-2">
                                  {correctAnswerParts.map((part: string, partIndex: number) => (
                                    <div key={partIndex} className="p-2 rounded-lg border-2 border-green-400/30 bg-green-500/10 break-words whitespace-normal">
                                      <span className="font-bold text-white text-sm leading-relaxed">{part.trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            } else {
                              return (
                                <div className="mt-1 p-2 rounded-lg border-2 border-green-400/30 bg-green-500/10 break-words whitespace-normal">
                                  <span className="font-bold text-white text-sm leading-relaxed">{correctAnswerText}</span>
                                </div>
                              )
                            }
                          })()}
                        </div>
                        {(question.explanation || question.answer) && (
                          <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border-2 border-blue-400/30 max-w-full overflow-hidden">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" strokeWidth={3} />
                              <div className="flex-1 min-w-0">
                                <p className="text-blue-300 font-black text-xs mb-1">Explanation:</p>
                                <p className="text-blue-100/90 font-bold text-sm leading-relaxed break-words whitespace-normal max-w-full">
                                  {question.explanation || question.answer || "This is the correct answer based on the study material."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          {documentId && (
            <Button 
              onClick={async () => {
                // Redo quiz with same document, focusing on wrong answers
                try {
                  const formData = new FormData()
                  formData.append('topic', topic)
                  formData.append('difficulty', difficulty)
                  formData.append('educationLevel', educationLevel)
                  formData.append('totalQuestions', totalQuestions.toString())
                  formData.append('contentFocus', contentFocus)
                  formData.append('includeDiagrams', includeDiagrams.toString())
                  formData.append('documentId', documentId)
                  formData.append('isRedo', 'true')
                  
                  // Get notes from sessionStorage if available
                  const storedNotes = sessionStorage.getItem('studyNotes')
                  if (storedNotes) {
                    formData.append('notes', storedNotes)
                  }
                  
                  const response = await fetch('/api/generate-quiz', {
                    method: 'POST',
                    body: formData
                  })
                  
                  const result = await response.json()
                  
                  if (result.success) {
                    const newSessionId = crypto.randomUUID()
                    sessionStorage.setItem('quizQuestions', JSON.stringify(result.questions))
                    sessionStorage.setItem('quizTopic', topic)
                    sessionStorage.setItem('quizDifficulty', difficulty)
                    sessionStorage.setItem('quizSessionId', newSessionId)
                    sessionStorage.setItem('documentId', documentId)
                    sessionStorage.setItem('educationLevel', educationLevel)
                    sessionStorage.setItem('contentFocus', contentFocus)
                    sessionStorage.setItem('includeDiagrams', includeDiagrams.toString())
                    
                    window.location.href = `/singleplayer/battle/${newSessionId}`
                  } else {
                    alert(`Error generating quiz: ${result.error || 'Unknown error'}`)
                  }
                } catch (error) {
                  console.error('Error redoing quiz:', error)
                  alert('Failed to generate quiz. Please try again.')
                }
              }}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-4 border-blue-400/50 cartoon-border cartoon-shadow cartoon-hover"
            >
              <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
              Redo Quiz (Focus on Wrong Answers)
            </Button>
          )}
          <Button 
            onClick={onRetakeBattle}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-lg border-4 border-orange-400/50 cartoon-border cartoon-shadow cartoon-hover"
          >
            <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
            {documentId ? 'Take New Quiz' : 'Take Another Quiz'}
          </Button>
        </div>
      </div>
    </div>
  )
}

