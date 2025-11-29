import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit, getRateLimitIdentifier } from './middleware/rate-limit'
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

  // Note: Authentication is handled client-side with custom auth
  // Session validation happens in API routes and page components
  // Middleware here focuses on rate limiting and monitoring

  // Enhanced rate limiting for API routes with per-endpoint limits
  if (path.startsWith('/api/')) {
    const identifier = getRateLimitIdentifier(request)
    
    // Use centralized rate limit configuration
    const { getRateLimitConfig } = await import('@/lib/security/rate-limit-config')
    const rateLimitConfig = getRateLimitConfig(path)
    
    const rateLimitResult = rateLimit(identifier, rateLimitConfig)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          }
        }
      )
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
