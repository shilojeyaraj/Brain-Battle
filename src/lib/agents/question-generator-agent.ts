/**
 * Question Generator Agent
 * 
 * Generates practice questions based on document content
 */

import { BaseAgent } from "./base-agent"
import { AgentInput, AgentOutput } from "./agent-types"

export class QuestionGeneratorAgent extends BaseAgent {
  name = "QuestionGenerator"
  description = "Generates practice questions based on document content"
  dependencies = ["ContentExtractor"]

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log("Starting question generation...")

    try {
      const contentExtraction = (input.metadata as any)?.contentExtraction
      const complexityAnalysis = (input.metadata as any)?.complexityAnalysis

      const systemPrompt = `You are a question generation specialist. Create practice questions that test understanding of the ACTUAL document content.

REQUIREMENTS:
1. Create questions based ONLY on document content
2. Use exact examples, data, and concepts from documents
3. Include page references in questions and explanations
4. Create varied question types (multiple_choice, open_ended, true_false, fill_blank)
5. Provide detailed explanations with citations
6. Match difficulty to document complexity

Return a JSON object with:
{
  "practice_questions": [{
    "question": "string",
    "answer": "string",
    "type": "multiple_choice|open_ended|true_false|fill_blank",
    "options": ["string", ...], // for multiple_choice
    "difficulty": "easy|medium|hard",
    "explanation": "string (p. N)",
    "topic": "string",
    "page_reference": "N"
  }]
}`

      const userPrompt = `Generate practice questions from these documents:

DOCUMENT CONTENT:
${input.documentContent.split('\n').slice(0, 10000).join('\n')}

${contentExtraction ? `\nKEY TERMS AND CONCEPTS:\n${JSON.stringify(contentExtraction.key_terms?.slice(0, 30) || [], null, 2)}` : ''}
${complexityAnalysis ? `\nCOMPLEXITY: ${complexityAnalysis.difficulty_level || 'medium'}` : ''}
${input.difficulty ? `REQUESTED DIFFICULTY: ${input.difficulty}` : ''}

Generate 8-15 practice questions that test understanding of the actual document content. Use specific examples from the documents. Include page references.`

      const { content, usage } = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        {
          responseFormat: "json_object",
          temperature: 0.4, // Slightly higher for question variety
        }
      )

      const data = JSON.parse(content)

      this.log("Question generation completed", {
        questions: data.practice_questions?.length || 0,
        tokensUsed: usage.total_tokens,
      })

      return {
        success: true,
        data,
        metadata: {
          tokensUsed: usage.total_tokens,
          processingTime: usage.processingTime,
        }
      }
    } catch (error) {
      this.error("Question generation failed", error)
      return {
        success: false,
        data: null,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    }
  }
}

