/**
 * Rate limiting utility
 * Simple in-memory rate limiter for API routes
 * For production, use Redis-based rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

interface RateLimitOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval?: number // Max unique tokens per interval
  limit: number // Max requests per interval
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - options.interval

  // Clean up expired entries
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })

  const key = identifier
  const record = store[key]

  if (!record || record.resetTime < now) {
    // New window
    store[key] = {
      count: 1,
      resetTime: now + options.interval,
    }

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: now + options.interval,
    }
  }

  // Existing window
  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: record.resetTime,
    }
  }

  record.count++

  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    reset: record.resetTime,
  }
}

/**
 * Get identifier from request (IP address, user ID, etc.)
 */
export function getRateLimitIdentifier(request: Request): string {
  // In production, use IP address or user ID
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  
  // You can also use user ID if authenticated
  // const userId = await getUserId(request)
  // return userId || ip
  
  return ip
}

/**
 * Rate limit middleware for API routes
 * Example usage:
 * 
 * const rateLimitResult = rateLimit(
 *   await getRateLimitIdentifier(request),
 *   { interval: 60000, limit: 10 } // 10 requests per minute
 * )
 * 
 * if (!rateLimitResult.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': rateLimitResult.limit.toString(),
 *         'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
 *         'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
 *       }
 *     }
 *   )
 * }
 */

