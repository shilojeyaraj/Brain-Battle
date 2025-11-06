import { NextResponse } from 'next/server'
import { captureException, captureMessage } from '@/lib/monitoring/sentry'

/**
 * Test endpoint to verify Sentry is working
 * Visit: http://localhost:3000/api/test-sentry
 */
export async function GET() {
  try {
    // Test 1: Send a test message
    captureMessage('Sentry test message - everything is working!', 'info', {
      test: true,
      timestamp: new Date().toISOString(),
    })

    // Test 2: Intentionally throw an error
    throw new Error('This is a test error for Sentry - check your dashboard!')
  } catch (error) {
    // Capture the error
    captureException(error as Error, {
      test: true,
      route: '/api/test-sentry',
      purpose: 'verifying-sentry-setup',
    })

    return NextResponse.json({
      success: true,
      message: '✅ Test error sent to Sentry!',
      instructions: [
        '1. Check your Sentry dashboard',
        '2. You should see a test error appear',
        '3. You should also see a test message',
        '4. If errors appear, Sentry is working correctly!',
      ],
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

