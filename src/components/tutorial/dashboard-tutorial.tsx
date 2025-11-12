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
    description: 'Here you can see your XP, wins, accuracy, and win streak. As you play more battles, these stats will grow!',
    targetSelector: '[data-tutorial="stats-grid"]',
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
    // 1. Not completed before
    // 2. User just signed up (has userId or newUser param)
    // 3. User manually triggers it (could add a button later)
    if (!tutorialCompleted && isNewUser) {
      // Small delay to ensure page is fully rendered
      setTimeout(() => {
        setShowTutorial(true)
      }, 500)
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

