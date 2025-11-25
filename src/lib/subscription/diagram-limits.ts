/**
 * Diagram Generation Limits and Quota Management
 * 
 * Handles quota tracking for AI-generated diagrams in quiz questions
 * Uses Replicate (Stable Diffusion) for image generation
 * Cost: ~$0.003 per image (16x cheaper than Nano Banana)
 * 
 * Free tier: 3 trial diagrams (one-time) + 2 per month
 * Pro tier: Unlimited
 */

import { getUserLimits, type FeatureLimits } from './limits'
import { createAdminClient } from '@/lib/supabase/server-admin'

export interface QuizDiagramQuota {
  allowed: boolean
  remaining: number
  limit: number
  isTrial: boolean
  requiresPro: boolean
  message?: string
  cost: number
}

export interface DiagramUsageStats {
  trial_quiz_diagrams_remaining: number
  quiz_diagrams_this_month: number
  has_used_trial_quiz_diagrams: boolean
  last_quiz_diagram_reset_date: Date | null
}

/**
 * Get user's diagram usage statistics
 */
async function getUserDiagramStats(userId: string): Promise<DiagramUsageStats> {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('player_stats')
    .select('trial_quiz_diagrams_remaining, quiz_diagrams_this_month, has_used_trial_quiz_diagrams, last_quiz_diagram_reset_date')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // User doesn't have stats yet, return defaults
    return {
      trial_quiz_diagrams_remaining: 3, // Default trial amount
      quiz_diagrams_this_month: 0,
      has_used_trial_quiz_diagrams: false,
      last_quiz_diagram_reset_date: null
    }
  }

  return {
    trial_quiz_diagrams_remaining: data.trial_quiz_diagrams_remaining ?? 3,
    quiz_diagrams_this_month: data.quiz_diagrams_this_month ?? 0,
    has_used_trial_quiz_diagrams: data.has_used_trial_quiz_diagrams ?? false,
    last_quiz_diagram_reset_date: data.last_quiz_diagram_reset_date 
      ? new Date(data.last_quiz_diagram_reset_date) 
      : null
  }
}

/**
 * Reset monthly diagram quota if needed
 */
async function resetMonthlyDiagramCount(userId: string): Promise<void> {
  const adminClient = createAdminClient()
  const now = new Date()
  
  await adminClient
    .from('player_stats')
    .update({
      quiz_diagrams_this_month: 0,
      last_quiz_diagram_reset_date: now.toISOString()
    })
    .eq('user_id', userId)
}

/**
 * Decrement diagram quota after generation
 */
export async function decrementQuizDiagramQuota(
  userId: string,
  count: number,
  isTrial: boolean
): Promise<void> {
  const adminClient = createAdminClient()
  const stats = await getUserDiagramStats(userId)
  
  if (isTrial) {
    // Decrement trial count
    const newTrialRemaining = Math.max(0, stats.trial_quiz_diagrams_remaining - count)
    const hasUsedTrial = newTrialRemaining === 0 || stats.has_used_trial_quiz_diagrams
    
    await adminClient
      .from('player_stats')
      .update({
        trial_quiz_diagrams_remaining: newTrialRemaining,
        has_used_trial_quiz_diagrams: hasUsedTrial
      })
      .eq('user_id', userId)
  } else {
    // Decrement monthly count
    const newMonthlyCount = stats.quiz_diagrams_this_month + count
    
    await adminClient
      .from('player_stats')
      .update({
        quiz_diagrams_this_month: newMonthlyCount
      })
      .eq('user_id', userId)
  }
}

/**
 * Check if user can generate quiz diagrams
 * 
 * @param userId - The user's ID
 * @param requestedCount - Number of diagrams requested (default: 1)
 * @returns Quota check result
 */
export async function checkQuizDiagramLimit(
  userId: string,
  requestedCount: number = 1
): Promise<QuizDiagramQuota> {
  const limits = await getUserLimits(userId)
  const isPro = limits.maxQuizDiagramsPerMonth === Infinity
  
  if (isPro) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      isTrial: false,
      requiresPro: false,
        cost: 0.003 * requestedCount // Track cost for analytics (Replicate SDXL)
    }
  }
  
  // Get user stats
  const stats = await getUserDiagramStats(userId)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Reset monthly count if needed
  if (!stats.last_quiz_diagram_reset_date || 
      stats.last_quiz_diagram_reset_date < startOfMonth) {
    await resetMonthlyDiagramCount(userId)
    // Refresh stats after reset
    const refreshedStats = await getUserDiagramStats(userId)
    Object.assign(stats, refreshedStats)
  }
  
  // Check trial first (one-time, 3 diagrams)
  if (!stats.has_used_trial_quiz_diagrams && stats.trial_quiz_diagrams_remaining > 0) {
    const canUse = Math.min(requestedCount, stats.trial_quiz_diagrams_remaining)
    
    if (canUse > 0) {
      return {
        allowed: true,
        remaining: stats.trial_quiz_diagrams_remaining - canUse,
        limit: 3, // Trial limit
        isTrial: true,
        requiresPro: false,
        message: `Trial: ${stats.trial_quiz_diagrams_remaining - canUse} quiz diagrams remaining`,
        cost: 0.003 * canUse // Replicate SDXL cost
      }
    }
  }
  
  // Check monthly quota (2 per month)
  const monthlyRemaining = limits.maxQuizDiagramsPerMonth - stats.quiz_diagrams_this_month
  const canUse = Math.min(requestedCount, monthlyRemaining)
  
  if (canUse > 0) {
    return {
      allowed: true,
      remaining: monthlyRemaining - canUse,
      limit: limits.maxQuizDiagramsPerMonth,
      isTrial: false,
      requiresPro: false,
      message: `${monthlyRemaining - canUse} quiz diagrams remaining this month`,
        cost: 0.003 * canUse // Replicate SDXL cost
    }
  }
  
  // Limit reached
  return {
    allowed: false,
    remaining: 0,
    limit: limits.maxQuizDiagramsPerMonth,
    isTrial: false,
    requiresPro: true,
    message: `You've used all ${limits.maxQuizDiagramsPerMonth} quiz diagrams this month. Upgrade to Pro for unlimited!`,
    cost: 0
  }
}

