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
  maxQuizzesPerMonth: number // Monthly quiz generation limit
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
  // DIAGRAM GENERATION LIMITS
  maxQuizDiagramsPerMonth: number // Free: 2 per month (after trial), Pro: Infinity
  trialQuizDiagrams: number // Free: 3 (one-time trial), Pro: N/A
  canGenerateQuizDiagrams: boolean // Free: true (with limits), Pro: true (unlimited)
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
 * Quiz limit check result
 */
export interface QuizLimitResult {
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
      maxDocumentsPerMonth: 50, // Pro: 50 documents per month
      maxQuizzesPerMonth: 50, // Pro: 50 quizzes per month
      maxQuestionsPerQuiz: 20, // Pro: Up to 20 questions per quiz
      maxPlayersPerRoom: 15, // Pro: Up to 15 players per room
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
      // DIAGRAM GENERATION (Pro)
      maxQuizDiagramsPerMonth: Infinity, // Unlimited for Pro
      trialQuizDiagrams: Infinity, // Not applicable for Pro
      canGenerateQuizDiagrams: true, // Unlimited
    }
  }
  
  // Free tier limits - Designed to encourage upgrades
  // These limits are restrictive enough to show value but generous enough to try the product
  return {
    maxDocumentsPerMonth: 15, // Free: 15 documents per month
    maxQuizzesPerMonth: 15, // Free: 15 quizzes per month
    maxQuestionsPerQuiz: Infinity, // Free: Unlimited questions per quiz (no per-quiz limit)
    maxPlayersPerRoom: 4, // Free: Up to 4 players per room (can create)
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
    // DIAGRAM GENERATION (Free)
    maxQuizDiagramsPerMonth: 2, // 2 per month after trial
    trialQuizDiagrams: 3, // One-time trial of 3 diagrams
    canGenerateQuizDiagrams: true, // Can use, but limited
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
 * Check if user has reached their quiz generation limit for the current month
 * 
 * @param userId - The user's ID
 * @returns Quiz limit check result
 */
export async function checkQuizLimit(userId: string): Promise<QuizLimitResult> {
  const limits = await getUserLimits(userId)
  
  // Pro users with unlimited quizzes
  if (limits.maxQuizzesPerMonth === Infinity) {
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
  
  // Count unique quiz sessions generated/participated in by user this month
  // We count from game_results which tracks completed quizzes:
  // - Singleplayer: user completes their own generated quiz
  // - Multiplayer: user participates in quiz (host or participant)
  
  // Get unique session IDs from game_results (tracks completed quizzes)
  // This counts quizzes the user has completed, which is a good proxy for quizzes generated/participated in
  const { data: uniqueSessions } = await adminClient
    .from('game_results')
    .select('session_id')
    .eq('user_id', userId)
    .gte('completed_at', startOfMonth.toISOString())
    .not('session_id', 'is', null)
  
  const uniqueSessionIds = new Set(uniqueSessions?.map(r => r.session_id) || [])
  const quizCount = uniqueSessionIds.size
  
  const remaining = Math.max(0, limits.maxQuizzesPerMonth - quizCount)
  
  return {
    allowed: quizCount < limits.maxQuizzesPerMonth,
    count: quizCount,
    limit: limits.maxQuizzesPerMonth,
    remaining
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
    requiresPro: requestedQuestions > 20 && limits.maxQuestionsPerQuiz < 20
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

