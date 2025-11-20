"use client"

import { posthog } from '../../../instrumentation-client'

/**
 * Client-side PostHog utilities
 * Use these in client components to track events
 * PostHog is automatically initialized via instrumentation-client.ts
 */

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined' || !posthog) return
  
  try {
    posthog.capture(eventName, properties)
  } catch (error) {
    console.error('PostHog tracking error:', error)
  }
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined' || !posthog) return
  
  try {
    posthog.identify(userId, properties)
  } catch (error) {
    console.error('PostHog identify error:', error)
  }
}

export function resetUser() {
  if (typeof window === 'undefined' || !posthog) return
  
  try {
    posthog.reset()
  } catch (error) {
    console.error('PostHog reset error:', error)
  }
}

export function setUserProperties(properties: Record<string, any>) {
  if (typeof window === 'undefined' || !posthog) return
  
  try {
    posthog.setPersonProperties(properties)
  } catch (error) {
    console.error('PostHog set properties error:', error)
  }
}

/**
 * Track custom events with common properties
 */
export const analytics = {
  // User actions
  login: (method: string) => trackEvent('user_logged_in', { method }),
  signup: (method: string) => trackEvent('user_signed_up', { method }),
  logout: () => trackEvent('user_logged_out'),
  
  // Quiz/Battle events
  quizStarted: (type: 'singleplayer' | 'multiplayer', topic: string) => 
    trackEvent('quiz_started', { type, topic }),
  quizCompleted: (type: 'singleplayer' | 'multiplayer', score: number, total: number) =>
    trackEvent('quiz_completed', { type, score, total, accuracy: (score / total) * 100 }),
  battleWon: (opponentId?: string) => trackEvent('battle_won', { opponentId }),
  battleLost: (opponentId?: string) => trackEvent('battle_lost', { opponentId }),
  
  // Study notes
  notesGenerated: (topic: string, fileCount: number) =>
    trackEvent('notes_generated', { topic, fileCount }),
  notesViewed: (topic: string) => trackEvent('notes_viewed', { topic }),
  
  // Room events
  roomCreated: (roomId: string) => trackEvent('room_created', { roomId }),
  roomJoined: (roomId: string) => trackEvent('room_joined', { roomId }),
  
  // Subscription
  subscriptionStarted: (plan: string) => trackEvent('subscription_started', { plan }),
  subscriptionCancelled: (plan: string) => trackEvent('subscription_cancelled', { plan }),
  
  // Feature usage
  featureUsed: (featureName: string, properties?: Record<string, any>) =>
    trackEvent('feature_used', { feature: featureName, ...properties }),
}

