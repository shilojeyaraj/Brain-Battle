/**
 * Content Extractor Agent
 * 
 * Extracts key terms, definitions, and structured content from documents
 */

import { BaseAgent } from "./base-agent"
import { AgentInput, AgentOutput } from "./agent-types"

export class ContentExtractorAgent extends BaseAgent {
  name = "ContentExtractor"
  description = "Extracts key terms, definitions, and structured content from documents"
  dependencies = []

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log("Starting content extraction...")

    try {
      const systemPrompt = `You are a content extraction specialist. Your task is to extract key information from documents with high precision.

REQUIREMENTS:
1. Extract key terms and their exact definitions as they appear in the document
2. Identify the document structure (headings, sections, chapters)
3. Extract specific examples, formulas, and data points
4. Quote exact phrases with quotation marks
5. Include page/section references when available
6. Do NOT generate or invent content - only extract what exists

Return a JSON object with:
{
  "key_terms": [{"term": "string", "definition": "string (p. N)", "importance": "high|medium|low"}],
  "structure": {"sections": ["string"], "headings": ["string"]},
  "examples": [{"title": "string", "content": "string (p. N)"}],
  "formulas": [{
    "name": "string",
    "formula": "string (exact formula as written)",
    "description": "string (p. N)",
    "variables": [{"symbol": "string", "meaning": "string"}],
    "page": number,
    "example": "string"
  }]
}

IMPORTANT FOR FORMULAS:
- Extract ALL formulas: time complexity (O(n²), O(n log n)), algorithmic formulas (T(n) = ...), mathematical equations
- Copy formulas exactly as they appear in the document
- Include variable definitions when provided
- Note page numbers where formulas appear
- Include example calculations if shown`

      const userPrompt = `Extract content from these documents:

DOCUMENTS:
${input.documentContent.split('\n').slice(0, 10000).join('\n')}

${input.topic ? `TOPIC: ${input.topic}` : ''}
${input.instructions ? `INSTRUCTIONS: ${input.instructions}` : ''}

Extract all key terms, definitions, examples, and structure. Include page references when available.`

      const { content, usage } = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        {
          responseFormat: "json_object",
          temperature: 0.2, // Very low for extraction accuracy
        }
      )

      const data = JSON.parse(content)

      this.log("Content extraction completed", {
        keyTerms: data.key_terms?.length || 0,
        examples: data.examples?.length || 0,
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
      this.error("Content extraction failed", error)
      return {
        success: false,
        data: null,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    }
  }
}

