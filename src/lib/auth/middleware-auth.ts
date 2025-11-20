import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from './session-cookies'

/**
 * Middleware to require authentication
 * Returns 401 if not authenticated
 */
export async function requireAuthMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const userId = await getUserIdFromRequest(request)
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  return null // Continue to route handler
}

/**
 * Get authenticated user ID from request
 * Returns null if not authenticated
 */
export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  return await getUserIdFromRequest(request)
}

