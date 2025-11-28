/**
 * Achievement Types and Definitions
 * Centralized type definitions for the achievements system
 */

export type AchievementCategory = 
  | 'wins' 
  | 'streaks' 
  | 'accuracy' 
  | 'activity' 
  | 'level' 
  | 'special'

export type AchievementRarity = 
  | 'common' 
  | 'rare' 
  | 'epic' 
  | 'legendary'

export type RequirementType =
  | 'win_count'
  | 'win_streak'
  | 'daily_streak'
  | 'accuracy_threshold'
  | 'questions_answered'
  | 'sessions_completed'
  | 'level_reached'
  | 'perfect_score'
  | 'speed_answer'
  | 'multiplayer_wins'
  | 'rooms_joined'
  | 'account_age'
  | 'custom'

export interface AchievementDefinition {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  xp_reward: number
  requirement_type: RequirementType
  requirement_value: Record<string, any>
  is_active: boolean
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_code: string
  progress: {
    current?: number
    target?: number
    [key: string]: any
  }
  earned_at: string
  xp_earned: number
  // Joined from achievement_definitions
  name?: string
  description?: string
  icon?: string
  category?: AchievementCategory
  rarity?: AchievementRarity
}

export interface AchievementProgress {
  current: number
  target: number
  percentage: number
  is_complete: boolean
}

/**
 * Icon mapping for achievements
 */
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  trophy: 'Trophy',
  star: 'Star',
  crown: 'Crown',
  shield: 'Shield',
  flame: 'Flame',
  target: 'Target',
  book: 'Book',
  'graduation-cap': 'GraduationCap',
  rocket: 'Rocket',
  zap: 'Zap',
  users: 'Users',
  sparkles: 'Sparkles',
}

/**
 * Rarity color mapping
 */
export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-orange-500',
}

/**
 * Rarity border colors
 */
export const RARITY_BORDER_COLORS: Record<AchievementRarity, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-orange-400',
}

