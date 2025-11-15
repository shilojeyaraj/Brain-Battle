/**
 * Subscription Limits API Route
 * 
 * GET /api/subscription/limits?userId=<userId>&feature=<feature>
 * 
 * Returns specific limit information for a feature.
 * Used for checking limits before performing actions.
 * 
 * Supported features:
 * - documents: Check document upload limit
 * - room-size: Check room size limit (requires requestedSize param)
 * - quiz-questions: Check quiz question limit (requires requestedQuestions param)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  checkDocumentLimit, 
  checkRoomSizeLimit, 
  checkQuizQuestionLimit,
  getUserLimits 
} from '@/lib/subscription/limits'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const feature = searchParams.get('feature')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!feature) {
      // Return all limits if no specific feature requested
      const limits = await getUserLimits(userId)
      return NextResponse.json({
        success: true,
        limits
      })
    }

    switch (feature) {
      case 'documents': {
        const result = await checkDocumentLimit(userId)
        return NextResponse.json({
          success: true,
          ...result
        })
      }

      case 'room-size': {
        const requestedSize = searchParams.get('requestedSize')
        if (!requestedSize) {
          return NextResponse.json(
            { error: 'requestedSize parameter is required for room-size feature' },
            { status: 400 }
          )
        }
        const result = await checkRoomSizeLimit(userId, parseInt(requestedSize, 10))
        return NextResponse.json({
          success: true,
          ...result
        })
      }

      case 'quiz-questions': {
        const requestedQuestions = searchParams.get('requestedQuestions')
        if (!requestedQuestions) {
          return NextResponse.json(
            { error: 'requestedQuestions parameter is required for quiz-questions feature' },
            { status: 400 }
          )
        }
        const result = await checkQuizQuestionLimit(userId, parseInt(requestedQuestions, 10))
        return NextResponse.json({
          success: true,
          ...result
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown feature: ${feature}. Supported features: documents, room-size, quiz-questions` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('❌ [SUBSCRIPTION LIMITS API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check limits' 
      },
      { status: 500 }
    )
  }
}

