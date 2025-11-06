/**
 * Retry utility for failed operations
 * Implements exponential backoff
 */

interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryable?: (error: any) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryable: () => true,
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      if (!opts.retryable(error)) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      )

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()

    // Check if circuit should be reset
    if (this.state === 'open' && now - this.lastFailureTime > this.resetTimeout) {
      this.state = 'half-open'
    }

    // If circuit is open, reject immediately
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await fn()
      
      // Success - reset failures if half-open
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      } else if (this.failures > 0) {
        this.failures = Math.max(0, this.failures - 1)
      }

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = now

      // Open circuit if threshold exceeded
      if (this.failures >= this.threshold) {
        this.state = 'open'
      }

      throw error
    }
  }

  getState() {
    return this.state
  }

  reset() {
    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
  }
}

