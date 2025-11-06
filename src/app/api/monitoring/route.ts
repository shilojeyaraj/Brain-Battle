import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '@/lib/monitoring/performance'
import { costMonitor } from '@/lib/monitoring/cost'
import { requireAuth } from '@/lib/utils/api-error-handler'
import { createClient } from '@/lib/supabase/server'

/**
 * Monitoring endpoint for production metrics
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get performance metrics
    const performanceSummary = performanceMonitor.getSummary()

    // Get cost metrics
    const costSummary = costMonitor.getSummary()

    // Get health check data
    const healthResponse = await fetch(`${request.nextUrl.origin}/api/health`)
    const healthData = await healthResponse.json()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      performance: performanceSummary,
      cost: costSummary,
      health: healthData,
    })
  } catch (error) {
    console.error('Error fetching monitoring data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

