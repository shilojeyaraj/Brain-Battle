/**
 * Feature Flags Configuration
 * 
 * Controls which memory architecture features are enabled.
 * All features are disabled by default for safety.
 * 
 * Enable features via environment variables:
 *   ENABLE_PROGRESS_LOGGING=true
 *   ENABLE_CONTEXT_COMPILATION=true
 *   ENABLE_PATTERN_MEMORY=true
 *   ENABLE_FEATURE_BACKLOG=true
 *   DEBUG_MEMORY=true
 * 
 * @module lib/config/feature-flags
 */

export const FeatureFlags = {
  /**
   * Progress Logging
   * 
   * Tracks what happened during each generation session.
   * Stores: tokens used, processing time, errors, learnings.
   * 
   * Safe to enable: Yes (read-only logging, doesn't affect generation)
   * Impact: Low (adds ~10ms per request for database write)
   */
  PROGRESS_LOGGING: process.env.ENABLE_PROGRESS_LOGGING === 'true',

  /**
   * Context Compilation
   * 
   * Compiles focused context instead of sending full document.
   * Reduces token usage by 50-70% while preserving quality.
   * 
   * Safe to enable: Yes (feature flag controlled, can disable instantly)
   * Impact: High (reduces costs, improves quality)
   * 
   * WARNING: Test thoroughly before enabling in production.
   * Start with small % of requests.
   */
  CONTEXT_COMPILATION: process.env.ENABLE_CONTEXT_COMPILATION === 'true',

  /**
   * Pattern Memory
   * 
   * Stores and retrieves patterns from past runs.
   * Helps agent learn from successes and failures.
   * 
   * Safe to enable: Yes (read-only retrieval, optional writes)
   * Impact: Medium (improves quality over time)
   */
  PATTERN_MEMORY: process.env.ENABLE_PATTERN_MEMORY === 'true',

  /**
   * Feature Backlog
   * 
   * Machine-readable feature list with pass/fail criteria.
   * Tracks what needs improvement and what's working.
   * 
   * Safe to enable: Yes (read-only, doesn't affect generation)
   * Impact: Low (provides visibility into quality metrics)
   */
  FEATURE_BACKLOG: process.env.ENABLE_FEATURE_BACKLOG === 'true',

  /**
   * Debug Mode
   * 
   * Enables verbose logging for memory architecture components.
   * Useful for development and troubleshooting.
   * 
   * Safe to enable: Yes (only affects logging)
   * Impact: Low (increases log volume)
   */
  DEBUG_MEMORY: process.env.DEBUG_MEMORY === 'true',
} as const

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[feature]
}

/**
 * Get all enabled features (for logging/debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FeatureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name)
}

