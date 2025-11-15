/**
 * Subscription Status API Route
 * 
 * GET /api/subscription/status?userId=<userId>
 * 
 * Returns the user's subscription status and feature limits.
 * This endpoint is used by client-side components to check subscription status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionStatusWithLimits } from '@/lib/subscription/limits'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const status = await getSubscriptionStatusWithLimits(userId)

    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    console.error('❌ [SUBSCRIPTION STATUS API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscription status' 
      },
      { status: 500 }
    )
  }
}

