/**
 * Rate Limit Configuration
 * 
 * Centralized rate limit settings for different API endpoints
 */

export interface RateLimitConfig {
  interval: number // Time window in milliseconds
  limit: number // Max requests per interval
}

/**
 * Get rate limit configuration for a specific endpoint
 */
export function getRateLimitConfig(path: string): RateLimitConfig {
  // Stricter limits for expensive/security-sensitive endpoints
  if (path.includes('/generate-quiz') || path.includes('/notes')) {
    return { interval: 60000, limit: 10 } // 10 AI requests per minute
  }
  
  if (path.includes('/embeddings')) {
    return { interval: 60000, limit: 20 } // 20 embedding requests per minute
  }
  
  if (path.includes('/auth/') || path.includes('/stripe/')) {
    return { interval: 60000, limit: 20 } // 20 auth requests per minute
  }
  
  if (path.includes('/upload') || path.includes('/file')) {
    return { interval: 60000, limit: 30 } // 30 file uploads per minute
  }
  
  // Default rate limit
  return { interval: 60000, limit: 100 } // 100 requests per minute
}

/**
 * Rate limit documentation
 * 
 * NOTE: Current implementation uses in-memory rate limiting.
 * This works for single-server deployments but won't work across
 * multiple servers. For production with multiple servers, consider:
 * 
 * 1. Using Redis/Upstash for distributed rate limiting
 * 2. Using Supabase KV storage (already implemented in src/lib/rate-limit/supabase-kv.ts)
 * 3. Using a dedicated rate limiting service
 * 
 * The Supabase KV implementation is available but not currently enabled.
 * To enable it, update src/middleware.ts to use the Supabase rate limiter.
 */

