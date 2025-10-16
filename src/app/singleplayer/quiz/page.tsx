"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Target, Trophy, Zap } from "lucide-react"
import Link from "next/link"

// Default empty questions - will be loaded from sessionStorage
const defaultQuestions: any[] = []

export default function QuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [quizComplete, setQuizComplete] = useState(false)
  const [questions, setQuestions] = useState(defaultQuestions)
  const [topic, setTopic] = useState("General Knowledge")
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [userAnswers, setUserAnswers] = useState<(number | string)[]>([])

  // Load questions from sessionStorage on component mount
  useEffect(() => {
    const storedQuestions = sessionStorage.getItem('quizQuestions')
    const storedTopic = sessionStorage.getItem('quizTopic')
    
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
  }, [])

  const question = questions[currentQuestion]

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !showResult && !quizComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      // Handle time's up based on question type
      if (question.type === "open_ended") {
        // For open-ended questions, just show result without submitting
        setShowResult(true)
      } else {
        handleAnswer(-1) // Time's up for multiple choice
      }
    }
  }, [timeLeft, showResult, quizComplete, question.type])

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    setShowResult(true)
    
    const correctAnswer = question.correct !== undefined ? question.correct : 0
    const isCorrect = answerIndex === correctAnswer
    if (isCorrect) {
      setScore(score + 1)
    }
    
    // Store user answer
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestion] = answerIndex
    setUserAnswers(newAnswers)
  }

  const handleTextAnswer = () => {
    if (!textAnswer.trim()) return
    
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
      setScore(score + 1)
    }
    
    // Store user answer
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestion] = textAnswer.trim()
    setUserAnswers(newAnswers)
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setTextAnswer("")
      setShowResult(false)
      // Set different timer based on question type
      const nextQuestion = questions[currentQuestion + 1]
      setTimeLeft(nextQuestion?.type === "open_ended" ? 60 : 30)
    } else {
      setQuizComplete(true)
    }
  }

  const getScoreColor = () => {
    const percentage = (score / questions.length) * 100
    if (percentage >= 80) return "text-chart-3"
    if (percentage >= 60) return "text-primary"
    return "text-destructive"
  }

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

  if (quizComplete) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 bg-card cartoon-border cartoon-shadow text-center">
            <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-6 cartoon-border cartoon-shadow">
              <Trophy className="w-10 h-10 text-primary-foreground" strokeWidth={3} />
            </div>
            
            <h1 className="text-4xl font-black text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Quiz Complete!
            </h1>
            
            <div className="mb-8">
              <p className="text-6xl font-black mb-2" style={{ color: "var(--primary)" }}>
                {score}/{questions.length}
              </p>
              <p className="text-2xl font-black text-foreground mb-2">
                {Math.round((score / questions.length) * 100)}% Correct
              </p>
              <p className="text-lg text-muted-foreground font-bold mb-4">Topic: {topic}</p>
              <Badge className={`cartoon-border font-black text-lg px-4 py-2 ${
                score >= questions.length * 0.8
                  ? "bg-chart-3 text-foreground"
                  : score >= questions.length * 0.6
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}>
                {score >= questions.length * 0.8
                  ? "Excellent!"
                  : score >= questions.length * 0.6
                  ? "Good Job!"
                  : "Keep Studying!"}
              </Badge>
            </div>

            <div className="space-y-4">
              <Link href="/singleplayer">
                <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover">
                  <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
                  Take Another Quiz
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
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
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-muted-foreground mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full cartoon-border">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

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
                {(question.options || [question.a]).map((option, index) => {
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
                {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
