import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'
import { getUserLimits, checkDocumentLimit } from '@/lib/subscription/limits'

/**
 * Get user's subscription limits and current usage
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get limits
    const limits = await getUserLimits(userId)
    
    // Get document usage
    const docLimit = await checkDocumentLimit(userId)

    return NextResponse.json({
      success: true,
      limits: {
        maxDocumentsPerMonth: limits.maxDocumentsPerMonth,
        maxQuestionsPerQuiz: limits.maxQuestionsPerQuiz,
        maxPlayersPerRoom: limits.maxPlayersPerRoom,
        canExport: limits.canExport,
        hasPriorityProcessing: limits.hasPriorityProcessing,
        hasAdvancedAnalytics: limits.hasAdvancedAnalytics,
        hasCustomThemes: limits.hasCustomThemes,
        hasAdvancedStudyNotes: limits.hasAdvancedStudyNotes,
      },
      usage: {
        documents: {
          count: docLimit.count,
          limit: docLimit.limit,
          remaining: docLimit.remaining,
          isUnlimited: docLimit.limit === Infinity,
        },
      },
    })
  } catch (error: any) {
    console.error('❌ [LIMITS API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
      { status: 500 }
    )
  }
}
