import {
  calculateXP,
  getXPExplanation,
  calculateLevelFromXP,
  getCurrentLevel,
  getXPToNextLevel,
  checkLevelUp,
  getLevelUpInfo,
  type GameResult,
} from './xp-calculator'

describe('XP Calculator', () => {
  const baseResult: GameResult = {
    correctAnswers: 8,
    totalQuestions: 10,
    averageTimePerQuestion: 8,
    difficulty: 'medium',
    winStreak: 0,
    isPerfectScore: false,
    isMultiplayer: false,
  }

  describe('calculateXP', () => {
    it('returns correct structure', () => {
      const breakdown = calculateXP(baseResult)
      expect(breakdown).toHaveProperty('baseXP')
      expect(breakdown).toHaveProperty('difficultyMultiplier')
      expect(breakdown).toHaveProperty('speedBonus')
      expect(breakdown).toHaveProperty('perfectScoreBonus')
      expect(breakdown).toHaveProperty('streakBonus')
      expect(breakdown).toHaveProperty('rankBonus')
      expect(breakdown).toHaveProperty('totalXP')
    })

    it('calculates base XP from accuracy', () => {
      const result = calculateXP({ ...baseResult, correctAnswers: 10, totalQuestions: 10, difficulty: 'easy' })
      // 100% accuracy → base 150, easy multiplier 1.2 → 180
      expect(result.baseXP).toBe(180)
    })

    it('returns 0 base XP for 0 correct answers', () => {
      const result = calculateXP({ ...baseResult, correctAnswers: 0 })
      expect(result.baseXP).toBe(0)
    })

    it('handles 0 total questions gracefully', () => {
      const result = calculateXP({ ...baseResult, correctAnswers: 0, totalQuestions: 0 })
      expect(result.baseXP).toBe(0)
      expect(result.totalXP).toBeGreaterThanOrEqual(0)
    })

    it('applies difficulty multipliers correctly', () => {
      const easy = calculateXP({ ...baseResult, difficulty: 'easy' })
      const medium = calculateXP({ ...baseResult, difficulty: 'medium' })
      const hard = calculateXP({ ...baseResult, difficulty: 'hard' })
      expect(easy.difficultyMultiplier).toBe(1.2)
      expect(medium.difficultyMultiplier).toBe(1.8)
      expect(hard.difficultyMultiplier).toBe(2.5)
      expect(hard.baseXP).toBeGreaterThan(medium.baseXP)
      expect(medium.baseXP).toBeGreaterThan(easy.baseXP)
    })

    it('awards speed bonus for fast answers', () => {
      const fast = calculateXP({ ...baseResult, averageTimePerQuestion: 5 })
      const slow = calculateXP({ ...baseResult, averageTimePerQuestion: 50 })
      expect(fast.speedBonus).toBeGreaterThan(0)
      expect(slow.speedBonus).toBe(0)
    })

    it('awards perfect score bonus', () => {
      const perfect = calculateXP({ ...baseResult, isPerfectScore: true })
      const notPerfect = calculateXP({ ...baseResult, isPerfectScore: false })
      expect(perfect.perfectScoreBonus).toBe(150)
      expect(notPerfect.perfectScoreBonus).toBe(0)
    })

    it('awards streak bonus capped at 150', () => {
      const streak3 = calculateXP({ ...baseResult, winStreak: 3 })
      const streak100 = calculateXP({ ...baseResult, winStreak: 100 })
      expect(streak3.streakBonus).toBe(45) // 3 * 15
      expect(streak100.streakBonus).toBe(150) // capped
    })

    it('awards rank bonus for multiplayer only', () => {
      const sp = calculateXP({ ...baseResult, isMultiplayer: false, rank: 1 })
      const mp1st = calculateXP({ ...baseResult, isMultiplayer: true, rank: 1 })
      const mp2nd = calculateXP({ ...baseResult, isMultiplayer: true, rank: 2 })
      const mp3rd = calculateXP({ ...baseResult, isMultiplayer: true, rank: 3 })
      const mp4th = calculateXP({ ...baseResult, isMultiplayer: true, rank: 4 })
      expect(sp.rankBonus).toBe(0)
      expect(mp1st.rankBonus).toBe(300)
      expect(mp2nd.rankBonus).toBe(225)
      expect(mp3rd.rankBonus).toBe(150)
      expect(mp4th.rankBonus).toBe(75)
    })

    it('totalXP is the sum of all components', () => {
      const result = calculateXP({
        ...baseResult,
        isPerfectScore: true,
        winStreak: 2,
        isMultiplayer: true,
        rank: 1,
      })
      const expectedTotal =
        result.baseXP +
        result.speedBonus +
        result.perfectScoreBonus +
        result.streakBonus +
        result.rankBonus
      expect(result.totalXP).toBe(expectedTotal)
    })
  })

  describe('getXPExplanation', () => {
    it('returns an array of explanation strings', () => {
      const breakdown = calculateXP(baseResult)
      const explanations = getXPExplanation(breakdown, baseResult)
      expect(Array.isArray(explanations)).toBe(true)
      expect(explanations.length).toBeGreaterThan(0)
      expect(explanations[0]).toContain('Base XP')
    })

    it('includes all active bonuses', () => {
      const result: GameResult = {
        ...baseResult,
        isPerfectScore: true,
        winStreak: 3,
        isMultiplayer: true,
        rank: 1,
        averageTimePerQuestion: 5,
      }
      const breakdown = calculateXP(result)
      const explanations = getXPExplanation(breakdown, result)
      const joined = explanations.join(' ')
      expect(joined).toContain('Speed Bonus')
      expect(joined).toContain('Perfect Score')
      expect(joined).toContain('Win Streak')
      expect(joined).toContain('Rank Bonus')
    })
  })

  describe('Level calculations', () => {
    it('calculateLevelFromXP returns level 1 for 0 XP', () => {
      expect(calculateLevelFromXP(0)).toBe(1)
    })

    it('calculateLevelFromXP progresses every 1000 XP', () => {
      expect(calculateLevelFromXP(999)).toBe(1)
      expect(calculateLevelFromXP(1000)).toBe(2)
      expect(calculateLevelFromXP(2500)).toBe(3)
    })

    it('getCurrentLevel is an alias for calculateLevelFromXP', () => {
      expect(getCurrentLevel(1500)).toBe(calculateLevelFromXP(1500))
    })

    it('getXPToNextLevel calculates remaining XP', () => {
      expect(getXPToNextLevel(0)).toBe(1000)
      expect(getXPToNextLevel(500)).toBe(500)
      expect(getXPToNextLevel(1000)).toBe(1000) // level 2, next is 2000
    })

    it('checkLevelUp detects level changes', () => {
      expect(checkLevelUp(900, 1100)).toBe(true)
      expect(checkLevelUp(100, 500)).toBe(false)
    })

    it('getLevelUpInfo returns detailed info', () => {
      const info = getLevelUpInfo(900, 2100)
      expect(info.leveledUp).toBe(true)
      expect(info.oldLevel).toBe(1)
      expect(info.newLevel).toBe(3)
      expect(info.levelsGained).toBe(2)
    })

    it('getLevelUpInfo when no level up', () => {
      const info = getLevelUpInfo(100, 500)
      expect(info.leveledUp).toBe(false)
      expect(info.levelsGained).toBe(0)
    })
  })
})
