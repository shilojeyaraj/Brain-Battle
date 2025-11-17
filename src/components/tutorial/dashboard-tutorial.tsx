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
    id: 'create-lobby',
    title: 'Create a Room 🏠',
    description: 'Start your own study battle! Create a room, invite friends with a room code, and compete together in real-time.',
    targetSelector: '[data-tutorial="create-lobby-button"]',
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
    id: 'leaderboard',
    title: 'Leaderboard 🏆',
    description: 'See how you rank against other players! Track your position and compete to climb to the top.',
    targetSelector: '[data-tutorial="leaderboard"]',
    position: 'left',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You now know the basics! Start by creating a room or trying singleplayer mode. Have fun and study smart!',
    targetSelector: '[data-tutorial="dashboard-header"]',
    position: 'center',
  },
]

export function DashboardTutorial() {
  const [showTutorial, setShowTutorial] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if tutorial should be shown
    const tutorialCompleted = localStorage.getItem('dashboard_tutorial_completed')
    const isNewUser = searchParams.get('newUser') === 'true' || searchParams.get('userId')
    
    // Show tutorial if:
    // 1. User just signed up (has newUser param) - ALWAYS show for new users
    // 2. OR if tutorial hasn't been completed before (for returning users who skipped)
    if (isNewUser) {
      // For new users, always show tutorial (even if they somehow have the flag set)
      // Clear the flag to ensure fresh start
      if (tutorialCompleted) {
        localStorage.removeItem('dashboard_tutorial_completed')
      }
      
      // Small delay to ensure page is fully rendered
      setTimeout(() => {
        setShowTutorial(true)
      }, 800)
      
      // Clean up URL params after starting tutorial
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (url.searchParams.has('newUser') || url.searchParams.has('userId')) {
          url.searchParams.delete('newUser')
          url.searchParams.delete('userId')
          window.history.replaceState({}, '', url.toString())
        }
      }
    } else if (!tutorialCompleted) {
      // For returning users who haven't completed tutorial, also show it
      // (in case they skipped it before)
      setTimeout(() => {
        setShowTutorial(true)
      }, 1000)
    }
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
    />
  )
}

