"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, Zap, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useEffect, useRef } from "react"
import { useFeedback } from "@/hooks/useFeedback"

interface QuizProgressBarProps {
  currentQuestion: number
  totalQuestions: number
  score: number
  timeLeft: number
  topic: string
  isAway?: boolean
  streak?: number
}

export function QuizProgressBar({
  currentQuestion,
  totalQuestions,
  score,
  timeLeft,
  topic,
  isAway = false,
  streak = 0
}: QuizProgressBarProps) {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100
  const accuracy = currentQuestion > 0 ? (score / currentQuestion) * 100 : 0
  const timeColor = timeLeft <= 10 ? "text-red-400" : timeLeft <= 20 ? "text-orange-400" : "text-blue-400"
  const { playCountdownFinal } = useFeedback()
  const lastPlayedSecondRef = useRef<number | null>(null)

  // Play final countdown ticks at 3, 2, 1 seconds
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0) {
      if (lastPlayedSecondRef.current !== timeLeft) {
        playCountdownFinal()
        lastPlayedSecondRef.current = timeLeft
      }
    }
    if (timeLeft > 3) {
      lastPlayedSecondRef.current = null
    }
  }, [timeLeft, playCountdownFinal])

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow mb-6">
      {/* Main Progress Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-400" strokeWidth={3} />
            <span className="text-sm font-bold text-blue-100/70">Progress</span>
          </div>
          <Badge className="cartoon-border bg-orange-500/20 text-orange-300 border-orange-400/50 font-black">
            Question {currentQuestion + 1} of {totalQuestions}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${timeColor}`} strokeWidth={3} />
            <span className={`font-black text-lg ${timeColor}`}>{timeLeft}s</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" strokeWidth={3} />
              <span className="text-sm font-bold text-orange-300">Streak: {streak}</span>
            </div>
          )}
          {isAway && (
            <Badge className="cartoon-border bg-yellow-500/20 text-yellow-300 border-yellow-400/50">
              <TrendingUp className="h-3 w-3 mr-1" strokeWidth={3} />
              Away
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm font-bold text-blue-100/70 mb-2">
          <span>Quiz Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress
          value={progress}
          className="h-3 bg-slate-700/50 border-2 border-slate-600/50"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="h-4 w-4 text-orange-400" strokeWidth={3} />
            <span className="text-xs font-bold text-blue-100/70">Score</span>
          </div>
          <p className="text-lg font-black text-orange-300">{score}/{currentQuestion}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-400" strokeWidth={3} />
            <span className="text-xs font-bold text-blue-100/70">Accuracy</span>
          </div>
          <p className="text-lg font-black text-blue-300">{accuracy.toFixed(0)}%</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-4 w-4 text-orange-400" strokeWidth={3} />
            <span className="text-xs font-bold text-blue-100/70">Topic</span>
          </div>
          <p className="text-sm font-black text-orange-300 truncate">{topic}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="h-4 w-4 text-blue-400" strokeWidth={3} />
            <span className="text-xs font-bold text-blue-100/70">Remaining</span>
          </div>
          <p className="text-lg font-black text-blue-300">{totalQuestions - currentQuestion - 1}</p>
        </div>
      </div>

      {/* Mini Progress Indicators */}
      <div className="flex justify-center gap-1 mt-4">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index < currentQuestion 
                ? "bg-orange-400" 
                : index === currentQuestion 
                ? "bg-orange-400 animate-pulse" 
                : "bg-slate-600/50"
            }`}
          />
        ))}
      </div>
    </Card>
  )
}

// Compact version for smaller displays
export function CompactQuizProgressBar({
  currentQuestion,
  totalQuestions,
  score,
  timeLeft,
  isAway = false
}: Omit<QuizProgressBarProps, 'topic' | 'streak'>) {
  const progress = ((currentQuestion + 1) / totalQuestions) * 100
  const timeColor = timeLeft <= 10 ? "text-red-400" : timeLeft <= 20 ? "text-orange-400" : "text-blue-400"

  return (
    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-border cartoon-shadow rounded-xl mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-400" strokeWidth={3} />
          <span className="text-sm font-bold text-orange-300">{currentQuestion + 1}/{totalQuestions}</span>
        </div>
        <div className="w-20 h-2 bg-slate-700/50 rounded-full border border-slate-600/50">
          <div 
            className="h-full bg-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-blue-100/70">Score:</span>
          <span className="text-sm font-black text-orange-300">{score}/{currentQuestion}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className={`h-4 w-4 ${timeColor}`} strokeWidth={3} />
          <span className={`text-sm font-black ${timeColor}`}>{timeLeft}s</span>
        </div>
        {isAway && (
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  )
}
