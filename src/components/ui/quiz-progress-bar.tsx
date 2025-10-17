"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, Zap, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"

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
  const timeColor = timeLeft <= 10 ? "text-destructive" : timeLeft <= 20 ? "text-orange-500" : "text-primary"

  return (
    <Card className="p-4 bg-card cartoon-border cartoon-shadow mb-6">
      {/* Main Progress Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" strokeWidth={3} />
            <span className="text-sm font-bold text-muted-foreground">Progress</span>
          </div>
          <Badge className="cartoon-border bg-primary text-primary-foreground font-black">
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
              <Zap className="h-5 w-5 text-chart-3" strokeWidth={3} />
              <span className="text-sm font-bold text-chart-3">Streak: {streak}</span>
            </div>
          )}
          {isAway && (
            <Badge className="cartoon-border bg-yellow-100 text-yellow-700 border-yellow-300">
              <TrendingUp className="h-3 w-3 mr-1" strokeWidth={3} />
              Away
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm font-bold text-muted-foreground mb-2">
          <span>Quiz Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress 
          value={progress} 
          className="h-3 bg-muted cartoon-border" 
          indicatorClassName="bg-primary transition-all duration-300"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="h-4 w-4 text-primary" strokeWidth={3} />
            <span className="text-xs font-bold text-muted-foreground">Score</span>
          </div>
          <p className="text-lg font-black text-primary">{score}/{currentQuestion}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="h-4 w-4 text-secondary" strokeWidth={3} />
            <span className="text-xs font-bold text-muted-foreground">Accuracy</span>
          </div>
          <p className="text-lg font-black text-secondary">{accuracy.toFixed(0)}%</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="h-4 w-4 text-accent" strokeWidth={3} />
            <span className="text-xs font-bold text-muted-foreground">Topic</span>
          </div>
          <p className="text-sm font-black text-accent truncate">{topic}</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="h-4 w-4 text-chart-3" strokeWidth={3} />
            <span className="text-xs font-bold text-muted-foreground">Remaining</span>
          </div>
          <p className="text-lg font-black text-chart-3">{totalQuestions - currentQuestion - 1}</p>
        </div>
      </div>

      {/* Mini Progress Indicators */}
      <div className="flex justify-center gap-1 mt-4">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index < currentQuestion 
                ? "bg-primary" 
                : index === currentQuestion 
                ? "bg-primary animate-pulse" 
                : "bg-muted"
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
  const timeColor = timeLeft <= 10 ? "text-destructive" : timeLeft <= 20 ? "text-orange-500" : "text-primary"

  return (
    <div className="flex items-center justify-between p-3 bg-card cartoon-border cartoon-shadow rounded-xl mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" strokeWidth={3} />
          <span className="text-sm font-bold text-primary">{currentQuestion + 1}/{totalQuestions}</span>
        </div>
        <div className="w-20 h-2 bg-muted rounded-full cartoon-border">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-muted-foreground">Score:</span>
          <span className="text-sm font-black text-primary">{score}/{currentQuestion}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className={`h-4 w-4 ${timeColor}`} strokeWidth={3} />
          <span className={`text-sm font-black ${timeColor}`}>{timeLeft}s</span>
        </div>
        {isAway && (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  )
}
