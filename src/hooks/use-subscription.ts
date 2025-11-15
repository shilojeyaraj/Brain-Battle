/**
 * useSubscription Hook
 * 
 * Client-side hook for checking subscription status and limits.
 * Provides real-time subscription information for UI components.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SubscriptionHookResult {
  isPro: boolean
  loading: boolean
  limits: {
    maxDocumentsPerMonth: number
    maxQuestionsPerQuiz: number
    maxPlayersPerRoom: number
    canExport: boolean
    hasPriorityProcessing: boolean
    hasAdvancedAnalytics: boolean
    hasCustomThemes: boolean
    hasAdvancedStudyNotes: boolean
  } | null
  subscription: {
    tier: string
    status: string
    isActive: boolean
    currentPeriodEnd: Date | null
  } | null
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to check user subscription status and limits
 * 
 * @param userId - The user's ID (can be null if not logged in)
 * @returns Subscription status and limits
 */
export function useSubscription(userId: string | null): SubscriptionHookResult {
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)
  const [limits, setLimits] = useState<SubscriptionHookResult['limits']>(null)
  const [subscription, setSubscription] = useState<SubscriptionHookResult['subscription']>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      setIsPro(false)
      setLimits(null)
      setSubscription(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/subscription/status?userId=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription status')
      }

      if (data.success) {
        setIsPro(data.isPro || false)
        setLimits(data.limits)
        setSubscription({
          tier: data.subscription?.tier || 'free',
          status: data.subscription?.status || 'free',
          isActive: data.subscription?.isActive || false,
          currentPeriodEnd: data.subscription?.currentPeriodEnd 
            ? new Date(data.subscription.currentPeriodEnd) 
            : null
        })
      } else {
        throw new Error(data.error || 'Failed to fetch subscription status')
      }
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription status')
      setIsPro(false)
      setLimits(null)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  return {
    isPro,
    loading,
    limits,
    subscription,
    error,
    refetch: fetchSubscription
  }
}

