import { isAnswerCorrect, type QuizQuestion } from "@/lib/quiz-evaluator"

describe("quiz-evaluator", () => {
  test("MCQ correct by index", () => {
    const q: QuizQuestion = { type: "multiple_choice", options: ["A", "B", "C"], correct: 1 }
    expect(isAnswerCorrect(q, 1)).toBe(true)
    expect(isAnswerCorrect(q, 0)).toBe(false)
  })

  test("MCQ fallback via text when correct missing", () => {
    const q: QuizQuestion = { type: "multiple_choice", options: ["Alpha", "Beta", "Gamma"], a: "Beta" }
    expect(isAnswerCorrect(q, 1)).toBe(true)
    expect(isAnswerCorrect(q, 2)).toBe(false)
    expect(isAnswerCorrect(q, "Beta")).toBe(true)
  })

  test("Open-ended numeric ±5% tolerance", () => {
    const q: QuizQuestion = { type: "open_ended", answer_format: "number", expected_answers: ["100"] }
    expect(isAnswerCorrect(q, "95")).toBe(true)  // within 5%
    expect(isAnswerCorrect(q, "105")).toBe(true) // within 5%
    expect(isAnswerCorrect(q, "110")).toBe(false)
  })

  test("Open-ended text exact and fuzzy", () => {
    const q: QuizQuestion = {
      type: "open_ended",
      expected_answers: ["The quick brown fox jumps over the lazy dog"]
    }
    expect(isAnswerCorrect(q, "the quick brown fox jumps over the lazy dog")).toBe(true)
    expect(isAnswerCorrect(q, "quick fox jumps lazy dog")).toBe(true) // fuzzy overlap
    expect(isAnswerCorrect(q, "unrelated answer")).toBe(false)
  })
}) 

