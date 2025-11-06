import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from './middleware/rate-limit'
import { logger } from './lib/monitoring/logger'
import { trackApiPerformance } from './lib/monitoring/performance'
import { trackApiCost } from './lib/monitoring/cost'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname

  // Skip middleware for static files and API health checks
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path === '/api/health'
  ) {
    return NextResponse.next()
  }

  // Rate limiting for API routes
  if (path.startsWith('/api/')) {
    const rateLimitResult = await rateLimit(request)
    if (rateLimitResult) {
      return rateLimitResult
    }
  }

  // Track performance
  const response = NextResponse.next()
  const duration = Date.now() - startTime

  // Add performance tracking headers
  response.headers.set('X-Response-Time', `${duration}ms`)

  // Track API performance (for API routes)
  if (path.startsWith('/api/')) {
    trackApiPerformance(path, request.method, duration, 200)
    trackApiCost(path, duration)
  }

  // Log request
  logger.apiRequest(request.method, path, 200, duration)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
