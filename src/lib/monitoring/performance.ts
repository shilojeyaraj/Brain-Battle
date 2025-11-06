/**
 * Performance Monitoring Utilities
 * Track and log performance metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics

  /**
   * Track a performance metric
   */
  track(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    }

    this.metrics.push(metric)

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${name}: ${value}ms`, tags || '')
    }
  }

  /**
   * Measure async function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.track(name, duration, tags)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.track(`${name}_error`, duration, { ...tags, error: 'true' })
      throw error
    }
  }

  /**
   * Measure sync function execution time
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const start = Date.now()
    try {
      const result = fn()
      const duration = Date.now() - start
      this.track(name, duration, tags)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.track(`${name}_error`, duration, { ...tags, error: 'true' })
      throw error
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string, limit = 100): PerformanceMetric[] {
    return this.metrics
      .filter((m) => m.name === name)
      .slice(-limit)
  }

  /**
   * Get aggregated stats for a metric
   */
  getStats(name: string): {
    count: number
    avg: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
  } {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      }
    }

    const values = metrics.map((m) => m.value).sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)

    return {
      count: values.length,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    }
  }

  /**
   * Get all metrics summary
   */
  getSummary(): Record<string, ReturnType<typeof this.getStats>> {
    const names = new Set(this.metrics.map((m) => m.name))
    const summary: Record<string, ReturnType<typeof this.getStats>> = {}

    for (const name of names) {
      summary[name] = this.getStats(name)
    }

    return summary
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Performance tracking decorator/hook
 */
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    if (fn.constructor.name === 'AsyncFunction') {
      return performanceMonitor.measure(name, () => fn(...args))
    }
    return performanceMonitor.measureSync(name, () => fn(...args))
  }) as T
}

/**
 * Track API route performance
 */
export function trackApiPerformance(
  route: string,
  method: string,
  duration: number,
  statusCode: number
) {
  performanceMonitor.track('api_request', duration, {
    route,
    method,
    status: statusCode.toString(),
  })
}

/**
 * Track database query performance
 */
export function trackDbQuery(
  table: string,
  operation: string,
  duration: number,
  success: boolean
) {
  performanceMonitor.track('db_query', duration, {
    table,
    operation,
    success: success.toString(),
  })
}

