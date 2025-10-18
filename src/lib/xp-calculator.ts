export interface GameResult {
  correctAnswers: number
  totalQuestions: number
  averageTimePerQuestion: number
  difficulty: 'easy' | 'medium' | 'hard'
  winStreak: number
  isPerfectScore: boolean
  isMultiplayer: boolean
  rank?: number // For multiplayer games
}

export interface XPBreakdown {
  baseXP: number
  difficultyMultiplier: number
  speedBonus: number
  perfectScoreBonus: number
  streakBonus: number
  rankBonus: number
  totalXP: number
}

const DIFFICULTY_MULTIPLIERS = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0
}

const RANK_BONUSES = {
  1: 200, // 1st place
  2: 150, // 2nd place  
  3: 100, // 3rd place
  4: 50   // 4th place and below
}

const PERFECT_SCORE_BONUS = 100
const MAX_SPEED_BONUS = 50
const STREAK_BONUS_PER_WIN = 10

export function calculateXP(gameResult: GameResult): XPBreakdown {
  const {
    correctAnswers,
    totalQuestions,
    averageTimePerQuestion,
    difficulty,
    winStreak,
    isPerfectScore,
    isMultiplayer,
    rank
  } = gameResult

  // Base XP calculation
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) : 0
  const baseXP = Math.round(accuracy * 100)

  // Difficulty multiplier
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty]
  const adjustedBaseXP = Math.round(baseXP * difficultyMultiplier)

  // Speed bonus (faster = more bonus, up to 50 XP)
  // Target time is 10 seconds per question, bonus decreases after that
  const targetTime = 10
  const speedBonus = Math.max(0, Math.min(MAX_SPEED_BONUS, MAX_SPEED_BONUS - (averageTimePerQuestion - targetTime) * 2))

  // Perfect score bonus
  const perfectScoreBonus = isPerfectScore ? PERFECT_SCORE_BONUS : 0

  // Streak bonus
  const streakBonus = Math.min(winStreak * STREAK_BONUS_PER_WIN, 100) // Cap at 100 XP

  // Rank bonus (multiplayer only)
  let rankBonus = 0
  if (isMultiplayer && rank) {
    rankBonus = RANK_BONUSES[rank as keyof typeof RANK_BONUSES] || RANK_BONUSES[4]
  }

  // Calculate total XP
  const totalXP = adjustedBaseXP + Math.round(speedBonus) + perfectScoreBonus + streakBonus + rankBonus

  return {
    baseXP: adjustedBaseXP,
    difficultyMultiplier,
    speedBonus: Math.round(speedBonus),
    perfectScoreBonus,
    streakBonus,
    rankBonus,
    totalXP
  }
}

export function getXPExplanation(breakdown: XPBreakdown, gameResult: GameResult): string[] {
  const explanations: string[] = []
  
  explanations.push(`Base XP: ${breakdown.baseXP} (${((gameResult.correctAnswers / gameResult.totalQuestions) * 100).toFixed(1)}% accuracy)`)
  
  if (breakdown.difficultyMultiplier > 1) {
    explanations.push(`Difficulty Bonus: ${gameResult.difficulty} (${breakdown.difficultyMultiplier}x multiplier)`)
  }
  
  if (breakdown.speedBonus > 0) {
    explanations.push(`Speed Bonus: +${breakdown.speedBonus} XP (fast completion)`)
  }
  
  if (breakdown.perfectScoreBonus > 0) {
    explanations.push(`Perfect Score: +${breakdown.perfectScoreBonus} XP`)
  }
  
  if (breakdown.streakBonus > 0) {
    explanations.push(`Win Streak: +${breakdown.streakBonus} XP (${gameResult.winStreak} wins)`)
  }
  
  if (breakdown.rankBonus > 0) {
    const rankNames = ['1st', '2nd', '3rd', '4th+']
    const rankName = gameResult.rank && gameResult.rank <= 3 ? rankNames[gameResult.rank - 1] : '4th+'
    explanations.push(`Rank Bonus: +${breakdown.rankBonus} XP (${rankName} place)`)
  }
  
  return explanations
}

export function calculateLevelFromXP(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

export function getCurrentLevel(xp: number): number {
  return calculateLevelFromXP(xp)
}

export function getXPToNextLevel(xp: number): number {
  const level = calculateLevelFromXP(xp)
  const nextLevelXP = level * 1000
  return nextLevelXP - xp
}

export function checkLevelUp(oldXP: number, newXP: number): boolean {
  const oldLevel = calculateLevelFromXP(oldXP)
  const newLevel = calculateLevelFromXP(newXP)
  return newLevel > oldLevel
}

export function getLevelUpInfo(oldXP: number, newXP: number): { leveledUp: boolean; oldLevel: number; newLevel: number; levelsGained: number } {
  const oldLevel = calculateLevelFromXP(oldXP)
  const newLevel = calculateLevelFromXP(newXP)
  const leveledUp = newLevel > oldLevel
  const levelsGained = newLevel - oldLevel
  
  return {
    leveledUp,
    oldLevel,
    newLevel,
    levelsGained
  }
}
