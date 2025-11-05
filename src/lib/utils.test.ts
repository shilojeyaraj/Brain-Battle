import { generateRoomCode, formatTime, calculateProgress } from './utils'

describe('Utils', () => {
  describe('generateRoomCode', () => {
    it('should generate a 6-character room code', () => {
      const code = generateRoomCode()
      expect(code).toHaveLength(6)
    })

    it('should generate alphanumeric characters only', () => {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-Z0-9]+$/)
    })

    it('should generate different codes on multiple calls', () => {
      const codes = Array.from({ length: 10 }, () => generateRoomCode())
      const uniqueCodes = new Set(codes)
      // While it's possible to have duplicates with random generation,
      // the probability is very low with 6 characters
      expect(uniqueCodes.size).toBeGreaterThan(1)
    })
  })

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('0:00')
      expect(formatTime(30)).toBe('0:30')
      expect(formatTime(60)).toBe('1:00')
      expect(formatTime(90)).toBe('1:30')
      expect(formatTime(125)).toBe('2:05')
    })

    it('should handle large values', () => {
      expect(formatTime(3600)).toBe('60:00')
      expect(formatTime(3665)).toBe('61:05')
    })
  })

  describe('calculateProgress', () => {
    it('should calculate progress percentage correctly', () => {
      expect(calculateProgress(5, 10)).toBe(50)
      expect(calculateProgress(3, 10)).toBe(30)
      expect(calculateProgress(10, 10)).toBe(100)
      expect(calculateProgress(0, 10)).toBe(0)
    })

    it('should handle zero total', () => {
      expect(calculateProgress(0, 0)).toBe(0)
      expect(calculateProgress(5, 0)).toBe(0)
    })

    it('should round to nearest integer', () => {
      expect(calculateProgress(1, 3)).toBe(33)
      expect(calculateProgress(2, 3)).toBe(67)
    })
  })
})

