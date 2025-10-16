"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle,
  Users
} from 'lucide-react'

interface StudyTimerProps {
  duration: number // in minutes
  isHost: boolean
  isActive: boolean
  isPaused: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onComplete: () => void
  memberCount: number
}

export default function StudyTimer({
  duration,
  isHost,
  isActive,
  isPaused,
  onStart,
  onPause,
  onResume,
  onReset,
  onComplete,
  memberCount
}: StudyTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60) // in seconds
  const [isRunning, setIsRunning] = useState(false)

  // Update timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            onComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeRemaining, onComplete])

  // Reset timer when duration changes
  useEffect(() => {
    setTimeRemaining(duration * 60)
  }, [duration])

  // Handle play/pause state
  useEffect(() => {
    if (isActive && !isPaused) {
      setIsRunning(true)
    } else {
      setIsRunning(false)
    }
  }, [isActive, isPaused])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = () => {
    const totalSeconds = duration * 60
    return ((totalSeconds - timeRemaining) / totalSeconds) * 100
  }

  const getTimeColor = () => {
    const progress = getProgress()
    if (progress >= 90) return 'text-destructive'
    if (progress >= 75) return 'text-primary'
    return 'text-chart-3'
  }

  const getStatusColor = () => {
    if (!isActive) return 'bg-muted text-muted-foreground'
    if (isPaused) return 'bg-primary text-primary-foreground'
    if (timeRemaining <= 60) return 'bg-destructive text-destructive-foreground'
    return 'bg-chart-3 text-foreground'
  }

  const getStatusText = () => {
    if (!isActive) return 'Not Started'
    if (isPaused) return 'Paused'
    if (timeRemaining <= 0) return 'Completed'
    if (timeRemaining <= 60) return 'Almost Done!'
    return 'In Progress'
  }

  const handleStart = () => {
    onStart()
    setIsRunning(true)
  }

  const handlePause = () => {
    onPause()
    setIsRunning(false)
  }

  const handleResume = () => {
    onResume()
    setIsRunning(true)
  }

  const handleReset = () => {
    onReset()
    setTimeRemaining(duration * 60)
    setIsRunning(false)
  }

  return (
    <Card className="p-6 bg-card cartoon-border cartoon-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center cartoon-border cartoon-shadow">
            <Clock className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground">Study Timer</h3>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-muted-foreground" strokeWidth={3} />
              <span className="text-sm text-muted-foreground font-bold">{memberCount} members</span>
            </div>
          </div>
        </div>
        
        <Badge className={`cartoon-border font-black ${getStatusColor()}`}>
          {getStatusText()}
        </Badge>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className={`text-6xl font-black mb-2 ${getTimeColor()}`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="text-lg text-muted-foreground font-bold">
          {timeRemaining > 0 ? 'Time Remaining' : 'Session Complete!'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm font-bold text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.round(getProgress())}%</span>
        </div>
        <Progress value={getProgress()} className="h-3 cartoon-border" />
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {!isActive ? (
          <div className="text-center">
            <p className="text-muted-foreground font-bold mb-4">
              {isHost ? 'Ready to start the study session?' : 'Waiting for host to start...'}
            </p>
            {isHost && (
              <Button
                onClick={handleStart}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
              >
                <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                Start Study Session
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            {isHost && (
              <>
                {isPaused ? (
                  <Button
                    onClick={handleResume}
                    className="flex-1 h-12 bg-chart-3 hover:bg-chart-3/90 text-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
                  >
                    <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={handlePause}
                    variant="outline"
                    className="flex-1 h-12 cartoon-border cartoon-shadow"
                  >
                    <Pause className="h-5 w-5 mr-2" strokeWidth={3} />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 h-12 cartoon-border cartoon-shadow"
                >
                  <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} />
                  Reset
                </Button>
              </>
            )}
          </div>
        )}

        {/* Time Warnings */}
        {isActive && timeRemaining > 0 && (
          <div className="space-y-2">
            {timeRemaining <= 300 && timeRemaining > 60 && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 cartoon-border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" strokeWidth={3} />
                  <span className="text-sm text-primary font-bold">
                    5 minutes remaining!
                  </span>
                </div>
              </div>
            )}
            
            {timeRemaining <= 60 && timeRemaining > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 cartoon-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={3} />
                  <span className="text-sm text-destructive font-bold">
                    Less than 1 minute remaining!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion Message */}
        {timeRemaining === 0 && isActive && (
          <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20 cartoon-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-chart-3" strokeWidth={3} />
              <span className="font-black text-chart-3">Study Session Complete!</span>
            </div>
            <p className="text-sm text-muted-foreground font-bold">
              Great job! You've completed the study session. Ready for the quiz?
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
