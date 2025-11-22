/**
 * Subscription Limits and Feature Gating
 * 
 * This module provides utilities for checking subscription limits and feature access.
 * It enforces Free vs Pro tier restrictions throughout the application.
 * 
 * @module subscription/limits
 */

import { hasProSubscription, getUserSubscription } from '@/lib/stripe/utils'
import { createAdminClient } from '@/lib/supabase/server-admin'
import type { SubscriptionInfo } from '@/lib/stripe/utils'

/**
 * Feature limits based on subscription tier
 */
export interface FeatureLimits {
  maxDocumentsPerMonth: number
  maxQuestionsPerQuiz: number
  maxPlayersPerRoom: number
  canExport: boolean
  hasPriorityProcessing: boolean
  hasAdvancedAnalytics: boolean
  hasCustomThemes: boolean
  hasAdvancedStudyNotes: boolean
  canCreateClans: boolean // Pro feature - only Pro users can CREATE clans
  canJoinClans: boolean // Both Pro and Free users can JOIN clans
  maxClansPerUser: number // How many clans a user can join (Pro: 10, Free: 3)
  maxClanMembers: number // Max members per clan (same for all)
}

/**
 * Document limit check result
 */
export interface DocumentLimitResult {
  allowed: boolean
  count: number
  limit: number
  remaining: number
}

/**
 * Room size limit check result
 */
export interface RoomSizeLimitResult {
  allowed: boolean
  requestedSize: number
  maxAllowed: number
  requiresPro: boolean
}

/**
 * Get feature limits for a user based on their subscription tier
 * 
 * FREEMIUM MODEL FOR CLANS:
 * - Pro users can CREATE clans (teachers/organizers)
 * - Free users can JOIN clans (students/participants)
 * - This allows one Pro account to enable unlimited free participation
 * 
 * @param userId - The user's ID
 * @returns Feature limits object
 */
export async function getUserLimits(userId: string): Promise<FeatureLimits> {
  const isPro = await hasProSubscription(userId)
  
  if (isPro) {
    return {
      maxDocumentsPerMonth: Infinity,
      maxQuestionsPerQuiz: Infinity,
      maxPlayersPerRoom: 20,
      canExport: true,
      hasPriorityProcessing: true,
      hasAdvancedAnalytics: true,
      hasCustomThemes: true,
      hasAdvancedStudyNotes: true,
      // CLAN FEATURES (Pro)
      canCreateClans: true, // Pro users can CREATE clans (teachers/organizers)
      canJoinClans: true, // Pro users can join clans
      maxClansPerUser: 10, // Pro users can join up to 10 clans
      maxClanMembers: 50, // Max members per clan (allows up to 500 participants per Pro account)
    }
  }
  
  // Free tier limits - Designed to encourage upgrades
  // These limits are restrictive enough to show value but generous enough to try the product
  return {
    maxDocumentsPerMonth: 3, // Reduced from 5 to encourage upgrades
    maxQuestionsPerQuiz: 8,  // Reduced from 10 to encourage upgrades
    maxPlayersPerRoom: 4,
    canExport: false,
    hasPriorityProcessing: false,
    hasAdvancedAnalytics: false,
    hasCustomThemes: false,
    hasAdvancedStudyNotes: false,
    // CLAN FEATURES (Free)
    // FREEMIUM MODEL: Free users can JOIN but not CREATE
    canCreateClans: false, // Free users CANNOT create clans (teacher needs Pro)
    canJoinClans: true, // Free users CAN join clans (students can participate)
    maxClansPerUser: 3, // Free users can join up to 3 clans (prevents abuse, allows multiple classes)
    maxClanMembers: 50, // Same max members (set by clan creator)
  }
}

/**
 * Check if user has reached their document upload limit for the current month
 * 
 * @param userId - The user's ID
 * @returns Document limit check result
 */
export async function checkDocumentLimit(userId: string): Promise<DocumentLimitResult> {
  const limits = await getUserLimits(userId)
  
  // Pro users have unlimited documents
  if (limits.maxDocumentsPerMonth === Infinity) {
    return { 
      allowed: true, 
      count: 0, 
      limit: Infinity,
      remaining: Infinity
    }
  }
  
  const adminClient = createAdminClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const { count, error } = await adminClient
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('uploaded_by', userId)
    .gte('created_at', startOfMonth.toISOString())
  
  if (error) {
    console.error('❌ [LIMITS] Error checking document limit:', error)
    // Fail open - allow upload if we can't check
    return {
      allowed: true,
      count: 0,
      limit: limits.maxDocumentsPerMonth,
      remaining: limits.maxDocumentsPerMonth
    }
  }
  
  const documentCount = count || 0
  const remaining = Math.max(0, limits.maxDocumentsPerMonth - documentCount)
  
  return {
    allowed: documentCount < limits.maxDocumentsPerMonth,
    count: documentCount,
    limit: limits.maxDocumentsPerMonth,
    remaining
  }
}

/**
 * Check if user can create a room with the requested number of players
 * 
 * @param userId - The user's ID
 * @param requestedSize - The requested max players for the room
 * @returns Room size limit check result
 */
export async function checkRoomSizeLimit(
  userId: string, 
  requestedSize: number
): Promise<RoomSizeLimitResult> {
  const limits = await getUserLimits(userId)
  const maxAllowed = limits.maxPlayersPerRoom
  
  return {
    allowed: requestedSize <= maxAllowed,
    requestedSize,
    maxAllowed,
    requiresPro: requestedSize > 4 && limits.maxPlayersPerRoom === 4
  }
}

/**
 * Check if user can generate a quiz with the requested number of questions
 * 
 * @param userId - The user's ID
 * @param requestedQuestions - The requested number of questions
 * @returns Whether the user can generate the quiz
 */
export async function checkQuizQuestionLimit(
  userId: string,
  requestedQuestions: number
): Promise<{ allowed: boolean; limit: number; requiresPro: boolean }> {
  const limits = await getUserLimits(userId)
  const maxAllowed = limits.maxQuestionsPerQuiz
  
  return {
    allowed: requestedQuestions <= maxAllowed,
    limit: maxAllowed,
    requiresPro: requestedQuestions > 8 && limits.maxQuestionsPerQuiz === 8
  }
}

/**
 * Get comprehensive subscription status and limits for a user
 * 
 * @param userId - The user's ID
 * @returns Subscription info with limits
 */
export async function getSubscriptionStatusWithLimits(userId: string): Promise<{
  subscription: SubscriptionInfo | null
  limits: FeatureLimits
  isPro: boolean
}> {
  const subscription = await getUserSubscription(userId)
  const limits = await getUserLimits(userId)
  const isPro = subscription?.isActive && subscription.tier === 'pro'
  
  return {
    subscription,
    limits,
    isPro: !!isPro
  }
}

