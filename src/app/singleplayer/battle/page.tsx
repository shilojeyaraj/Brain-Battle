"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Target, Trophy, Zap, AlertTriangle, EyeOff, X, Star, TrendingUp, FileText } from "lucide-react"
import Link from "next/link"
import { useAntiCheat, CheatEvent } from "@/hooks/use-anti-cheat"
import { calculateXP, getXPExplanation, checkLevelUp } from "@/lib/xp-calculator"
import { getRankFromXP, getRankIcon, formatXP } from "@/lib/rank-system"
import { XPProgressBar } from "@/components/ui/xp-progress-bar"
import { LevelUpModal } from "@/components/ui/level-up-modal"
import { QuizProgressBar } from "@/components/ui/quiz-progress-bar"
import { getCurrentUserId } from "@/lib/auth/session"

// Default empty questions - will be loaded from sessionStorage
const defaultQuestions: any[] = []

export default function BattlePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
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
  } | null>(null)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [isSubmittingResults, setIsSubmittingResults] = useState(false)

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

  // Load questions from sessionStorage on component mount
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return
    
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
  }, [])

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
    
    setSelectedAnswer(answerIndex)
    setShowResult(true)
    
    const correctAnswer = question.correct !== undefined ? question.correct : 0
    const isCorrect = answerIndex === correctAnswer
    if (isCorrect) {
      setScore(prev => prev + 1)
    }
    
    // Store user answer
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      newAnswers[currentQuestion] = answerIndex
      return newAnswers
    })
  }, [question, currentQuestion])

  const handleTextAnswer = useCallback(() => {
    if (!question || !textAnswer.trim()) return
    
    setShowResult(true)
    
    // Check if answer is correct (case-insensitive, trimmed)
    const userAnswer = textAnswer.trim().toLowerCase()
    const expectedAnswers = question.expected_answers?.map((ans: string) => ans.toLowerCase().trim()) || []
    const isCorrect = expectedAnswers.some((expected: string) => 
      userAnswer === expected || 
      userAnswer.includes(expected) || 
      expected.includes(userAnswer)
    )
    
    if (isCorrect) {
      setScore(prev => prev + 1)
    }
    
    // Store user answer
    setUserAnswers(prev => {
      const newAnswers = [...prev]
      newAnswers[currentQuestion] = textAnswer.trim()
      return newAnswers
    })
  }, [question, textAnswer, currentQuestion])

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

      // Submit results to API
      const userId = getCurrentUserId()
      if (userId) {
        const response = await fetch('/api/quiz-results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            questions: questions,
            answers: userAnswers,
            score: score,
            totalQuestions: totalQuestions,
            correctAnswers: correctAnswers,
            duration: totalTime,
            topic: topic
          })
        })

        if (response.ok) {
          const result = await response.json()
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
            leveledUp
          }
          
          setBattleResults(results)
          
          // Store results in sessionStorage for the results screen
          sessionStorage.setItem('battleResults', JSON.stringify(results))

          // Show level up modal if applicable
          if (leveledUp) {
            setShowLevelUpModal(true)
          }
        } else {
          console.error('❌ Failed to submit battle results')
        }
      }
    } catch (error) {
      console.error('❌ Error submitting battle results:', error)
    } finally {
      setIsSubmittingResults(false)
      setBattleComplete(true)
    }
  }, [score, questions, userAnswers, topic, difficulty])

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setTextAnswer("")
      setShowResult(false)
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
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-foreground"></div>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Loading Quiz...
            </h1>
            <p className="text-muted-foreground font-bold">Preparing your questions</p>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (hasError || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-destructive flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <Zap className="w-10 h-10 text-destructive-foreground" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              No Quiz Available
            </h1>
            <p className="text-muted-foreground font-bold mb-6">
              No quiz questions were found. Please go back and generate a quiz first.
            </p>
            <div className="space-y-4">
              <Link href="/singleplayer">
                <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover">
                  <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
                  Generate New Quiz
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full h-12 font-black cartoon-border cartoon-shadow">
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
        onRetakeBattle={() => window.location.href = '/singleplayer'}
        onBackToDashboard={() => window.location.href = '/dashboard'}
      />
    )
  }

  // Guard clause to prevent rendering when question is not available
  if (!question) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-foreground"></div>
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Loading Quiz...</h2>
            <p className="text-muted-foreground font-bold">Preparing your questions</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
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
          <Link href="/singleplayer">
            <Button variant="outline" className="cartoon-border cartoon-shadow">
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
              Back to Setup
            </Button>
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card cartoon-border cartoon-shadow">
              <Target className="h-5 w-5 text-primary" strokeWidth={3} />
              <span className="text-muted-foreground font-bold">Score:</span>
              <span className="font-black text-primary">{score}/{questions.length}</span>
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
        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-black text-foreground leading-relaxed">
                {question.question || question.q}
              </h2>
              <Badge className={`cartoon-border font-black ${
                question.type === "open_ended" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "bg-primary text-primary-foreground"
              }`}>
                {question.type === "open_ended" ? "Open Answer" : "Multiple Choice"}
              </Badge>
            </div>
            
            {/* Show source document if available */}
            {question.source_document && (
              <div className="mb-4 p-3 rounded-lg bg-secondary/30 cartoon-border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-secondary" strokeWidth={3} />
                  <span className="text-sm text-muted-foreground font-bold">Based on:</span>
                  <span className="text-sm text-foreground font-black">{question.source_document}</span>
                </div>
              </div>
            )}
            
            {/* Multiple Choice Questions */}
            {question.type === "multiple_choice" && (
              <div className="space-y-4">
                {(question.options || [question.a]).map((option: any, index: number) => {
                  let buttonClass = "w-full p-4 text-left font-bold text-lg rounded-xl cartoon-border cartoon-shadow transition-all duration-200 "
                  
                  if (showResult) {
                    if (index === (question.correct !== undefined ? question.correct : 0)) {
                      buttonClass += "bg-chart-3 text-foreground border-chart-3"
                    } else if (index === selectedAnswer && index !== (question.correct !== undefined ? question.correct : 0)) {
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
                          showResult && index === (question.correct !== undefined ? question.correct : 0)
                            ? "bg-foreground text-chart-3"
                            : showResult && index === selectedAnswer && index !== (question.correct !== undefined ? question.correct : 0)
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
            <div className="p-6 rounded-xl bg-secondary/50 cartoon-border mb-6">
              <h3 className="font-black text-foreground mb-2">Explanation:</h3>
              <p className="text-muted-foreground font-bold mb-3">{question.explanation || question.a}</p>
              
              {/* Show correct answers for open-ended questions */}
              {question.type === "open_ended" && question.expected_answers && (
                <div className="mt-3 p-3 rounded-lg bg-chart-3/10 cartoon-border">
                  <h4 className="font-black text-chart-3 mb-2">✅ Correct Answer(s):</h4>
                  <div className="flex flex-wrap gap-2">
                    {question.expected_answers.map((answer: string, index: number) => (
                      <Badge key={index} className="cartoon-border bg-chart-3 text-foreground font-black">
                        {answer}
                      </Badge>
                    ))}
                  </div>
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
    </div>
  )
}

interface BattleResultsScreenProps {
  score: number
  totalQuestions: number
  topic: string
  userAnswers: (number | string)[]
  questions: any[]
  onRetakeBattle: () => void
  onBackToDashboard: () => void
}

function BattleResultsScreen({ 
  score, 
  totalQuestions, 
  topic, 
  userAnswers, 
  questions, 
  onRetakeBattle,
  onBackToDashboard
}: BattleResultsScreenProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [battleResults, setBattleResults] = useState<{
    xpEarned: number
    oldXP: number
    newXP: number
    xpBreakdown: string[]
    leveledUp: boolean
  } | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = getCurrentUserId()
        if (userId) {
          const response = await fetch(`/api/user-stats?userId=${userId}`)
          if (response.ok) {
            const data = await response.json()
            setUserProfile(data)
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setLoading(false)
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
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

        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
            <Trophy className="w-10 h-10 text-primary-foreground" strokeWidth={3} />
          </div>
          
          <h1 className="text-4xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Quiz Complete!
          </h1>
          
          <div className="mb-6">
            <p className="text-6xl font-black mb-2" style={{ color: "var(--primary)" }}>
              {score}/{totalQuestions}
            </p>
            <p className="text-2xl font-black text-foreground mb-2">
              {accuracy.toFixed(1)}% Correct
            </p>
            <p className="text-lg text-muted-foreground font-bold mb-4">Topic: {topic}</p>
            <Badge className={`cartoon-border font-black text-lg px-4 py-2 ${
              accuracy >= 80
                ? "bg-chart-3 text-foreground"
                : accuracy >= 60
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
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
          <Card className="p-6 bg-card cartoon-border cartoon-shadow mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="h-6 w-6 text-chart-3" strokeWidth={3} />
                <h3 className="text-2xl font-black text-foreground">XP Earned</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-primary/10 rounded-xl cartoon-border">
                  <div className="text-3xl font-black text-primary mb-2">
                    +{battleResults.xpEarned}
                  </div>
                  <div className="text-sm text-muted-foreground font-bold">XP Earned</div>
                </div>
                
                <div className="p-4 bg-secondary/10 rounded-xl cartoon-border">
                  <div className="text-3xl font-black text-secondary mb-2">
                    {battleResults.oldXP}
                  </div>
                  <div className="text-sm text-muted-foreground font-bold">Previous XP</div>
                </div>
                
                <div className="p-4 bg-chart-3/10 rounded-xl cartoon-border">
                  <div className="text-3xl font-black text-chart-3 mb-2">
                    {battleResults.newXP}
                  </div>
                  <div className="text-sm text-muted-foreground font-bold">Total XP</div>
                </div>
              </div>

              {/* XP Breakdown */}
              {battleResults.xpBreakdown && battleResults.xpBreakdown.length > 0 && (
                <div className="bg-secondary/20 rounded-xl p-4 cartoon-border">
                  <h4 className="font-black text-foreground mb-3">XP Breakdown:</h4>
                  <div className="space-y-2">
                    {battleResults.xpBreakdown.map((explanation, index) => (
                      <div key={index} className="text-sm text-muted-foreground font-bold">
                        • {explanation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {battleResults.leveledUp && (
                <div className="mt-4 p-3 bg-chart-3/20 border-2 border-chart-3 rounded-xl cartoon-border">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-5 w-5 text-chart-3" strokeWidth={3} />
                    <span className="font-black text-chart-3">Level Up!</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* User Stats and XP Progress */}
        {userProfile && (
          <Card className="p-6 bg-card cartoon-border cartoon-shadow mb-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Stats */}
              <div>
                <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                  {rank && getRankIcon(rank, "h-5 w-5")}
                  Your Progress
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Current Level:</span>
                    <span className="font-black text-foreground">Level {userProfile.stats?.level || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Total XP:</span>
                    <span className="font-black text-foreground">{formatXP(userProfile.stats?.xp || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Total Wins:</span>
                    <span className="font-black text-foreground">{userProfile.stats?.total_wins || 0}</span>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              <div>
                <h3 className="text-lg font-black text-foreground mb-4">XP Progress</h3>
                <XPProgressBar xp={userProfile.stats?.xp || 0} />
              </div>
            </div>
          </Card>
        )}

        {/* Question Review */}
        <Card className="p-6 bg-card cartoon-border cartoon-shadow mb-8">
          <h3 className="text-lg font-black text-foreground mb-4">Question Review</h3>
          <div className="space-y-4">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[index]
              const isCorrect = question.type === "multiple_choice" 
                ? userAnswer === (question.correct !== undefined ? question.correct : 0)
                : question.expected_answers?.some((ans: string) => 
                    ans.toLowerCase().trim() === (userAnswer as string)?.toLowerCase().trim()
                  )
              
              return (
                <div key={index} className={`p-4 rounded-xl border-2 ${
                  isCorrect 
                    ? "bg-chart-3/10 border-chart-3" 
                    : "bg-destructive/10 border-destructive"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCorrect ? "bg-chart-3 text-foreground" : "bg-destructive text-destructive-foreground"
                    }`}>
                      {isCorrect ? "✓" : "✗"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground mb-2">
                        {question.question || question.q}
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Your answer:</strong> {userAnswer}</p>
                        <p><strong>Correct answer:</strong> {
                          question.type === "multiple_choice" 
                            ? question.options?.[question.correct !== undefined ? question.correct : 0] || question.a
                            : question.expected_answers?.join(", ") || question.a
                        }</p>
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
          <Button 
            onClick={onRetakeBattle}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
          >
            <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
            Take Another Quiz
          </Button>
          <Button 
            onClick={onBackToDashboard}
            variant="outline" 
            className="w-full h-12 font-black cartoon-border cartoon-shadow"
          >
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
