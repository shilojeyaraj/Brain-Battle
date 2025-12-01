/**
 * Maps achievement codes and database icon names to component icon names
 * This bridges the gap between database storage and component rendering
 */

import type { AchievementIconName } from "@/components/achievements/icons/achievement-icons"

/**
 * Maps achievement codes to their corresponding icon component names
 */
export const ACHIEVEMENT_CODE_TO_ICON: Record<string, AchievementIconName> = {
  // Win-based achievements
  first_win: "first-victory",
  decade_warrior: "decade-warrior",
  century_champion: "century-champion",
  undefeated: "undefeated",
  unbeatable: "unbeatable",
  
  // Streak-based achievements
  streak_3_days: "consistency-starter",
  streak_7_days: "week-warrior",
  streak_14_days: "fortnight-fighter",
  streak_30_days: "monthly-master",
  streak_100_days: "centurion",
  
  // Accuracy-based achievements
  sharp_shooter: "sharp-shooter",
  marksman: "marksman",
  perfect_score: "perfect-score",
  perfectionist: "perfectionist",
  
  // Activity-based achievements
  knowledge_seeker: "knowledge-seeker",
  scholar: "scholar",
  master_student: "master-student",
  quiz_master: "quiz-master",
  dedicated_learner: "dedicated-learner",
  
  // Level-based achievements
  level_10: "rising-star",
  level_25: "experienced",
  level_50: "veteran",
  level_100: "legend",
  
  // Special achievements
  first_quiz: "first-steps",
  speed_demon: "speed-demon",
  social_butterfly: "social-butterfly",
  team_player: "team-player",
  early_adopter: "early-adopter",
}

/**
 * Gets the icon component name for an achievement code
 */
export function getAchievementIconName(achievementCode: string): AchievementIconName | undefined {
  return ACHIEVEMENT_CODE_TO_ICON[achievementCode]
}

