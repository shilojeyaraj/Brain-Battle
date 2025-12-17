/**
 * Feature Backlog
 * 
 * Machine-readable feature list with pass/fail criteria.
 * This is the "domain memory" - what the agent remembers across sessions.
 * 
 * Each feature has:
 * - Status: passing, failing, or untested
 * - Criteria: Testable requirements
 * - Test functions: Functions that validate the feature
 * - Learnings: What worked/didn't work
 * 
 * The agent reads this backlog to understand what needs improvement
 * and focuses on one failing feature at a time.
 * 
 * @module lib/domain-memory/feature-backlog
 */

import { createAdminClient } from '@/lib/supabase/server-admin'
import { FeatureFlags } from '@/lib/config/feature-flags'

/**
 * Feature from backlog
 */
export interface Feature {
  id: string
  feature_id: string
  title: string
  description: string | null
  status: 'passing' | 'failing' | 'untested'
  criteria: string[]
  test_functions: string[]
  last_updated: string
  attempts: number
  learnings: string[] | null
}

/**
 * Feature Backlog Class
 * 
 * Manages the feature backlog - the machine-readable list of
 * features that need improvement.
 */
export class FeatureBacklog {
  /**
   * Get all features
   * 
   * @param status - Optional filter by status
   * @returns Array of features
   */
  static async getFeatures(status?: 'passing' | 'failing' | 'untested'): Promise<Feature[]> {
    if (!FeatureFlags.FEATURE_BACKLOG) {
      if (FeatureFlags.DEBUG_MEMORY) {
        console.log('[FEATURE BACKLOG] Feature disabled, returning empty features')
      }
      return []
    }

    try {
      const adminClient = createAdminClient()

      let query = adminClient.from('feature_backlog').select('*').order('last_updated', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.warn('[FEATURE BACKLOG] Error retrieving features:', error)
        return []
      }

      return (data || []).map(this.mapToFeature)
    } catch (error) {
      console.warn('[FEATURE BACKLOG] Exception retrieving features:', error)
      return []
    }
  }

  /**
   * Get failing features (what needs work)
   */
  static async getFailingFeatures(): Promise<Feature[]> {
    return this.getFeatures('failing')
  }

  /**
   * Get a specific feature by ID
   */
  static async getFeature(featureId: string): Promise<Feature | null> {
    if (!FeatureFlags.FEATURE_BACKLOG) {
      return null
    }

    try {
      const adminClient = createAdminClient()

      const { data, error } = await adminClient
        .from('feature_backlog')
        .select('*')
        .eq('feature_id', featureId)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToFeature(data)
    } catch (error) {
      console.warn('[FEATURE BACKLOG] Exception retrieving feature:', error)
      return null
    }
  }

  /**
   * Update feature status
   * 
   * @param featureId - Feature ID to update
   * @param status - New status
   * @param learnings - Optional learnings to add
   */
  static async updateFeatureStatus(
    featureId: string,
    status: 'passing' | 'failing' | 'untested',
    learnings?: string[]
  ): Promise<boolean> {
    if (!FeatureFlags.FEATURE_BACKLOG) {
      return false
    }

    try {
      const adminClient = createAdminClient()

      // Get current feature
      const feature = await this.getFeature(featureId)
      if (!feature) {
        return false
      }

      // Update status and learnings
      const updateData: any = {
        status,
        last_updated: new Date().toISOString(),
        attempts: feature.attempts + 1,
      }

      if (learnings && learnings.length > 0) {
        const existingLearnings = feature.learnings || []
        updateData.learnings = [...existingLearnings, ...learnings]
      }

      const { error } = await adminClient.from('feature_backlog').update(updateData).eq('feature_id', featureId)

      if (error) {
        console.warn('[FEATURE BACKLOG] Error updating feature:', error)
        return false
      }

      if (FeatureFlags.DEBUG_MEMORY) {
        console.log(`[FEATURE BACKLOG] Updated feature ${featureId} to status: ${status}`)
      }

      return true
    } catch (error) {
      console.warn('[FEATURE BACKLOG] Exception updating feature:', error)
      return false
    }
  }

  /**
   * Map database row to Feature interface
   */
  private static mapToFeature(row: any): Feature {
    return {
      id: row.id,
      feature_id: row.feature_id,
      title: row.title,
      description: row.description,
      status: row.status,
      criteria: row.criteria || [],
      test_functions: row.test_functions || [],
      last_updated: row.last_updated,
      attempts: row.attempts || 0,
      learnings: row.learnings || null,
    }
  }
}

