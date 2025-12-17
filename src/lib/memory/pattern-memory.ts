/**
 * Pattern Memory
 * 
 * Stores and retrieves patterns from past AI generation runs.
 * This is the "memory layer" from the memory architecture.
 * 
 * Patterns are retrieved when the agent encounters similar situations:
 * - When extracting formulas from similar document types
 * - When analyzing diagrams of similar types
 * - When encountering errors that were solved before
 * 
 * This enables the agent to learn from past successes and failures.
 * 
 * @module lib/memory/pattern-memory
 */

import { createAdminClient } from '@/lib/supabase/server-admin'
import { FeatureFlags } from '@/lib/config/feature-flags'

/**
 * Pattern data structure
 */
export interface Pattern {
  pattern_type: string // 'formula_extraction', 'diagram_analysis', etc.
  trigger_context: Record<string, any> // When to retrieve this pattern
  pattern_data: Record<string, any> // The actual pattern/learning
  outcome: 'success' | 'failure'
}

/**
 * Pattern Memory Class
 * 
 * Handles storage and retrieval of patterns from past runs.
 */
export class PatternMemory {
  /**
   * Retrieve patterns based on trigger context
   * 
   * @param patternType - Type of pattern to retrieve
   * @param triggerContext - Current context (document type, subject, error type, etc.)
   * @param limit - Maximum number of patterns to retrieve
   * @returns Array of relevant patterns
   */
  static async retrievePatterns(
    patternType: string,
    triggerContext: Record<string, any> = {},
    limit: number = 5
  ): Promise<Pattern[]> {
    if (!FeatureFlags.PATTERN_MEMORY) {
      if (FeatureFlags.DEBUG_MEMORY) {
        console.log('[PATTERN MEMORY] Feature disabled, returning empty patterns')
      }
      return []
    }

    try {
      const adminClient = createAdminClient()

      // Query patterns by type
      let query = adminClient
        .from('pattern_memory')
        .select('*')
        .eq('pattern_type', patternType)
        .order('usage_count', { ascending: false })
        .order('last_used', { ascending: false })
        .limit(limit)

      // If trigger context provided, try to match it
      // For now, we'll do simple matching - can enhance with semantic search later
      if (Object.keys(triggerContext).length > 0) {
        // Filter by matching trigger_context fields
        // This is a simple implementation - can be enhanced
        const { data, error } = await query

        if (error) {
          console.warn('[PATTERN MEMORY] Error retrieving patterns:', error)
          return []
        }

        // Filter results by trigger context match
        const matched = (data || []).filter((pattern: any) => {
          if (!pattern.trigger_context) return false

          // Check if trigger context fields match
          for (const [key, value] of Object.entries(triggerContext)) {
            if (pattern.trigger_context[key] === value) {
              return true // At least one match
            }
          }
          return false
        })

        // Update usage count for retrieved patterns
        if (matched.length > 0) {
          await Promise.allSettled(
            matched.map((p: any) =>
              adminClient
                .from('pattern_memory')
                .update({ usage_count: (p.usage_count || 0) + 1, last_used: new Date().toISOString() })
                .eq('id', p.id)
            )
          )
        }

        return matched.map(this.mapToPattern)
      } else {
        // No trigger context - return most used patterns
        const { data, error } = await query

        if (error) {
          console.warn('[PATTERN MEMORY] Error retrieving patterns:', error)
          return []
        }

        return (data || []).map(this.mapToPattern)
      }
    } catch (error) {
      console.warn('[PATTERN MEMORY] Exception retrieving patterns:', error)
      return []
    }
  }

  /**
   * Store a pattern
   * 
   * @param pattern - Pattern to store
   * @returns Success status
   */
  static async storePattern(pattern: Pattern): Promise<boolean> {
    if (!FeatureFlags.PATTERN_MEMORY) {
      if (FeatureFlags.DEBUG_MEMORY) {
        console.log('[PATTERN MEMORY] Feature disabled, skipping pattern storage')
      }
      return false
    }

    try {
      const adminClient = createAdminClient()

      const { error } = await adminClient.from('pattern_memory').insert({
        pattern_type: pattern.pattern_type,
        trigger_context: pattern.trigger_context || {},
        pattern_data: pattern.pattern_data,
        outcome: pattern.outcome,
        usage_count: 0,
        last_used: null,
      })

      if (error) {
        console.warn('[PATTERN MEMORY] Error storing pattern:', error)
        return false
      }

      if (FeatureFlags.DEBUG_MEMORY) {
        console.log(`[PATTERN MEMORY] Stored pattern: ${pattern.pattern_type} (${pattern.outcome})`)
      }

      return true
    } catch (error) {
      console.warn('[PATTERN MEMORY] Exception storing pattern:', error)
      return false
    }
  }

  /**
   * Map database row to Pattern interface
   */
  private static mapToPattern(row: any): Pattern {
    return {
      pattern_type: row.pattern_type,
      trigger_context: row.trigger_context || {},
      pattern_data: row.pattern_data || {},
      outcome: row.outcome,
    }
  }
}

