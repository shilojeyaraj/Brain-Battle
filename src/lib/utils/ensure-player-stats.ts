/**
 * Ensure Player Stats Exist
 * 
 * Utility function to ensure a player_stats row exists for a user.
 * Creates default stats if missing, returns existing stats if present.
 * Used by quiz-results and multiplayer-results routes to prevent stats update failures.
 */

import { createAdminClient } from '@/lib/supabase/server-admin'

export interface PlayerStatsRow {
  user_id: string
  level: number
  xp: number
  total_games: number
  total_wins: number
  total_losses: number
  win_streak: number
  best_streak: number
  total_questions_answered: number
  correct_answers: number
  accuracy: number
  average_response_time: number
  daily_streak?: number
  longest_streak?: number
  last_activity_date?: string | null
  favorite_subject?: string | null
  trial_quiz_diagrams_remaining?: number
  quiz_diagrams_this_month?: number
  has_used_trial_quiz_diagrams?: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Ensure player_stats row exists for a user
 * Creates default stats if missing, returns existing stats if present
 * 
 * @param userId - The user's ID
 * @param initialValues - Optional initial values for new stats (e.g., from first quiz)
 * @returns Player stats row (existing or newly created)
 */
export async function ensurePlayerStatsExists(
  userId: string,
  initialValues?: {
    xp?: number
    total_questions_answered?: number
    correct_answers?: number
    accuracy?: number
    average_response_time?: number
    favorite_subject?: string
  }
): Promise<PlayerStatsRow | null> {
  const adminClient = createAdminClient()

  try {
    // Check if stats exist
    const { data: existingStats, error: fetchError } = await adminClient
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If stats exist, return them
    if (existingStats && !fetchError) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [ENSURE STATS] Stats exist for user ${userId}`)
      }
      return existingStats as PlayerStatsRow
    }

    // Stats don't exist, create them
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ [ENSURE STATS] Creating missing stats for user ${userId}`)
    }

    const safeXP = initialValues?.xp ?? 0
    const safeTotalQuestions = initialValues?.total_questions_answered ?? 0
    const safeCorrectAnswers = initialValues?.correct_answers ?? 0
    const safeAccuracy = initialValues?.accuracy ?? (safeTotalQuestions > 0 ? (safeCorrectAnswers / safeTotalQuestions) * 100 : 0)
    const safeAverageTime = initialValues?.average_response_time ?? 30

    const defaultStats = {
      user_id: userId,
      level: Math.floor(safeXP / 1000) + 1,
      xp: safeXP,
      total_games: 0, // Will be incremented when stats are updated
      total_wins: 0,
      total_losses: 0,
      win_streak: 0,
      best_streak: 0,
      total_questions_answered: safeTotalQuestions,
      correct_answers: safeCorrectAnswers,
      accuracy: safeAccuracy,
      average_response_time: safeAverageTime,
      favorite_subject: initialValues?.favorite_subject || null,
      daily_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      // Initialize free trial: 3 trial quiz diagrams
      trial_quiz_diagrams_remaining: 3,
      quiz_diagrams_this_month: 0,
      has_used_trial_quiz_diagrams: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newStats, error: createError } = await adminClient
      .from('player_stats')
      .insert(defaultStats)
      .select()
      .single()

    if (createError) {
      // If it's a duplicate key error, stats were created by another process
      if (createError.code === '23505') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ [ENSURE STATS] Stats created by another process, fetching...`)
        }
        // Fetch the stats that were just created
        const { data: fetchedStats } = await adminClient
          .from('player_stats')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (fetchedStats) {
          return fetchedStats as PlayerStatsRow
        }
      }
      
      console.error(`❌ [ENSURE STATS] Error creating player stats for ${userId}:`, createError)
      return null
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [ENSURE STATS] Created player stats for user ${userId}`)
    }

    return newStats as PlayerStatsRow
  } catch (error) {
    console.error(`❌ [ENSURE STATS] Exception ensuring player stats for ${userId}:`, error)
    return null
  }
}

 * Ensure Player Stats Exists
 * 
 * Utility function to ensure a player_stats row exists for a user.
 * Creates default stats if missing, returns existing stats if present.
 * 
 * This is critical for stats updates to work correctly - if stats don't exist,
 * UPDATE queries will silently fail (no rows affected).
 */

import { createAdminClient } from '@/lib/supabase/server-admin'

export interface PlayerStats {
  user_id: string
  level: number
  xp: number
  total_games: number
  total_wins: number
  total_losses: number
  win_streak: number
  best_streak: number
  total_questions_answered: number
  correct_answers: number
  accuracy: number
  average_response_time: number
  favorite_subject: string | null
  daily_streak: number | null
  longest_streak: number | null
  last_activity_date: string | null
  trial_quiz_diagrams_remaining: number
  quiz_diagrams_this_month: number
  has_used_trial_quiz_diagrams: boolean
  created_at: string
  updated_at: string
}

/**
 * Ensure player_stats row exists for a user
 * Creates default stats if missing, returns existing stats if present
 * 
 * @param userId - The user's ID
 * @param initialValues - Optional initial values for new stats (e.g., from first quiz)
 * @returns Player stats object (existing or newly created)
 */
export async function ensurePlayerStatsExists(
  userId: string,
  initialValues?: {
    xp?: number
    total_games?: number
    total_wins?: number
    correct_answers?: number
    total_questions_answered?: number
    accuracy?: number
    favorite_subject?: string
    average_response_time?: number
  }
): Promise<PlayerStats | null> {
  const adminClient = createAdminClient()

  try {
    // Check if stats already exist
    const { data: existingStats, error: fetchError } = await adminClient
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If stats exist, return them
    if (existingStats && !fetchError) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [ENSURE STATS] Stats exist for user ${userId}`)
      }
      return existingStats as PlayerStats
    }

    // Stats don't exist - create them
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ [ENSURE STATS] Stats missing for user ${userId}, creating default stats...`)
    }

    // Calculate initial values
    const initialXP = initialValues?.xp || 0
    const initialLevel = Math.floor(initialXP / 1000) + 1
    const initialGames = initialValues?.total_games || 0
    const initialWins = initialValues?.total_wins || 0
    const initialCorrect = initialValues?.correct_answers || 0
    const initialTotal = initialValues?.total_questions_answered || 0
    const initialAccuracy = initialValues?.accuracy ?? (initialTotal > 0 ? (initialCorrect / initialTotal) * 100 : 0)
    const initialAvgTime = initialValues?.average_response_time || 30

    const defaultStats = {
      user_id: userId,
      level: initialLevel,
      xp: initialXP,
      total_games: initialGames,
      total_wins: initialWins,
      total_losses: 0,
      win_streak: initialWins > 0 ? 1 : 0,
      best_streak: initialWins > 0 ? 1 : 0,
      total_questions_answered: initialTotal,
      correct_answers: initialCorrect,
      accuracy: initialAccuracy,
      average_response_time: initialAvgTime,
      favorite_subject: initialValues?.favorite_subject || null,
      daily_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      // Initialize free trial: 3 trial quiz diagrams
      trial_quiz_diagrams_remaining: 3,
      quiz_diagrams_this_month: 0,
      has_used_trial_quiz_diagrams: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newStats, error: createError } = await adminClient
      .from('player_stats')
      .insert(defaultStats)
      .select()
      .single()

    if (createError) {
      // Check if it's a duplicate key error (race condition - stats created by another request)
      if (createError.code === '23505') {
        // Stats were created by another request, fetch them
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ [ENSURE STATS] Race condition detected, fetching existing stats...`)
        }
        const { data: raceConditionStats } = await adminClient
          .from('player_stats')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (raceConditionStats) {
          return raceConditionStats as PlayerStats
        }
      }

      console.error(`❌ [ENSURE STATS] Error creating player stats for ${userId}:`, createError)
      return null
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [ENSURE STATS] Created default stats for user ${userId}`)
    }

    return newStats as PlayerStats
  } catch (error) {
    console.error(`❌ [ENSURE STATS] Exception ensuring player stats for ${userId}:`, error)
    return null
  }
}

