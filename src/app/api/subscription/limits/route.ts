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

    // 🚀 OPTIMIZATION: Parallelize all limit checks for faster response
    const { checkQuizLimit } = await import('@/lib/subscription/limits')
    const [limits, docLimit, quizLimit] = await Promise.all([
      getUserLimits(userId),
      checkDocumentLimit(userId),
      checkQuizLimit(userId)
    ])

    // 🚀 OPTIMIZATION: Add caching headers for frequently accessed data (30 seconds)
    return NextResponse.json({
      success: true,
      limits: {
        maxDocumentsPerMonth: limits.maxDocumentsPerMonth,
        maxQuizzesPerMonth: limits.maxQuizzesPerMonth,
        maxQuestionsPerQuiz: limits.maxQuestionsPerQuiz,
        maxPlayersPerRoom: limits.maxPlayersPerRoom,
        canExport: limits.canExport,
        hasPriorityProcessing: limits.hasPriorityProcessing,
        hasAdvancedAnalytics: limits.hasAdvancedAnalytics,
        hasCustomThemes: limits.hasCustomThemes,
        hasAdvancedStudyNotes: limits.hasAdvancedStudyNotes,
        canAnalyzeImages: limits.canAnalyzeImages, // Pro-only: AI-powered image/diagram analysis
      },
      usage: {
        documents: {
          count: docLimit.count,
          limit: docLimit.limit,
          remaining: docLimit.remaining,
          isUnlimited: docLimit.limit === Infinity,
        },
        quizzes: {
          count: quizLimit.count,
          limit: quizLimit.limit,
          remaining: quizLimit.remaining,
          isUnlimited: quizLimit.limit === Infinity,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, must-revalidate', // Don't cache - always fetch fresh data
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
