/**
 * Ensure Achievement Tables Exist
 * 
 * Checks if achievement tables exist in the database.
 * Provides helpful error messages if migrations need to be run.
 */

import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Checks if the achievement_definitions table exists
 */
async function checkAchievementDefinitionsTable(): Promise<boolean> {
  const adminClient = createAdminClient()
  
  try {
    const { error } = await adminClient
      .from('achievement_definitions')
      .select('id')
      .limit(1)

    // If no error, table exists
    if (!error) {
      return true
    }

    // PGRST205 means table not found
    if (error.code === 'PGRST205') {
      return false
    }

    // Other errors might mean table exists but has issues
    return false
  } catch (error) {
    return false
  }
}

/**
 * Checks if the achievements table exists
 */
async function checkAchievementsTable(): Promise<boolean> {
  const adminClient = createAdminClient()
  
  try {
    const { error } = await adminClient
      .from('achievements')
      .select('id')
      .limit(1)

    // If no error, table exists
    if (!error) {
      return true
    }

    // PGRST205 means table not found
    if (error.code === 'PGRST205') {
      return false
    }

    return false
  } catch (error) {
    return false
  }
}

/**
 * Ensures both achievement tables exist
 * Returns true if tables exist, false otherwise
 * Logs helpful error messages if tables don't exist
 */
export async function ensureAchievementTablesExist(): Promise<boolean> {
  try {
    const definitionsExist = await checkAchievementDefinitionsTable()
    const achievementsExist = await checkAchievementsTable()
    
    if (!definitionsExist || !achievementsExist) {
      console.error(`
❌ [ACHIEVEMENTS] Achievement tables do not exist in the database.

To fix this, you need to run the migration:
  supabase/migrations/create-achievements-system.sql

You can run it via:
  1. Supabase Dashboard: Go to SQL Editor and run the migration file
  2. Supabase CLI: supabase db push
  3. Or manually execute the SQL in the migration file

The migration will create:
  - public.achievement_definitions (stores all available achievements)
  - public.achievements (tracks user achievements)
  - Required indexes and RLS policies
      `)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Error checking tables:', error)
    return false
  }
}

