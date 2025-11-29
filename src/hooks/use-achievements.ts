"use client"

import { useState, useCallback } from "react"
import { AchievementNotificationData } from "@/components/achievements/achievement-notification"

export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementNotificationData[]>([])

  const checkAchievements = useCallback(async (context?: {
    isPerfectScore?: boolean
    answerTime?: number
    isMultiplayer?: boolean
    isWin?: boolean
  }) => {
    try {
      const response = await fetch('/api/achievements/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context || {}),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.unlocked && data.unlocked.length > 0) {
          setUnlockedAchievements(prev => [...prev, ...data.unlocked])
          return data.unlocked
        }
      }
      return []
    } catch (error) {
      console.error('Error checking achievements:', error)
      return []
    }
  }, [])

  const dismissAchievement = useCallback((index: number) => {
    setUnlockedAchievements(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearAll = useCallback(() => {
    setUnlockedAchievements([])
  }, [])

  const addAchievements = useCallback((achievements: AchievementNotificationData[]) => {
    setUnlockedAchievements(prev => [...prev, ...achievements])
  }, [])

  return {
    unlockedAchievements,
    checkAchievements,
    dismissAchievement,
    clearAll,
    addAchievements,
  }
}

