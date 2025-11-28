"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Trophy, Calendar, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { DailyStreakFlame } from "./daily-streak-flame"
import { StreakNotification } from "./streak-notification"

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  isActiveToday: boolean
  daysUntilBreak: number
}

interface StreakDisplayProps {
  tutorialStep?: number
  totalTutorialSteps?: number
}

export function StreakDisplay({ tutorialStep, totalTutorialSteps }: StreakDisplayProps = {}) {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTutorialActive, setIsTutorialActive] = useState(false)
  const [showTutorialAnimation, setShowTutorialAnimation] = useState(false)
  const [animatedStreak, setAnimatedStreak] = useState(0)
  
  // Track previous streak for change detection
  const previousStreakRef = useRef<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showNotification, setShowNotification] = useState<{
    type: "increased" | "lost"
    newStreak: number
    previousStreak: number
  } | null>(null)

  // Fetch streak data
  const fetchStreak = async () => {
    try {
      const response = await fetch('/api/user/streak')
      if (response.ok) {
        const data = await response.json()
        const newStreak = data.currentStreak || 0
        const prevStreak = previousStreakRef.current

        // Detect streak changes
        if (prevStreak !== null && prevStreak !== newStreak) {
          if (newStreak > prevStreak) {
            // Streak increased
            setIsAnimating(true)
            setShowNotification({
              type: "increased",
              newStreak,
              previousStreak: prevStreak,
            })
            setTimeout(() => setIsAnimating(false), 600)
          } else if (newStreak < prevStreak && prevStreak > 0) {
            // Streak lost
            setIsAnimating(true)
            setShowNotification({
              type: "lost",
              newStreak,
              previousStreak: prevStreak,
            })
            setTimeout(() => setIsAnimating(false), 600)
          }
        }

        previousStreakRef.current = newStreak
        setStreak(data)
      }
    } catch (error) {
      console.error('Error fetching streak:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check streak on mount (when dashboard loads / user logs in)
    fetchStreak()
    
    // Refresh every 5 minutes to keep streak updated
    const interval = setInterval(fetchStreak, 5 * 60 * 1000)
    
    // Listen for login/auth events to refresh streak
    const handleAuthChange = () => {
      // Wait a bit for the backend to process any updates
      setTimeout(() => {
        fetchStreak()
      }, 500)
    }
    
    // Listen for custom login event (if dispatched from auth flow)
    window.addEventListener('userLoggedIn', handleAuthChange)
    window.addEventListener('authStateChanged', handleAuthChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('userLoggedIn', handleAuthChange)
      window.removeEventListener('authStateChanged', handleAuthChange)
    }
  }, [])

  // Check tutorial status
  useEffect(() => {
    const checkTutorial = () => {
      const tutorialCompleted = localStorage.getItem('dashboard_tutorial_completed')
      const isNewUser = window.location.search.includes('newUser=true')
      setIsTutorialActive(!tutorialCompleted || isNewUser)
    }
    checkTutorial()
    const interval = setInterval(checkTutorial, 500)
    return () => clearInterval(interval)
  }, [])

  // Handle tutorial animation for streak slide (8th slide, index 7)
  useEffect(() => {
    if (tutorialStep !== undefined && totalTutorialSteps !== undefined) {
      const isStreakSlide = tutorialStep === 7
      
      if (isStreakSlide && !showTutorialAnimation) {
        setShowTutorialAnimation(true)
        setAnimatedStreak(0)
        
        const timer = setTimeout(() => {
          setAnimatedStreak(1)
        }, 1500)
        
        return () => clearTimeout(timer)
      } else if (!isStreakSlide && showTutorialAnimation) {
        setShowTutorialAnimation(false)
        setAnimatedStreak(0)
      }
    }
  }, [tutorialStep, totalTutorialSteps])

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-4 border-orange-400/50" data-tutorial="streak-display">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-orange-500/20 rounded w-24 mb-2 animate-pulse"></div>
            <div className="h-3 bg-orange-500/20 rounded w-32 animate-pulse"></div>
          </div>
        </div>
      </Card>
    )
  }

  // Show placeholder for new users or during tutorial
  if (!streak || (streak.currentStreak === 0 && !isTutorialActive)) {
    return null
  }

  // Show placeholder during tutorial if no streak yet
  const displayStreak = showTutorialAnimation ? animatedStreak : (streak?.currentStreak || 0)
  
  if ((streak?.currentStreak === 0 || showTutorialAnimation) && isTutorialActive) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          data-tutorial="streak-display"
        >
          <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-4 border-orange-400/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DailyStreakFlame 
                  streak={displayStreak} 
                  isAnimating={showTutorialAnimation && animatedStreak === 1}
                />
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-lg font-bold text-orange-200">
                      day{displayStreak !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-orange-200/80">
                    {displayStreak === 0 
                      ? "🔥 Start your streak by completing a quiz!"
                      : "🔥 Great job! You've started your streak!"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-orange-200/70">
                  <Trophy className="w-4 h-4" strokeWidth={3} />
                  <span className="font-bold">Complete quizzes daily!</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </>
    )
  }

  const getStreakMessage = () => {
    if (streak.currentStreak >= 100) return "🔥 LEGENDARY STREAK!"
    if (streak.currentStreak >= 30) return "🔥 Incredible dedication!"
    if (streak.currentStreak >= 14) return "🔥 Amazing consistency!"
    if (streak.currentStreak >= 7) return "🔥 Great job!"
    if (streak.currentStreak >= 3) return "🔥 Keep it going!"
    return "🔥 Building your streak!"
  }

  const getStreakColor = () => {
    if (streak.currentStreak >= 30) return "from-orange-500 to-red-600"
    if (streak.currentStreak >= 14) return "from-orange-500 to-orange-600"
    if (streak.currentStreak >= 7) return "from-orange-400 to-orange-500"
    return "from-orange-300 to-orange-400"
  }

  const isAtRisk = !streak.isActiveToday && streak.daysUntilBreak <= 1

  return (
    <>
      {/* Notification Popup */}
      {showNotification && (
        <StreakNotification
          type={showNotification.type}
          newStreak={showNotification.newStreak}
          previousStreak={showNotification.previousStreak}
          onClose={() => setShowNotification(null)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        data-tutorial="streak-display"
      >
        <Card className={`p-6 bg-gradient-to-br ${getStreakColor()}/20 border-4 border-orange-400/50 shadow-lg ${isAtRisk ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DailyStreakFlame 
                streak={streak.currentStreak} 
                isAnimating={isAnimating}
              />
              
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-bold text-orange-200">
                    day{streak.currentStreak !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm font-bold text-orange-200/80">
                  {getStreakMessage()}
                </p>
                {isAtRisk && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-orange-300">
                    <AlertCircle className="w-3 h-3" strokeWidth={3} />
                    <span className="font-bold">Complete a quiz today to keep your streak!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-orange-200/70 mb-2">
                <Trophy className="w-4 h-4" strokeWidth={3} />
                <span className="font-bold">Best: {streak.longestStreak}</span>
              </div>
              {!streak.isActiveToday && streak.daysUntilBreak > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-300/70">
                  <Calendar className="w-3 h-3" strokeWidth={3} />
                  <span className="font-bold">
                    {streak.daysUntilBreak} day{streak.daysUntilBreak !== 1 ? 's' : ''} left
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Milestone indicators */}
          {streak.currentStreak > 0 && (
            <div className="mt-4 pt-4 border-t border-orange-400/30">
              <div className="flex items-center justify-between text-xs">
                {[7, 14, 30, 100].map((milestone) => (
                  <div
                    key={milestone}
                    className={`flex flex-col items-center ${
                      streak.currentStreak >= milestone
                        ? 'text-orange-300'
                        : 'text-orange-200/50'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mb-1 ${
                        streak.currentStreak >= milestone
                          ? 'bg-orange-400'
                          : 'bg-orange-400/30'
                      }`}
                    />
                    <span className="font-bold">{milestone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </>
  )
}
