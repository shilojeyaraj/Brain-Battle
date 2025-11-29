/**
 * Subscription Validation Utilities
 * 
 * Validates subscription status and feature access
 */

import { hasProSubscription } from '@/lib/stripe/utils'
import { getUserLimits, checkDocumentLimit, checkQuizQuestionLimit } from '@/lib/subscription/limits'

export interface SubscriptionValidationResult {
  allowed: boolean
  isPro: boolean
  reason?: string
  requiresPro?: boolean
}

/**
 * Validate that user has Pro subscription for premium features
 */
export async function validateProSubscription(
  userId: string,
  feature: string
): Promise<SubscriptionValidationResult> {
  try {
    const isPro = await hasProSubscription(userId)
    
    if (!isPro) {
      return {
        allowed: false,
        isPro: false,
        requiresPro: true,
        reason: `${feature} requires a Pro subscription. Upgrade to unlock this feature.`,
      }
    }

    return {
      allowed: true,
      isPro: true,
    }
  } catch (error) {
    console.error(`Error validating Pro subscription for ${feature}:`, error)
    // Fail secure - deny access if we can't verify
    return {
      allowed: false,
      isPro: false,
      reason: 'Unable to verify subscription status. Please try again.',
    }
  }
}

/**
 * Validate document upload limit
 */
export async function validateDocumentUpload(
  userId: string
): Promise<SubscriptionValidationResult> {
  try {
    const limitCheck = await checkDocumentLimit(userId)
    
    if (!limitCheck.allowed) {
      const limits = await getUserLimits(userId)
      return {
        allowed: false,
        isPro: limits.maxDocumentsPerMonth === Infinity,
        requiresPro: limits.maxDocumentsPerMonth !== Infinity,
        reason: `You've reached your monthly limit of ${limitCheck.limit} documents. ${limits.maxDocumentsPerMonth === Infinity ? '' : 'Upgrade to Pro for unlimited uploads!'}`,
      }
    }

    const limits = await getUserLimits(userId)
    return {
      allowed: true,
      isPro: limits.maxDocumentsPerMonth === Infinity,
    }
  } catch (error) {
    console.error('Error validating document upload:', error)
    return {
      allowed: false,
      isPro: false,
      reason: 'Unable to verify document limits. Please try again.',
    }
  }
}

/**
 * Validate quiz question limit
 */
export async function validateQuizQuestions(
  userId: string,
  requestedQuestions: number
): Promise<SubscriptionValidationResult> {
  try {
    const limitCheck = await checkQuizQuestionLimit(userId, requestedQuestions)
    
    if (!limitCheck.allowed) {
      return {
        allowed: false,
        isPro: false,
        requiresPro: limitCheck.requiresPro,
        reason: `Free users are limited to ${limitCheck.limit} questions per quiz. Upgrade to Pro for unlimited questions!`,
      }
    }

    const limits = await getUserLimits(userId)
    return {
      allowed: true,
      isPro: limits.maxQuestionsPerQuiz === Infinity,
    }
  } catch (error) {
    console.error('Error validating quiz questions:', error)
    return {
      allowed: false,
      isPro: false,
      reason: 'Unable to verify quiz limits. Please try again.',
    }
  }
}

