export interface QuizQuestion {
  type?: "multiple_choice" | "open_ended" | string
  options?: string[]
  correct?: number
  a?: string
  expected_answers?: string[]
  answer_format?: "number" | "numeric" | string
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
}

function extractFirstNumber(input: string): number | null {
  const match = input.match(/-?\d+\.?\d*/)
  return match ? parseFloat(match[0]) : null
}

function isNumericCorrect(expected: string[], userInput: string, toleranceRatio = 0.05): boolean {
  const userNumber = extractFirstNumber(userInput)
  if (userNumber === null) return false
  for (const expectedRaw of expected) {
    const expectedNumberMatch = expectedRaw.toString().match(/-?\d+\.?\d*/)
    if (!expectedNumberMatch) continue
    const expectedNumber = parseFloat(expectedNumberMatch[0])
    const tolerance = Math.abs(expectedNumber * toleranceRatio)
    if (Math.abs(userNumber - expectedNumber) <= tolerance) return true
  }
  return false
}

function isFuzzyTextCorrect(expected: string[], userInput: string, threshold = 0.7): boolean {
  const userNormalized = normalizeText(userInput)
  for (const expectedRaw of expected) {
    const expectedNormalized = normalizeText(expectedRaw)
    if (userNormalized === expectedNormalized) return true
    const expectedWords = expectedNormalized.split(" ").filter(w => w.length > 2)
    const userWords = userNormalized.split(" ")
    if (expectedWords.length <= 2) {
      if (userNormalized === expectedNormalized) return true
      continue
    }
    const matchingWords = expectedWords.filter(word =>
      userWords.some(uw => uw.includes(word) || word.includes(uw))
    )
    const matchRatio = expectedWords.length > 0 ? matchingWords.length / expectedWords.length : 0
    if (matchRatio >= threshold) return true
  }
  return false
}

export function isAnswerCorrect(question: QuizQuestion, userAnswer: number | string): boolean {
  // Multiple choice via index or text fallback
  if (question.type === "multiple_choice") {
    const correctIndex = typeof question.correct === "number" ? question.correct : 0
    if (typeof userAnswer === "number") {
      if (typeof question.correct === "number") {
        return userAnswer === correctIndex
      }
      // Fallback: compare option text to known correct text if available
      const correctText =
        (question.options && question.options[correctIndex]) || question.a || null
      if (!correctText || !question.options || userAnswer < 0 || userAnswer >= question.options.length) {
        return false
      }
      return normalizeText(question.options[userAnswer]) === normalizeText(correctText)
    } else {
      // User answer is text; try to match against correct option text
      const correctText =
        (question.options && question.options[correctIndex]) || question.a || null
      if (!correctText) return false
      return normalizeText(userAnswer) === normalizeText(correctText)
    }
  }

  // Open ended numeric
  if (question.answer_format === "number" || question.answer_format === "numeric") {
    const expected = question.expected_answers ?? []
    if (expected.length === 0) return false
    const userText = typeof userAnswer === "string" ? userAnswer : String(userAnswer)
    return isNumericCorrect(expected, userText, 0.05)
  }

  // Open ended text/fuzzy
  if (question.type === "open_ended") {
    const expected = question.expected_answers ?? []
    const userText = typeof userAnswer === "string" ? userAnswer : String(userAnswer)
    if (expected.length === 0) {
      // Fallback to direct match with provided 'a' or any answer field
      if (question.a) {
        return normalizeText(userText) === normalizeText(question.a)
      }
      return false
    }
    const userNormalized = normalizeText(userText)
    const exact = expected.some(e => normalizeText(e) === userNormalized)
    if (exact) return true
    return isFuzzyTextCorrect(expected, userText, 0.7)
  }

  // Default conservative
  return false
}
