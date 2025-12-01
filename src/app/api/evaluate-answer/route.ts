import { NextRequest, NextResponse } from "next/server"
import { isAnswerCorrect } from "@/lib/quiz-evaluator"
import { evaluateAnswerWithFallback } from "@/lib/quiz/llm-answer-evaluator"

/**
 * API endpoint to evaluate quiz answers
 * Used by client-side components to get accurate evaluation
 */
export async function POST(request: NextRequest) {
  try {
    const { question, userAnswer } = await request.json()

    if (!question || userAnswer === undefined || userAnswer === null) {
      return NextResponse.json(
        { error: "Question and userAnswer are required" },
        { status: 400 }
      )
    }

    // Coerce user answer to proper type
    let coercedAnswer: number | string
    if (question.type === "multiple_choice" || question.type === "mcq") {
      coercedAnswer = typeof userAnswer === 'number' ? userAnswer : parseInt(String(userAnswer)) || 0
    } else {
      coercedAnswer = typeof userAnswer === 'string' ? userAnswer : String(userAnswer ?? "")
    }

    // Use quiz evaluator for initial check
    const fuzzyIsCorrect = isAnswerCorrect(question, coercedAnswer)

    // For open-ended questions, try LLM evaluation if fuzzy match fails
    let isCorrect = fuzzyIsCorrect
    let usedLLM = false
    let confidence = fuzzyIsCorrect ? 0.9 : 0.3

    if (!fuzzyIsCorrect && question.type === "open_ended" && typeof coercedAnswer === "string" && coercedAnswer.trim().length > 0) {
      try {
        const llmEvaluation = await evaluateAnswerWithFallback(question, coercedAnswer, fuzzyIsCorrect)
        isCorrect = llmEvaluation.isCorrect
        usedLLM = llmEvaluation.usedLLM
        confidence = llmEvaluation.confidence
      } catch (error) {
        console.error("❌ [EVALUATE ANSWER] LLM evaluation failed:", error)
        // Fallback to fuzzy result
        isCorrect = fuzzyIsCorrect
      }
    }

    return NextResponse.json({
      isCorrect,
      usedLLM,
      confidence
    })
  } catch (error) {
    console.error("❌ [EVALUATE ANSWER] Error:", error)
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    )
  }
}

