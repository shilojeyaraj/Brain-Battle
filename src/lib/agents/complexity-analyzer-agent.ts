/**
 * Complexity Analyzer Agent
 * 
 * Analyzes document complexity, education level, and prerequisites
 */

import { BaseAgent } from "./base-agent"
import { AgentInput, AgentOutput } from "./agent-types"

export class ComplexityAnalyzerAgent extends BaseAgent {
  name = "ComplexityAnalyzer"
  description = "Analyzes document complexity, education level, and prerequisites"
  dependencies = []

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log("Starting complexity analysis...")

    try {
      const systemPrompt = `You are an educational content analyst. Your task is to analyze document complexity and determine appropriate education levels.

REQUIREMENTS:
1. Analyze vocabulary level (basic, intermediate, advanced, expert)
2. Assess concept sophistication (concrete, abstract, theoretical, research)
3. Identify prerequisite knowledge mentioned or implied
4. Determine reasoning level required (memorization, comprehension, application, analysis, synthesis, evaluation)
5. Infer education level (elementary, middle_school, high_school, college, graduate, professional)
6. Provide evidence with page references

Return a JSON object matching this schema:
{
  "vocabulary_level": "basic|intermediate|advanced|expert",
  "concept_sophistication": "concrete|abstract|theoretical|research",
  "prerequisite_knowledge": ["string (p. N)", ...],
  "reasoning_level": "memorization|comprehension|application|analysis|synthesis|evaluation",
  "education_level": "elementary|middle_school|high_school|college|graduate|professional",
  "difficulty_level": "beginner|intermediate|advanced",
  "evidence": {"vocabulary_examples": ["string (p. N)"], "complexity_indicators": ["string (p. N)"]}
}`

      const userPrompt = `Analyze the complexity of these documents:

DOCUMENTS:
${input.documentContent.split('\n').slice(0, 8000).join('\n')}

${input.difficulty ? `REQUESTED DIFFICULTY: ${input.difficulty}` : ''}

Analyze vocabulary, concepts, prerequisites, and reasoning requirements. Provide evidence with page references.`

      const { content, usage } = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        {
          responseFormat: "json_object",
          temperature: 0.3,
        }
      )

      const data = JSON.parse(content)

      this.log("Complexity analysis completed", {
        educationLevel: data.education_level,
        difficulty: data.difficulty_level,
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
      this.error("Complexity analysis failed", error)
      return {
        success: false,
        data: null,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    }
  }
}

