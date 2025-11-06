import { NextRequest, NextResponse } from 'next/server'
import { captureException } from '@/lib/monitoring/sentry'

/**
 * Wrapper for API routes that automatically captures errors to Sentry
 */
export function withSentry<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  routeName?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Capture error to Sentry
      if (error instanceof Error) {
        captureException(error, {
          route: routeName || 'unknown',
          args: args.length > 0 ? 'provided' : 'none',
        })
      } else {
        captureException(new Error(String(error)), {
          route: routeName || 'unknown',
          errorType: typeof error,
        })
      }

      // Re-throw to let Next.js handle it
      throw error
    }
  }
}

