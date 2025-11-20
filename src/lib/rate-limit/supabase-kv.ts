import { createAdminClient } from '@/lib/supabase/server-admin'

interface RateLimitRecord {
  count: number
  resetTime: number
}

/**
 * Rate limiting using Supabase storage (or can be migrated to Redis/Upstash)
 * For now, we'll use a simple table-based approach
 */

const RATE_LIMIT_TABLE = 'rate_limits' // You'll need to create this table

/**
 * Get rate limit record from Supabase
 */
async function getRateLimitRecord(identifier: string): Promise<RateLimitRecord | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from(RATE_LIMIT_TABLE)
      .select('count, reset_time')
      .eq('identifier', identifier)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      count: data.count,
      resetTime: new Date(data.reset_time).getTime(),
    }
  } catch (error) {
    console.error('Error getting rate limit record:', error)
    return null
  }
}

/**
 * Set or update rate limit record
 */
async function setRateLimitRecord(
  identifier: string,
  count: number,
  resetTime: number
): Promise<void> {
  try {
    const supabase = createAdminClient()
    
    // Upsert the record
    const { error } = await supabase
      .from(RATE_LIMIT_TABLE)
      .upsert({
        identifier,
        count,
        reset_time: new Date(resetTime).toISOString(),
        updated_at: new Date().toISOString(),
      })
    
    if (error) {
      console.error('Error setting rate limit record:', error)
    }
  } catch (error) {
    console.error('Error setting rate limit record:', error)
  }
}

/**
 * Increment rate limit counter atomically
 */
async function incrementRateLimit(
  identifier: string,
  resetTime: number
): Promise<number> {
  try {
    const supabase = createAdminClient()
    
    // Use RPC function for atomic increment (you'll need to create this)
    // For now, we'll do a simple read-modify-write
    const record = await getRateLimitRecord(identifier)
    const newCount = record ? record.count + 1 : 1
    
    await setRateLimitRecord(identifier, newCount, resetTime)
    
    return newCount
  } catch (error) {
    console.error('Error incrementing rate limit:', error)
    return 1
  }
}

/**
 * Clean up expired rate limit records
 */
async function cleanupExpiredRecords(): Promise<void> {
  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()
    
    await supabase
      .from(RATE_LIMIT_TABLE)
      .delete()
      .lt('reset_time', now)
  } catch (error) {
    // Ignore cleanup errors
  }
}

export interface RateLimitOptions {
  interval: number // Time window in milliseconds
  limit: number // Max requests per interval
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Rate limit using Supabase storage
 * 
 * Note: For production, consider using Redis/Upstash for better performance
 * This implementation uses Supabase as a fallback
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetTime = now + options.interval
  
  // Cleanup expired records periodically (10% chance to avoid overhead)
  if (Math.random() < 0.1) {
    await cleanupExpiredRecords()
  }
  
  const record = await getRateLimitRecord(identifier)
  
  if (!record || record.resetTime < now) {
    // New window - start fresh
    await setRateLimitRecord(identifier, 1, resetTime)
    
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: resetTime,
    }
  }
  
  // Existing window - check if limit exceeded
  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: record.resetTime,
    }
  }
  
  // Increment counter
  const newCount = await incrementRateLimit(identifier, record.resetTime)
  
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - newCount,
    reset: record.resetTime,
  }
}

/**
 * SQL to create rate_limits table:
 * 
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   identifier TEXT PRIMARY KEY,
 *   count INTEGER NOT NULL DEFAULT 0,
 *   reset_time TIMESTAMPTZ NOT NULL,
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * 
 * CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);
 */

