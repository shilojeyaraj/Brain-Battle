/**
 * Concept Organizer Agent
 * 
 * Organizes extracted content into structured concepts, outlines, and study materials
 */

import { BaseAgent } from "./base-agent"
import { AgentInput, AgentOutput } from "./agent-types"

export class ConceptOrganizerAgent extends BaseAgent {
  name = "ConceptOrganizer"
  description = "Organizes content into structured concepts, outlines, and study materials"
  dependencies = ["ContentExtractor", "ComplexityAnalyzer"]

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log("Starting concept organization...")

    try {
      // Get dependencies from context
      const contentExtraction = (input.metadata as any)?.contentExtraction
      const complexityAnalysis = (input.metadata as any)?.complexityAnalysis

      const systemPrompt = `You are a study material organizer. Your task is to structure extracted content into comprehensive study materials.

REQUIREMENTS:
1. Create an outline based on document structure
2. Organize concepts with headings, bullets, examples, and connections
3. Use exact terminology and definitions from the documents
4. Include page references for all facts
5. Create study tips based on actual content
6. Identify common misconceptions
7. Do NOT use generic filler - everything must be document-specific

Return a JSON object with:
{
  "outline": ["string (p. N)", ...],
  "concepts": [{
    "heading": "string",
    "bullets": ["string (p. N)", ...],
    "examples": ["string (p. N)", ...],
    "connections": ["string", ...]
  }],
  "study_tips": ["string (p. N)", ...],
  "common_misconceptions": [{
    "misconception": "string",
    "correction": "string (p. N)",
    "why_common": "string"
  }]
}`

      const userPrompt = `Organize this content into structured study materials:

DOCUMENT CONTENT:
${input.documentContent.split('\n').slice(0, 10000).join('\n')}

${contentExtraction ? `\nEXTRACTED KEY TERMS:\n${JSON.stringify(contentExtraction.key_terms?.slice(0, 20) || [], null, 2)}` : ''}
${complexityAnalysis ? `\nCOMPLEXITY ANALYSIS:\n${JSON.stringify(complexityAnalysis, null, 2)}` : ''}

${input.topic ? `TOPIC: ${input.topic}` : ''}
${input.instructions ? `INSTRUCTIONS: ${input.instructions}` : ''}

Create a structured outline, organize concepts, and provide study tips. Include page references for all content.`

      const { content, usage } = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        {
          responseFormat: "json_object",
          temperature: 0.3,
        }
      )

      const data = JSON.parse(content)

      this.log("Concept organization completed", {
        outlineItems: data.outline?.length || 0,
        concepts: data.concepts?.length || 0,
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
      this.error("Concept organization failed", error)
      return {
        success: false,
        data: null,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    }
  }
}

