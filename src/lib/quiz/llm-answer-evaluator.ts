/**
 * LLM-based Answer Evaluator
 * 
 * Uses Moonshot AI to evaluate open-ended text answers when fuzzy matching
 * is insufficient. This provides semantic understanding of answers.
 */

import { MoonshotClient } from "@/lib/ai/moonshot-client"

const moonshotClient = new MoonshotClient()

export interface LLMEvaluationRequest {
  question: string
  userAnswer: string
  expectedAnswers: string[]
  explanation?: string
  context?: string
}

export interface LLMEvaluationResult {
  isCorrect: boolean
  confidence: number // 0-1
  reasoning: string
}

/**
 * Evaluates an open-ended answer using LLM semantic understanding
 * Falls back to false if evaluation fails
 */
export async function evaluateAnswerWithLLM(
  request: LLMEvaluationRequest
): Promise<LLMEvaluationResult> {
  try {
    const { question, userAnswer, expectedAnswers, explanation, context } = request

    if (!userAnswer || userAnswer.trim().length === 0) {
      return {
        isCorrect: false,
        confidence: 0,
        reasoning: "No answer provided"
      }
    }

    const prompt = `You are an expert educational evaluator. Evaluate whether a student's answer is correct based on the expected answers.

Question: ${question}

Expected Answer(s):
${expectedAnswers.map((ans, i) => `${i + 1}. ${ans}`).join('\n')}

${explanation ? `Explanation: ${explanation}\n` : ''}
${context ? `Context: ${context}\n` : ''}

Student's Answer: ${userAnswer}

Evaluate if the student's answer demonstrates understanding of the concept, even if the wording differs. Consider:
- Semantic similarity to expected answers
- Key concepts and facts mentioned
- Partial correctness (if the answer captures the main idea)
- Common variations in phrasing

Respond with JSON only:
{
  "isCorrect": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`

    const response = await moonshotClient.chatCompletions(
      [
        {
          role: "system",
          content: "You are an expert educational evaluator. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      {
        model: process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview',
        temperature: 0.2, // Low temperature for consistent evaluation
        maxTokens: 200,
        responseFormat: "json_object"
      }
    )

    const content = response.content
    if (!content) {
      throw new Error("No response from Moonshot")
    }

    try {
      const result = JSON.parse(content) as LLMEvaluationResult
      
      // Validate result structure
      if (typeof result.isCorrect !== 'boolean') {
        throw new Error("Invalid response format")
      }

      // Ensure confidence is between 0 and 1
      result.confidence = Math.max(0, Math.min(1, result.confidence || 0.5))
      
      return result
    } catch (parseError) {
      console.error("❌ [LLM EVALUATOR] Failed to parse JSON response:", parseError)
      console.error("Raw response:", content)
      
      // Fallback: try to extract boolean from text
      const lowerContent = content.toLowerCase()
      const isCorrect = lowerContent.includes('"iscorrect":true') || 
                       lowerContent.includes('"iscorrect": true') ||
                       lowerContent.includes('correct":true')
      
      return {
        isCorrect,
        confidence: 0.5,
        reasoning: "Parsing error, used fallback evaluation"
      }
    }
  } catch (error) {
    console.error("❌ [LLM EVALUATOR] Error evaluating answer:", error)
    
    // Conservative fallback: return incorrect
    return {
      isCorrect: false,
      confidence: 0,
      reasoning: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Evaluates an answer with a fallback strategy:
 * 1. Try fuzzy matching first (fast, free)
 * 2. If fuzzy matching fails but answer seems close, use LLM
 * 3. Return result with confidence
 */
export async function evaluateAnswerWithFallback(
  question: any,
  userAnswer: string | number,
  fuzzyResult: boolean
): Promise<{ isCorrect: boolean; usedLLM: boolean; confidence: number }> {
  // If fuzzy matching says correct, trust it
  if (fuzzyResult) {
    return {
      isCorrect: true,
      usedLLM: false,
      confidence: 0.9 // High confidence in fuzzy match
    }
  }

  // For open-ended questions, try LLM if we have expected answers
  if (question.type === "open_ended" && typeof userAnswer === "string" && userAnswer.trim().length > 0) {
    const expectedAnswers = question.expected_answers || []
    
    // Only use LLM if we have expected answers and the user provided a substantial answer
    if (expectedAnswers.length > 0 && userAnswer.trim().length > 5) {
      try {
        const llmResult = await evaluateAnswerWithLLM({
          question: question.question || question.q || "",
          userAnswer: userAnswer,
          expectedAnswers: expectedAnswers,
          explanation: question.explanation,
          context: question.context
        })

        return {
          isCorrect: llmResult.isCorrect,
          usedLLM: true,
          confidence: llmResult.confidence
        }
      } catch (error) {
        console.error("❌ [LLM EVALUATOR] LLM evaluation failed, using fuzzy result:", error)
      }
    }
  }

  // Fallback to fuzzy result
  return {
    isCorrect: fuzzyResult,
    usedLLM: false,
    confidence: fuzzyResult ? 0.7 : 0.3
  }
}

