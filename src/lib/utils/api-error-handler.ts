import { NextResponse } from 'next/server'
import { captureException } from '@/lib/monitoring/sentry'
import { logger } from '@/lib/monitoring/logger'
import { validateInput } from '@/lib/validation/schemas'
import type { z } from 'zod'

/**
 * Standardized API error handler
 * Provides consistent error responses across all API routes
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error
  if (error instanceof ApiError) {
    logger.error(`API Error [${error.statusCode}]: ${error.message}`, undefined, {
      code: error.code,
      details: error.details,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  // Handle known error types
  if (error instanceof Error) {
    // Capture in Sentry
    captureException(error)

    logger.error('Unhandled API Error', error)

    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
      },
      { status: 500 }
    )
  }

  // Unknown error
  logger.error('Unknown API Error', new Error('Unknown error type'))
  
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
    },
    { status: 500 }
  )
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validate request body with schema
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): T {
  const result = validateInput(schema, body)
  if (!result.success || !result.data) {
    throw new ApiError(400, result.error || 'Invalid request body', 'VALIDATION_ERROR')
  }
  return result.data
}

/**
 * Require authentication
 */
export async function requireAuth(
  getUser: () => Promise<{ data: { user: any } | null; error: any }>
): Promise<{ id: string }> {
  const { data, error } = await getUser()
  
  if (error || !data?.user) {
    throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
  }

  return { id: data.user.id }
}

/**
 * Check if user owns resource
 */
export function requireOwnership(
  userId: string,
  resourceUserId: string,
  resourceName: string = 'resource'
) {
  if (userId !== resourceUserId) {
    throw new ApiError(
      403,
      `You do not have permission to access this ${resourceName}`,
      'FORBIDDEN'
    )
  }
}

