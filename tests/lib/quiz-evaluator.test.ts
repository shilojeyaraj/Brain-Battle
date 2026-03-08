import { isAnswerCorrect, type QuizQuestion } from "@/lib/quiz-evaluator"

describe("quiz-evaluator", () => {
  test("MCQ correct by index", () => {
    const q: QuizQuestion = { type: "multiple_choice", options: ["A", "B", "C"], correct: 1 }
    expect(isAnswerCorrect(q, 1)).toBe(true)
    expect(isAnswerCorrect(q, 0)).toBe(false)
  })

  test("MCQ with correct=0 defaults to first option", () => {
    const q: QuizQuestion = { type: "multiple_choice", options: ["Alpha", "Beta", "Gamma"], a: "Beta" }
    // When correct is undefined it defaults to 0, so index 0 ("Alpha") is treated as correct
    expect(isAnswerCorrect(q, 0)).toBe(true)
    expect(isAnswerCorrect(q, 1)).toBe(false)
    // Text match against correct option (index 0 = "Alpha")
    expect(isAnswerCorrect(q, "Alpha")).toBe(true)
    expect(isAnswerCorrect(q, "Beta")).toBe(false)
  })

  test("Open-ended numeric ±5% tolerance", () => {
    const q: QuizQuestion = { type: "open_ended", answer_format: "number", expected_answers: ["100"] }
    expect(isAnswerCorrect(q, "95")).toBe(true)
    expect(isAnswerCorrect(q, "105")).toBe(true)
    expect(isAnswerCorrect(q, "110")).toBe(false)
  })

  test("Open-ended text exact match (case insensitive)", () => {
    const q: QuizQuestion = {
      type: "open_ended",
      expected_answers: ["The quick brown fox jumps over the lazy dog"]
    }
    expect(isAnswerCorrect(q, "the quick brown fox jumps over the lazy dog")).toBe(true)
    expect(isAnswerCorrect(q, "unrelated answer")).toBe(false)
  })

  test("Open-ended fuzzy match with high word overlap", () => {
    const q: QuizQuestion = {
      type: "open_ended",
      expected_answers: ["photosynthesis converts light energy into chemical energy in plants"]
    }
    // High overlap (>=70%) passes fuzzy check
    expect(isAnswerCorrect(q, "photosynthesis converts light energy into chemical energy")).toBe(true)
    expect(isAnswerCorrect(q, "completely unrelated answer about nothing")).toBe(false)
  })
})
