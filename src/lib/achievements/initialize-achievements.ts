/**
 * Initialize achievement definitions in the database
 * Ensures all achievements are available even if migration wasn't run
 */

import { createAdminClient } from '@/lib/supabase/server-admin'
import { ensureAchievementTablesExist } from './ensure-tables-exist'

const ACHIEVEMENT_DEFINITIONS = [
  // WIN-BASED ACHIEVEMENTS
  { code: 'first_win', name: 'First Victory', description: 'Win your first quiz battle', icon: 'trophy', category: 'wins', rarity: 'common', xp_reward: 50, requirement_type: 'win_count', requirement_value: { count: 1 } },
  { code: 'decade_warrior', name: 'Decade Warrior', description: 'Win 10 quiz battles', icon: 'star', category: 'wins', rarity: 'rare', xp_reward: 200, requirement_type: 'win_count', requirement_value: { count: 10 } },
  { code: 'century_champion', name: 'Century Champion', description: 'Win 100 quiz battles', icon: 'crown', category: 'wins', rarity: 'epic', xp_reward: 1000, requirement_type: 'win_count', requirement_value: { count: 100 } },
  { code: 'undefeated', name: 'Undefeated', description: 'Win 5 battles in a row', icon: 'shield', category: 'wins', rarity: 'rare', xp_reward: 300, requirement_type: 'win_streak', requirement_value: { count: 5 } },
  { code: 'unbeatable', name: 'Unbeatable', description: 'Win 10 battles in a row', icon: 'crown', category: 'wins', rarity: 'epic', xp_reward: 750, requirement_type: 'win_streak', requirement_value: { count: 10 } },
  
  // STREAK-BASED ACHIEVEMENTS
  { code: 'streak_3_days', name: 'Consistency Starter', description: 'Maintain a 3-day study streak', icon: 'flame', category: 'streaks', rarity: 'common', xp_reward: 100, requirement_type: 'daily_streak', requirement_value: { days: 3 } },
  { code: 'streak_7_days', name: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: 'flame', category: 'streaks', rarity: 'rare', xp_reward: 250, requirement_type: 'daily_streak', requirement_value: { days: 7 } },
  { code: 'streak_14_days', name: 'Fortnight Fighter', description: 'Maintain a 14-day study streak', icon: 'flame', category: 'streaks', rarity: 'rare', xp_reward: 500, requirement_type: 'daily_streak', requirement_value: { days: 14 } },
  { code: 'streak_30_days', name: 'Monthly Master', description: 'Maintain a 30-day study streak', icon: 'flame', category: 'streaks', rarity: 'epic', xp_reward: 1000, requirement_type: 'daily_streak', requirement_value: { days: 30 } },
  { code: 'streak_100_days', name: 'Centurion', description: 'Maintain a 100-day study streak', icon: 'flame', category: 'streaks', rarity: 'legendary', xp_reward: 5000, requirement_type: 'daily_streak', requirement_value: { days: 100 } },
  
  // ACCURACY-BASED ACHIEVEMENTS
  { code: 'sharp_shooter', name: 'Sharp Shooter', description: 'Achieve 80% accuracy or higher', icon: 'target', category: 'accuracy', rarity: 'rare', xp_reward: 200, requirement_type: 'accuracy_threshold', requirement_value: { threshold: 80 } },
  { code: 'marksman', name: 'Marksman', description: 'Achieve 90% accuracy or higher', icon: 'target', category: 'accuracy', rarity: 'epic', xp_reward: 500, requirement_type: 'accuracy_threshold', requirement_value: { threshold: 90 } },
  { code: 'perfect_score', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: 'star', category: 'accuracy', rarity: 'epic', xp_reward: 750, requirement_type: 'perfect_score', requirement_value: { count: 1 } },
  { code: 'perfectionist', name: 'Perfectionist', description: 'Get 100% on 5 quizzes', icon: 'crown', category: 'accuracy', rarity: 'legendary', xp_reward: 2000, requirement_type: 'perfect_score', requirement_value: { count: 5 } },
  
  // ACTIVITY-BASED ACHIEVEMENTS
  { code: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Answer 100 questions', icon: 'book', category: 'activity', rarity: 'common', xp_reward: 150, requirement_type: 'questions_answered', requirement_value: { count: 100 } },
  { code: 'scholar', name: 'Scholar', description: 'Answer 500 questions', icon: 'book', category: 'activity', rarity: 'rare', xp_reward: 500, requirement_type: 'questions_answered', requirement_value: { count: 500 } },
  { code: 'master_student', name: 'Master Student', description: 'Answer 1,000 questions', icon: 'graduation-cap', category: 'activity', rarity: 'epic', xp_reward: 1500, requirement_type: 'questions_answered', requirement_value: { count: 1000 } },
  { code: 'quiz_master', name: 'Quiz Master', description: 'Complete 50 quiz sessions', icon: 'trophy', category: 'activity', rarity: 'rare', xp_reward: 400, requirement_type: 'sessions_completed', requirement_value: { count: 50 } },
  { code: 'dedicated_learner', name: 'Dedicated Learner', description: 'Complete 200 quiz sessions', icon: 'crown', category: 'activity', rarity: 'epic', xp_reward: 2000, requirement_type: 'sessions_completed', requirement_value: { count: 200 } },
  
  // LEVEL-BASED ACHIEVEMENTS
  { code: 'level_10', name: 'Rising Star', description: 'Reach level 10', icon: 'star', category: 'level', rarity: 'common', xp_reward: 200, requirement_type: 'level_reached', requirement_value: { level: 10 } },
  { code: 'level_25', name: 'Experienced', description: 'Reach level 25', icon: 'star', category: 'level', rarity: 'rare', xp_reward: 500, requirement_type: 'level_reached', requirement_value: { level: 25 } },
  { code: 'level_50', name: 'Veteran', description: 'Reach level 50', icon: 'crown', category: 'level', rarity: 'epic', xp_reward: 1500, requirement_type: 'level_reached', requirement_value: { level: 50 } },
  { code: 'level_100', name: 'Legend', description: 'Reach level 100', icon: 'crown', category: 'level', rarity: 'legendary', xp_reward: 5000, requirement_type: 'level_reached', requirement_value: { level: 100 } },
  
  // SPECIAL ACHIEVEMENTS
  { code: 'first_quiz', name: 'First Steps', description: 'Complete your first quiz', icon: 'rocket', category: 'special', rarity: 'common', xp_reward: 25, requirement_type: 'sessions_completed', requirement_value: { count: 1 } },
  { code: 'speed_demon', name: 'Speed Demon', description: 'Answer a question in under 5 seconds', icon: 'zap', category: 'special', rarity: 'rare', xp_reward: 150, requirement_type: 'speed_answer', requirement_value: { seconds: 5 } },
  { code: 'social_butterfly', name: 'Social Butterfly', description: 'Join 10 multiplayer rooms', icon: 'users', category: 'special', rarity: 'rare', xp_reward: 300, requirement_type: 'rooms_joined', requirement_value: { count: 10 } },
  { code: 'team_player', name: 'Team Player', description: 'Win 5 multiplayer battles', icon: 'users', category: 'special', rarity: 'epic', xp_reward: 600, requirement_type: 'multiplayer_wins', requirement_value: { count: 5 } },
  { code: 'early_adopter', name: 'Early Adopter', description: 'Join Brain Battle in the first month', icon: 'sparkles', category: 'special', rarity: 'rare', xp_reward: 500, requirement_type: 'account_age', requirement_value: { days: 30 } },
]

/**
 * Ensures all achievement definitions exist in the database
 * This is a safety net in case migrations weren't run
 */
export async function ensureAchievementDefinitions(): Promise<boolean> {
  const adminClient = createAdminClient()

  try {
    // First, ensure tables exist
    const tablesExist = await ensureAchievementTablesExist()
    if (!tablesExist) {
      console.error('❌ [ACHIEVEMENTS] Achievement tables do not exist. Please run the migration: supabase/migrations/create-achievements-system.sql')
      return false
    }

    // Check if any achievements exist
    const { data: existing, error: checkError } = await adminClient
      .from('achievement_definitions')
      .select('code')
      .limit(1)

    if (checkError) {
      // If it's still a table not found error, tables weren't created
      if (checkError.code === 'PGRST205') {
        console.error('❌ [ACHIEVEMENTS] achievement_definitions table still does not exist after creation attempt. Please run the migration manually.')
        return false
      }
      console.error('❌ [ACHIEVEMENTS] Error checking achievement definitions:', checkError)
      return false
    }

    // If achievements exist, we're good
    if (existing && existing.length > 0) {
      return true
    }

    // Insert all achievement definitions
    console.log('📝 [ACHIEVEMENTS] Initializing achievement definitions...')
    
    const { error: insertError } = await adminClient
      .from('achievement_definitions')
      .insert(ACHIEVEMENT_DEFINITIONS.map(def => ({
        ...def,
        requirement_value: def.requirement_value as any,
        is_active: true,
      })))

    if (insertError) {
      // If it's a conflict error, that's okay - achievements already exist
      if (insertError.code === '23505') {
        console.log('✅ [ACHIEVEMENTS] Achievement definitions already exist')
        return true
      }
      
      console.error('❌ [ACHIEVEMENTS] Error inserting achievement definitions:', insertError)
      return false
    }

    console.log(`✅ [ACHIEVEMENTS] Initialized ${ACHIEVEMENT_DEFINITIONS.length} achievement definitions`)
    return true
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Unexpected error initializing achievements:', error)
    return false
  }
}

