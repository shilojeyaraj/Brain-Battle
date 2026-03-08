import { isAnswerCorrect, type QuizQuestion } from './quiz-evaluator'

describe('isAnswerCorrect', () => {
  describe('multiple choice', () => {
    const mcq: QuizQuestion = {
      type: 'multiple_choice',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correct: 0,
    }

    it('accepts correct index', () => {
      expect(isAnswerCorrect(mcq, 0)).toBe(true)
    })

    it('rejects incorrect index', () => {
      expect(isAnswerCorrect(mcq, 2)).toBe(false)
    })

    it('accepts correct text answer (case-insensitive)', () => {
      expect(isAnswerCorrect(mcq, 'paris')).toBe(true)
      expect(isAnswerCorrect(mcq, 'PARIS')).toBe(true)
    })

    it('rejects wrong text answer', () => {
      expect(isAnswerCorrect(mcq, 'London')).toBe(false)
    })

    it('handles mcq type alias', () => {
      const q: QuizQuestion = { ...mcq, type: 'mcq' }
      expect(isAnswerCorrect(q, 0)).toBe(true)
    })

    it('handles out-of-bounds index', () => {
      expect(isAnswerCorrect(mcq, -1)).toBe(false)
      expect(isAnswerCorrect(mcq, 99)).toBe(false)
    })
  })

  describe('open ended - text', () => {
    const openText: QuizQuestion = {
      type: 'open_ended',
      expected_answers: ['photosynthesis', 'photo synthesis'],
    }

    it('accepts exact match (case-insensitive)', () => {
      expect(isAnswerCorrect(openText, 'Photosynthesis')).toBe(true)
    })

    it('accepts alternate answers', () => {
      expect(isAnswerCorrect(openText, 'photo synthesis')).toBe(true)
    })

    it('accepts fuzzy match with enough matching words', () => {
      const q: QuizQuestion = {
        type: 'open_ended',
        expected_answers: ['the process of photosynthesis converts light energy'],
      }
      expect(isAnswerCorrect(q, 'photosynthesis converts light energy into chemical')).toBe(true)
    })

    it('rejects completely wrong answers', () => {
      expect(isAnswerCorrect(openText, 'mitochondria')).toBe(false)
    })

    it('falls back to question.a field', () => {
      const q: QuizQuestion = {
        type: 'open_ended',
        a: 'gravity',
      }
      expect(isAnswerCorrect(q, 'gravity')).toBe(true)
      expect(isAnswerCorrect(q, 'magnetism')).toBe(false)
    })

    it('returns false when no expected answers', () => {
      const q: QuizQuestion = { type: 'open_ended' }
      expect(isAnswerCorrect(q, 'anything')).toBe(false)
    })
  })

  describe('open ended - numeric', () => {
    const numeric: QuizQuestion = {
      type: 'open_ended',
      answer_format: 'number',
      expected_answers: ['42'],
    }

    it('accepts exact numeric match', () => {
      expect(isAnswerCorrect(numeric, '42')).toBe(true)
    })

    it('accepts within 5% tolerance', () => {
      expect(isAnswerCorrect(numeric, '43')).toBe(true)  // within 5% of 42
      expect(isAnswerCorrect(numeric, '40')).toBe(true)
    })

    it('rejects outside tolerance', () => {
      expect(isAnswerCorrect(numeric, '100')).toBe(false)
    })

    it('handles numeric format alias', () => {
      const q: QuizQuestion = { ...numeric, answer_format: 'numeric' }
      expect(isAnswerCorrect(q, '42')).toBe(true)
    })

    it('handles non-numeric user input', () => {
      expect(isAnswerCorrect(numeric, 'hello')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('returns false for unknown question type with no expected answers', () => {
      const q: QuizQuestion = { type: 'unknown_type' }
      expect(isAnswerCorrect(q, 'anything')).toBe(false)
    })

    it('handles expected_answers as a string instead of array', () => {
      const q: QuizQuestion = {
        type: 'open_ended',
        expected_answers: 'single answer' as any,
      }
      expect(isAnswerCorrect(q, 'single answer')).toBe(true)
    })

    it('handles number user answer for open-ended', () => {
      const q: QuizQuestion = {
        type: 'open_ended',
        answer_format: 'number',
        expected_answers: ['100'],
      }
      expect(isAnswerCorrect(q, 100)).toBe(true)
    })
  })
})
