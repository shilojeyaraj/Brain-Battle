import {
  calculateXP,
  getXPExplanation,
  calculateLevelFromXP,
  getCurrentLevel,
  getXPToNextLevel,
  checkLevelUp,
  getLevelUpInfo,
  type GameResult,
  type XPBreakdown,
} from '@/lib/xp-calculator'

function createBaseGameResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    correctAnswers: 10,
    totalQuestions: 10,
    averageTimePerQuestion: 10,
    difficulty: 'medium',
    winStreak: 0,
    isPerfectScore: false,
    isMultiplayer: false,
    ...overrides,
  }
}

describe('xp-calculator', () => {
  describe('calculateXP', () => {
    describe('difficulty multipliers', () => {
      it('applies easy multiplier (1.2x)', () => {
        const result = calculateXP(
          createBaseGameResult({ difficulty: 'easy', correctAnswers: 10, totalQuestions: 10 })
        )
        expect(result.difficultyMultiplier).toBe(1.2)
        expect(result.baseXP).toBe(Math.round(150 * 1.2))
      })

      it('applies medium multiplier (1.8x)', () => {
        const result = calculateXP(
          createBaseGameResult({ difficulty: 'medium', correctAnswers: 10, totalQuestions: 10 })
        )
        expect(result.difficultyMultiplier).toBe(1.8)
        expect(result.baseXP).toBe(Math.round(150 * 1.8))
      })

      it('applies hard multiplier (2.5x)', () => {
        const result = calculateXP(
          createBaseGameResult({ difficulty: 'hard', correctAnswers: 10, totalQuestions: 10 })
        )
        expect(result.difficultyMultiplier).toBe(2.5)
        expect(result.baseXP).toBe(Math.round(150 * 2.5))
      })
    })

    describe('perfect scores', () => {
      it('awards perfect score bonus when isPerfectScore is true', () => {
        const result = calculateXP(
          createBaseGameResult({ isPerfectScore: true })
        )
        expect(result.perfectScoreBonus).toBe(150)
      })

      it('gives no perfect score bonus when isPerfectScore is false', () => {
        const result = calculateXP(
          createBaseGameResult({ isPerfectScore: false })
        )
        expect(result.perfectScoreBonus).toBe(0)
      })
    })

    describe('speed bonuses', () => {
      it('awards max speed bonus at target time (10 seconds)', () => {
        const result = calculateXP(
          createBaseGameResult({ averageTimePerQuestion: 10 })
        )
        expect(result.speedBonus).toBe(75)
      })

      it('awards max speed bonus when faster than target', () => {
        const result = calculateXP(
          createBaseGameResult({ averageTimePerQuestion: 5 })
        )
        expect(result.speedBonus).toBe(75)
      })

      it('reduces speed bonus when slower than target', () => {
        const result = calculateXP(
          createBaseGameResult({ averageTimePerQuestion: 15 })
        )
        expect(result.speedBonus).toBe(65)
      })

      it('gives zero speed bonus when very slow', () => {
        const result = calculateXP(
          createBaseGameResult({ averageTimePerQuestion: 50 })
        )
        expect(result.speedBonus).toBe(0)
      })
    })

    describe('win streaks', () => {
      it('awards streak bonus per win', () => {
        const result = calculateXP(
          createBaseGameResult({ winStreak: 5 })
        )
        expect(result.streakBonus).toBe(75)
      })

      it('caps streak bonus at 150', () => {
        const result = calculateXP(
          createBaseGameResult({ winStreak: 15 })
        )
        expect(result.streakBonus).toBe(150)
      })

      it('gives no streak bonus for zero wins', () => {
        const result = calculateXP(
          createBaseGameResult({ winStreak: 0 })
        )
        expect(result.streakBonus).toBe(0)
      })
    })

    describe('multiplayer rank bonuses', () => {
      it('awards 300 XP for 1st place', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: true, rank: 1 })
        )
        expect(result.rankBonus).toBe(300)
      })

      it('awards 225 XP for 2nd place', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: true, rank: 2 })
        )
        expect(result.rankBonus).toBe(225)
      })

      it('awards 150 XP for 3rd place', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: true, rank: 3 })
        )
        expect(result.rankBonus).toBe(150)
      })

      it('awards 75 XP for 4th place', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: true, rank: 4 })
        )
        expect(result.rankBonus).toBe(75)
      })

      it('awards 75 XP for 5th place and below', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: true, rank: 5 })
        )
        expect(result.rankBonus).toBe(75)
      })

      it('gives no rank bonus when not multiplayer', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: false, rank: 1 })
        )
        expect(result.rankBonus).toBe(0)
      })

      it('gives no rank bonus when rank is undefined', () => {
        const result = calculateXP(
          createBaseGameResult({ isMultiplayer: true })
        )
        expect(result.rankBonus).toBe(0)
      })
    })

    describe('zero correct answers', () => {
      it('returns zero base XP and minimal total', () => {
        const result = calculateXP(
          createBaseGameResult({ correctAnswers: 0, totalQuestions: 10 })
        )
        expect(result.baseXP).toBe(0)
        expect(result.totalXP).toBe(result.speedBonus + result.perfectScoreBonus + result.streakBonus + result.rankBonus)
      })
    })

    it('sums all components into totalXP', () => {
      const result = calculateXP(
        createBaseGameResult({
          correctAnswers: 10,
          totalQuestions: 10,
          averageTimePerQuestion: 10,
          difficulty: 'medium',
          winStreak: 2,
          isPerfectScore: true,
          isMultiplayer: true,
          rank: 1,
        })
      )
      const expectedTotal =
        result.baseXP +
        result.speedBonus +
        result.perfectScoreBonus +
        result.streakBonus +
        result.rankBonus
      expect(result.totalXP).toBe(expectedTotal)
    })
  })

  describe('calculateLevelFromXP', () => {
    it('returns level 1 for 0 XP', () => {
      expect(calculateLevelFromXP(0)).toBe(1)
    })

    it('returns level 1 for 999 XP', () => {
      expect(calculateLevelFromXP(999)).toBe(1)
    })

    it('returns level 2 for 1000 XP', () => {
      expect(calculateLevelFromXP(1000)).toBe(2)
    })

    it('returns level 2 for 1001 XP', () => {
      expect(calculateLevelFromXP(1001)).toBe(2)
    })

    it('returns level 6 for 5000 XP', () => {
      expect(calculateLevelFromXP(5000)).toBe(6)
    })
  })

  describe('getCurrentLevel', () => {
    it('returns same value as calculateLevelFromXP', () => {
      expect(getCurrentLevel(0)).toBe(calculateLevelFromXP(0))
      expect(getCurrentLevel(2500)).toBe(calculateLevelFromXP(2500))
    })
  })

  describe('getXPToNextLevel', () => {
    it('returns 1000 for 0 XP', () => {
      expect(getXPToNextLevel(0)).toBe(1000)
    })

    it('returns 1 for 999 XP', () => {
      expect(getXPToNextLevel(999)).toBe(1)
    })

    it('returns 1000 for 1000 XP', () => {
      expect(getXPToNextLevel(1000)).toBe(1000)
    })

    it('returns 999 for 1001 XP', () => {
      expect(getXPToNextLevel(1001)).toBe(999)
    })

    it('returns correct amount for 2500 XP', () => {
      expect(getXPToNextLevel(2500)).toBe(500)
    })
  })

  describe('checkLevelUp', () => {
    it('returns false when XP does not cross level boundary', () => {
      expect(checkLevelUp(100, 500)).toBe(false)
      expect(checkLevelUp(500, 999)).toBe(false)
    })

    it('returns true when XP crosses level boundary', () => {
      expect(checkLevelUp(999, 1000)).toBe(true)
      expect(checkLevelUp(500, 1500)).toBe(true)
    })

    it('returns false when new XP is less than old XP', () => {
      expect(checkLevelUp(1500, 500)).toBe(false)
    })
  })

  describe('getLevelUpInfo', () => {
    it('returns leveledUp false when no level change', () => {
      const info = getLevelUpInfo(100, 500)
      expect(info.leveledUp).toBe(false)
      expect(info.oldLevel).toBe(1)
      expect(info.newLevel).toBe(1)
      expect(info.levelsGained).toBe(0)
    })

    it('returns leveledUp true and levelsGained 1 when crossing one boundary', () => {
      const info = getLevelUpInfo(999, 1000)
      expect(info.leveledUp).toBe(true)
      expect(info.oldLevel).toBe(1)
      expect(info.newLevel).toBe(2)
      expect(info.levelsGained).toBe(1)
    })

    it('returns correct levelsGained when skipping multiple levels', () => {
      const info = getLevelUpInfo(500, 3500)
      expect(info.leveledUp).toBe(true)
      expect(info.oldLevel).toBe(1)
      expect(info.newLevel).toBe(4)
      expect(info.levelsGained).toBe(3)
    })
  })

  describe('getXPExplanation', () => {
    it('includes base XP with accuracy percentage', () => {
      const gameResult = createBaseGameResult({ correctAnswers: 8, totalQuestions: 10 })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations).toContain('Base XP: ' + breakdown.baseXP + ' (80.0% accuracy)')
    })

    it('includes difficulty bonus when multiplier > 1', () => {
      const gameResult = createBaseGameResult({ difficulty: 'hard' })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Difficulty Bonus') && e.includes('hard'))).toBe(true)
    })

    it('includes speed bonus when present', () => {
      const gameResult = createBaseGameResult({ averageTimePerQuestion: 10 })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Speed Bonus') && e.includes('fast completion'))).toBe(true)
    })

    it('omits speed bonus when zero', () => {
      const gameResult = createBaseGameResult({ averageTimePerQuestion: 50 })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Speed Bonus'))).toBe(false)
    })

    it('includes perfect score when present', () => {
      const gameResult = createBaseGameResult({ isPerfectScore: true })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Perfect Score') && e.includes('150'))).toBe(true)
    })

    it('includes win streak when present', () => {
      const gameResult = createBaseGameResult({ winStreak: 5 })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Win Streak') && e.includes('5 wins'))).toBe(true)
    })

    it('includes rank bonus for 1st place', () => {
      const gameResult = createBaseGameResult({ isMultiplayer: true, rank: 1 })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Rank Bonus') && e.includes('1st place'))).toBe(true)
    })

    it('includes rank bonus for 4th+ place', () => {
      const gameResult = createBaseGameResult({ isMultiplayer: true, rank: 5 })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(explanations.some((e) => e.includes('Rank Bonus') && e.includes('4th+ place'))).toBe(true)
    })

    it('returns array of strings in consistent order', () => {
      const gameResult = createBaseGameResult({
        correctAnswers: 10,
        totalQuestions: 10,
        difficulty: 'medium',
        averageTimePerQuestion: 10,
        isPerfectScore: true,
        winStreak: 3,
        isMultiplayer: true,
        rank: 1,
      })
      const breakdown = calculateXP(gameResult)
      const explanations = getXPExplanation(breakdown, gameResult)
      expect(Array.isArray(explanations)).toBe(true)
      expect(explanations.length).toBeGreaterThan(0)
      explanations.forEach((e) => {
        expect(typeof e).toBe('string')
        expect(e.length).toBeGreaterThan(0)
      })
    })
  })
})
