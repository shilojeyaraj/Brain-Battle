'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TutorialOverlay, TutorialStep } from './tutorial-overlay'

const DASHBOARD_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Brain Battle! 🎉',
    description: 'You\'re now in your dashboard - your central hub for all study battles. Let\'s take a quick tour to help you get started!',
    targetSelector: '[data-tutorial="dashboard-header"]',
    position: 'bottom',
    showSkip: true,
  },
  {
    id: 'stats',
    title: 'Your Progress Stats 📊',
    description: 'Click the "Show Stats" button to view your XP, wins, accuracy, and win streak. As you play more battles, these stats will grow!',
    targetSelector: '[data-tutorial="show-stats-button"]',
    position: 'bottom',
  },
  {
    id: 'lobby-section',
    title: 'Battle Lobbies 🎮',
    description: 'This is where you can create or join multiplayer study battles. You can also start a singleplayer session to study on your own.',
    targetSelector: '[data-tutorial="lobby-section"]',
    position: 'bottom',
  },
  {
    id: 'singleplayer-button',
    title: 'Singleplayer Mode ⚡',
    description: 'Click here to start a solo study session. Upload your documents, generate questions, and practice at your own pace.',
    targetSelector: '[data-tutorial="singleplayer-button"]',
    position: 'right',
  },
  {
    id: 'join-lobby',
    title: 'Join a Room 🔗',
    description: 'Got a room code from a friend? Click here to join their study battle and compete together!',
    targetSelector: '[data-tutorial="join-lobby-button"]',
    position: 'right',
  },
  {
    id: 'create-lobby',
    title: 'Create a Room 🏠',
    description: 'Start your own study battle! Create a room, invite friends with a room code, and compete together in real-time.',
    targetSelector: '[data-tutorial="create-lobby-button"]',
    position: 'right',
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard 🏆',
    description: 'See how you rank against other players! Track your position and compete to climb to the top.',
    targetSelector: '[data-tutorial="leaderboard"]',
    position: 'left',
  },
  {
    id: 'streak',
    title: 'Daily Streak 🔥',
    description: 'Complete quizzes daily to build your streak! You have a 48-hour grace period, so if you miss a day, you can still keep your streak going. The longer your streak, the more impressive it becomes!',
    targetSelector: '[data-tutorial="streak-display"]',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You now know the basics! Start by creating a room or trying singleplayer mode. Remember to complete quizzes daily to build your streak! Have fun and study smart!',
    targetSelector: '[data-tutorial="dashboard-header"]',
    position: 'center',
  },
]

export function DashboardTutorial({ onStepChange }: { onStepChange?: (step: number) => void }) {
  const [showTutorial, setShowTutorial] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkTutorialStatus = async () => {
      setIsChecking(true)
      
      // Check if user just signed up (has newUser param)
      const isNewUser = searchParams.get('newUser') === 'true' || searchParams.get('userId')
      
      if (isNewUser) {
        // For new users, always show tutorial (first signup only)
        // Clean up URL params after starting tutorial
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          if (url.searchParams.has('newUser') || url.searchParams.has('userId')) {
            url.searchParams.delete('newUser')
            url.searchParams.delete('userId')
            window.history.replaceState({}, '', url.toString())
          }
        }
        
        // Small delay to ensure page is fully rendered
        setTimeout(() => {
          setShowTutorial(true)
          setIsChecking(false)
        }, 800)
        return
      }
      
      // For existing users (login), check database to see if tutorial was completed
      try {
        const response = await fetch('/api/tutorial/check')
        if (response.ok) {
          const data = await response.json()
          if (data.success && !data.tutorialCompleted) {
            // User hasn't completed tutorial in database, but don't show on login
            // Only show on first signup (handled above)
            setShowTutorial(false)
          } else {
            // User has completed tutorial, don't show
            setShowTutorial(false)
          }
        } else {
          // If API fails, fall back to localStorage check (for backwards compatibility)
          const tutorialCompleted = localStorage.getItem('dashboard_tutorial_completed')
          setShowTutorial(!tutorialCompleted)
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error)
        // Fall back to localStorage check
        const tutorialCompleted = localStorage.getItem('dashboard_tutorial_completed')
        setShowTutorial(!tutorialCompleted)
      } finally {
        setIsChecking(false)
      }
    }
    
    checkTutorialStatus()
  }, [searchParams])

  const handleComplete = () => {
    setShowTutorial(false)
  }

  const handleSkip = () => {
    setShowTutorial(false)
  }

  if (!showTutorial) {
    return null
  }

  return (
    <TutorialOverlay
      steps={DASHBOARD_TUTORIAL_STEPS}
      onComplete={handleComplete}
      onSkip={handleSkip}
      storageKey="dashboard_tutorial_completed"
      onStepChange={onStepChange}
    />
  )
}

