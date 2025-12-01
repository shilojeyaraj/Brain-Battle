/**
 * Achievement Checker
 * Handles checking and unlocking achievements for users
 */

import { createAdminClient } from '@/lib/supabase/server-admin'
import type { UserAchievement, AchievementDefinition } from './achievement-types'
import { ensureAchievementDefinitions } from './initialize-achievements'

export interface UnlockedAchievement {
  code: string
  name: string
  description: string
  icon: string
  rarity: string
  xp_reward: number
}

/**
 * Check and unlock achievements for a user based on their current stats
 * Returns list of newly unlocked achievements
 */
export async function checkAndUnlockAchievements(
  userId: string
): Promise<UnlockedAchievement[]> {
  const adminClient = createAdminClient()

  try {
    // Call the database function to check and unlock achievements
    const { data, error } = await adminClient
      .rpc('check_and_unlock_achievements', { p_user_id: userId })

    if (error) {
      console.error('❌ [ACHIEVEMENTS] Error checking achievements:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    const result = data[0]
    const unlocked = result.unlocked_achievements as UnlockedAchievement[]

    if (unlocked && unlocked.length > 0) {
      console.log(`✅ [ACHIEVEMENTS] Unlocked ${unlocked.length} achievement(s) for user ${userId}`)
      unlocked.forEach(achievement => {
        console.log(`  🏆 ${achievement.name} (+${achievement.xp_reward} XP)`)
      })
    }

    return unlocked || []
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Unexpected error checking achievements:', error)
    return []
  }
}

/**
 * Check for custom achievements that require application-level logic
 * (e.g., perfect_score, speed_answer, multiplayer_wins)
 */
export async function checkCustomAchievements(
  userId: string,
  context: {
    isPerfectScore?: boolean
    answerTime?: number
    isMultiplayer?: boolean
    isWin?: boolean
  }
): Promise<UnlockedAchievement[]> {
  const adminClient = createAdminClient()
  const unlocked: UnlockedAchievement[] = []

  try {
    // Check if user already has these achievements
    const { data: existingAchievements } = await adminClient
      .from('achievements')
      .select('achievement_code')
      .eq('user_id', userId)
      .in('achievement_code', ['perfect_score', 'perfectionist', 'speed_demon'])

    const existingCodes = new Set(
      existingAchievements?.map(a => a.achievement_code) || []
    )

    // Check perfect score achievements
    if (context.isPerfectScore) {
      // Check for single perfect score
      if (!existingCodes.has('perfect_score')) {
        const { data: achievement } = await adminClient
          .from('achievement_definitions')
          .select('*')
          .eq('code', 'perfect_score')
          .single()

        if (achievement) {
          await unlockAchievement(userId, achievement.code, adminClient)
          unlocked.push({
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            rarity: achievement.rarity,
            xp_reward: achievement.xp_reward,
          })
        }
      }

      // Check for perfectionist (5 perfect scores)
      if (!existingCodes.has('perfectionist')) {
        const { data: perfectScores } = await adminClient
          .from('game_results')
          .select('id')
          .eq('user_id', userId)
          .eq('questions_answered', 'correct_answers') // Perfect score
          .limit(5)

        if (perfectScores && perfectScores.length >= 5) {
          const { data: achievement } = await adminClient
            .from('achievement_definitions')
            .select('*')
            .eq('code', 'perfectionist')
            .single()

          if (achievement) {
            await unlockAchievement(userId, achievement.code, adminClient)
            unlocked.push({
              code: achievement.code,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              rarity: achievement.rarity,
              xp_reward: achievement.xp_reward,
            })
          }
        }
      }
    }

    // Check speed demon (answer in under 5 seconds)
    if (context.answerTime && context.answerTime < 5 && !existingCodes.has('speed_demon')) {
      const { data: achievement } = await adminClient
        .from('achievement_definitions')
        .select('*')
        .eq('code', 'speed_demon')
        .single()

      if (achievement) {
        await unlockAchievement(userId, achievement.code, adminClient)
        unlocked.push({
          code: achievement.code,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          xp_reward: achievement.xp_reward,
        })
      }
    }

    // Check multiplayer achievements
    if (context.isMultiplayer && context.isWin) {
      // Check team_player (5 multiplayer wins)
      if (!existingCodes.has('team_player')) {
        // Count multiplayer wins (sessions with room_id and 60%+ accuracy)
        // Fetch all multiplayer results, then filter for 60%+ accuracy in JavaScript
        const { data: allMultiplayerResults } = await adminClient
          .from('game_results')
          .select(`
            id,
            correct_answers,
            questions_answered,
            session_id,
            quiz_sessions!inner(room_id)
          `)
          .eq('user_id', userId)
          .not('quiz_sessions.room_id', 'is', null)

        // Filter for wins (60%+ accuracy) in JavaScript
        const multiplayerWins = allMultiplayerResults?.filter(
          (result: any) => result.questions_answered > 0 && 
          result.correct_answers >= result.questions_answered * 0.6
        ) || []

        if (multiplayerWins.length >= 5) {
          const { data: achievement } = await adminClient
            .from('achievement_definitions')
            .select('*')
            .eq('code', 'team_player')
            .single()

          if (achievement) {
            await unlockAchievement(userId, achievement.code, adminClient)
            unlocked.push({
              code: achievement.code,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              rarity: achievement.rarity,
              xp_reward: achievement.xp_reward,
            })
          }
        }
      }
    }

    return unlocked
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Error checking custom achievements:', error)
    return unlocked
  }
}

/**
 * Helper function to unlock an achievement
 */
async function unlockAchievement(
  userId: string,
  achievementCode: string,
  adminClient: ReturnType<typeof createAdminClient>
) {
  try {
    // Get achievement definition
    const { data: achievement } = await adminClient
      .from('achievement_definitions')
      .select('*')
      .eq('code', achievementCode)
      .single()

    if (!achievement) {
      console.warn(`⚠️ [ACHIEVEMENTS] Achievement definition not found: ${achievementCode}`)
      return
    }

    // Insert achievement (with conflict handling)
    const { error: insertError } = await adminClient
      .from('achievements')
      .insert({
        user_id: userId,
        achievement_code: achievementCode,
        progress: {},
        xp_earned: achievement.xp_reward,
      })

    if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
      console.error(`❌ [ACHIEVEMENTS] Error unlocking achievement ${achievementCode}:`, insertError)
      return
    }

    // Award XP bonus
    if (achievement.xp_reward > 0) {
      // Get current XP and increment
      const { data: currentStats } = await adminClient
        .from('player_stats')
        .select('xp')
        .eq('user_id', userId)
        .single()

      if (currentStats) {
        await adminClient
          .from('player_stats')
          .update({
            xp: (currentStats.xp || 0) + achievement.xp_reward,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      }
    }

    console.log(`✅ [ACHIEVEMENTS] Unlocked ${achievement.name} for user ${userId}`)
  } catch (error) {
    console.error(`❌ [ACHIEVEMENTS] Error in unlockAchievement:`, error)
  }
}

/**
 * Get all achievements for a user with their definitions
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const adminClient = createAdminClient()

  try {
    const { data, error } = await adminClient
      .from('achievements')
      .select(`
        *,
        achievement_definitions (
          name,
          description,
          icon,
          category,
          rarity
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('❌ [ACHIEVEMENTS] Error fetching user achievements:', error)
      return []
    }

    // Flatten the joined data
    return (data || []).map((achievement: any) => ({
      id: achievement.id,
      user_id: achievement.user_id,
      achievement_code: achievement.achievement_code,
      progress: achievement.progress || {},
      earned_at: achievement.earned_at,
      xp_earned: achievement.xp_earned,
      name: achievement.achievement_definitions?.name,
      description: achievement.achievement_definitions?.description,
      icon: achievement.achievement_definitions?.icon,
      category: achievement.achievement_definitions?.category,
      rarity: achievement.achievement_definitions?.rarity,
    }))
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Error fetching user achievements:', error)
    return []
  }
}

/**
 * Get all available achievement definitions
 */
export async function getAllAchievementDefinitions(): Promise<AchievementDefinition[]> {
  const adminClient = createAdminClient()

  try {
    // Ensure achievements are initialized (this also ensures tables exist)
    const initialized = await ensureAchievementDefinitions()
    if (!initialized) {
      console.error('❌ [ACHIEVEMENTS] Failed to initialize achievement definitions')
      return []
    }

    const { data, error } = await adminClient
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('rarity', { ascending: true })

    if (error) {
      console.error('❌ [ACHIEVEMENTS] Error fetching achievement definitions:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [ACHIEVEMENTS] No achievement definitions found in database')
      return []
    }

    return data.map((def: any) => ({
      id: def.id,
      code: def.code,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      rarity: def.rarity,
      xp_reward: def.xp_reward,
      requirement_type: def.requirement_type,
      requirement_value: def.requirement_value,
      is_active: def.is_active,
    }))
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Error fetching achievement definitions:', error)
    return []
  }
}

