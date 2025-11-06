/**
 * Cost Monitoring Utilities
 * Track API usage and estimate costs
 */

interface CostMetric {
  service: string
  operation: string
  count: number
  estimatedCost: number
  timestamp: number
}

class CostMonitor {
  private metrics: CostMetric[] = []
  private costRates: Record<string, number> = {
    // OpenAI API costs (approximate)
    'openai:gpt-4': 0.03, // $0.03 per 1K tokens
    'openai:gpt-3.5-turbo': 0.002, // $0.002 per 1K tokens
    'openai:embedding': 0.0001, // $0.0001 per 1K tokens
    
    // Supabase costs (approximate)
    'supabase:api_call': 0.000001, // $0.000001 per API call
    'supabase:storage': 0.021, // $0.021 per GB
    'supabase:database': 0.000125, // $0.000125 per GB-hour
    
    // Vercel costs (approximate)
    'vercel:function_invocation': 0.0000002, // $0.0000002 per invocation
    'vercel:bandwidth': 0.00015, // $0.00015 per GB
  }

  /**
   * Track API usage and estimate cost
   */
  trackUsage(
    service: string,
    operation: string,
    units: number = 1,
    customRate?: number
  ) {
    const rate = customRate || this.costRates[`${service}:${operation}`] || 0
    const estimatedCost = units * rate

    const metric: CostMetric = {
      service,
      operation,
      count: units,
      estimatedCost,
      timestamp: Date.now(),
    }

    this.metrics.push(metric)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[COST] ${service}:${operation} - ${units} units - $${estimatedCost.toFixed(6)}`
      )
    }
  }

  /**
   * Track OpenAI API usage
   */
  trackOpenAI(model: string, tokens: number) {
    const modelKey = model.includes('gpt-4') ? 'gpt-4' : 'gpt-3.5-turbo'
    this.trackUsage('openai', modelKey, tokens / 1000) // Convert to 1K tokens
  }

  /**
   * Track Supabase API calls
   */
  trackSupabase(operation: string, count: number = 1) {
    this.trackUsage('supabase', 'api_call', count)
  }

  /**
   * Track Vercel function invocations
   */
  trackVercel(count: number = 1) {
    this.trackUsage('vercel', 'function_invocation', count)
  }

  /**
   * Get total estimated cost for a time period
   */
  getTotalCost(startTime?: number, endTime?: number): number {
    let filtered = this.metrics

    if (startTime) {
      filtered = filtered.filter((m) => m.timestamp >= startTime)
    }
    if (endTime) {
      filtered = filtered.filter((m) => m.timestamp <= endTime)
    }

    return filtered.reduce((sum, m) => sum + m.estimatedCost, 0)
  }

  /**
   * Get cost breakdown by service
   */
  getCostBreakdown(startTime?: number, endTime?: number): Record<string, number> {
    let filtered = this.metrics

    if (startTime) {
      filtered = filtered.filter((m) => m.timestamp >= startTime)
    }
    if (endTime) {
      filtered = filtered.filter((m) => m.timestamp <= endTime)
    }

    const breakdown: Record<string, number> = {}
    for (const metric of filtered) {
      breakdown[metric.service] = (breakdown[metric.service] || 0) + metric.estimatedCost
    }

    return breakdown
  }

  /**
   * Get cost summary
   */
  getSummary(): {
    totalCost: number
    dailyCost: number
    monthlyProjection: number
    breakdown: Record<string, number>
  } {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

    const totalCost = this.getTotalCost()
    const dailyCost = this.getTotalCost(oneDayAgo)
    const monthlyProjection = dailyCost * 30
    const breakdown = this.getCostBreakdown()

    return {
      totalCost,
      dailyCost,
      monthlyProjection,
      breakdown,
    }
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = []
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): CostMetric[] {
    return [...this.metrics]
  }
}

// Singleton instance
export const costMonitor = new CostMonitor()

/**
 * Middleware to track API costs
 */
export function trackApiCost(route: string, duration: number) {
  // Track Vercel function invocation
  costMonitor.trackVercel(1)

  // Estimate bandwidth (rough estimate)
  const estimatedBandwidthMB = 0.1 // Assume ~100KB per request
  costMonitor.trackUsage('vercel', 'bandwidth', estimatedBandwidthMB / 1024)
}

