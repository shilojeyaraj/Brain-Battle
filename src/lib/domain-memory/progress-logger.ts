/**
 * Progress Logger
 * 
 * Tracks what happened during each AI generation session.
 * This is the "progress log" artifact from the memory architecture.
 * 
 * Logs are stored in the `generation_progress_log` table and can be used to:
 * - Identify patterns in failures
 * - Measure improvements over time
 * - Debug issues in production
 * - Learn from past runs
 * 
 * All logging is non-blocking and fails silently to not affect core functionality.
 * 
 * @module lib/domain-memory/progress-logger
 */

import { createAdminClient } from '@/lib/supabase/server-admin'
import { FeatureFlags } from '@/lib/config/feature-flags'
import crypto from 'crypto'

/**
 * Progress log entry structure
 */
export interface ProgressLogEntry {
  session_id: string
  task_type: 'quiz_generation' | 'study_notes'
  timestamp: string
  user_id?: string
  document_types?: string[]
  features_worked_on?: string[]
  key_learnings?: string[]
  errors_encountered?: string[]
  tokens_used?: number
  processing_time_ms?: number
  notes_quality_metrics?: {
    formulas_extracted?: number
    formulas_in_document?: number
    page_refs_present?: boolean
    generic_content_detected?: boolean
    diagrams_extracted?: number
    concepts_count?: number
    practice_questions_count?: number
  }
}

/**
 * Progress Logger Class
 * 
 * Handles logging of generation sessions to the database.
 * All operations are non-blocking and fail silently.
 */
export class ProgressLogger {
  /**
   * Log a generation session
   * 
   * @param entry - Progress log entry data
   * @returns Promise that resolves when logging completes (or fails silently)
   */
  static async logGeneration(entry: ProgressLogEntry): Promise<void> {
    // Check if feature is enabled
    if (!FeatureFlags.PROGRESS_LOGGING) {
      if (FeatureFlags.DEBUG_MEMORY) {
        console.log('[PROGRESS LOGGER] Feature disabled, skipping log')
      }
      return
    }

    // Validate required fields
    if (!entry.session_id || !entry.task_type) {
      if (FeatureFlags.DEBUG_MEMORY) {
        console.warn('[PROGRESS LOGGER] Missing required fields, skipping log')
      }
      return
    }

    try {
      const adminClient = createAdminClient()

      const { error } = await adminClient
        .from('generation_progress_log')
        .insert({
          session_id: entry.session_id,
          task_type: entry.task_type,
          timestamp: entry.timestamp || new Date().toISOString(),
          user_id: entry.user_id || null,
          document_types: entry.document_types || [],
          features_worked_on: entry.features_worked_on || [],
          key_learnings: entry.key_learnings || [],
          errors_encountered: entry.errors_encountered || [],
          tokens_used: entry.tokens_used || 0,
          processing_time_ms: entry.processing_time_ms || 0,
          notes_quality_metrics: entry.notes_quality_metrics || null,
        })

      if (error) {
        // Log error but don't throw (fail silently)
        console.warn('[PROGRESS LOGGER] Failed to log progress (non-critical):', error.message)
      } else if (FeatureFlags.DEBUG_MEMORY) {
        console.log(`[PROGRESS LOGGER] Logged session ${entry.session_id} (${entry.task_type})`)
      }
    } catch (error) {
      // Fail silently - don't break main flow
      if (FeatureFlags.DEBUG_MEMORY) {
        console.warn('[PROGRESS LOGGER] Exception during logging (non-critical):', error)
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID()
  }

  /**
   * Extract quality metrics from generated notes
   * 
   * Helper function to analyze notes and extract metrics for logging
   */
  static extractQualityMetrics(notes: any): ProgressLogEntry['notes_quality_metrics'] {
    if (!notes) return undefined

    const metrics: ProgressLogEntry['notes_quality_metrics'] = {}

    // Count formulas
    if (Array.isArray(notes.formulas)) {
      metrics.formulas_extracted = notes.formulas.length
    }

    // Check for page references
    let hasPageRefs = false
    if (Array.isArray(notes.concepts)) {
      hasPageRefs = notes.concepts.some((c: any) =>
        c.bullets?.some((b: string) => b.includes('(p.') || b.includes('(pp.'))
      )
      metrics.concepts_count = notes.concepts.length
    }

    // Check formulas for page refs
    if (Array.isArray(notes.formulas)) {
      hasPageRefs = hasPageRefs || notes.formulas.some((f: any) => f.page)
    }

    metrics.page_refs_present = hasPageRefs

    // Check for generic content (simple heuristic)
    const genericPhrases = [
      'key point',
      'important aspect',
      'detailed explanation',
      'this section covers',
    ]
    let hasGenericContent = false
    if (Array.isArray(notes.outline)) {
      hasGenericContent = notes.outline.some((item: string) =>
        genericPhrases.some((phrase) => item.toLowerCase().includes(phrase))
      )
    }
    metrics.generic_content_detected = hasGenericContent

    // Count diagrams
    if (Array.isArray(notes.diagrams)) {
      metrics.diagrams_extracted = notes.diagrams.length
    }

    // Count practice questions
    if (Array.isArray(notes.practice_questions)) {
      metrics.practice_questions_count = notes.practice_questions.length
    }

    return metrics
  }
}

