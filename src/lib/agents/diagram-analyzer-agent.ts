/**
 * Diagram Analyzer Agent
 * 
 * Analyzes extracted images/diagrams and generates descriptions, titles, and captions
 */

import { BaseAgent } from "./base-agent"
import { AgentInput, AgentOutput } from "./agent-types"

export class DiagramAnalyzerAgent extends BaseAgent {
  name = "DiagramAnalyzer"
  description = "Analyzes extracted diagrams and figures to generate titles, captions, and descriptions"
  dependencies = ["ContentExtractor"]

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log("Starting diagram analysis...")

    if (!input.extractedImages || input.extractedImages.length === 0) {
      this.log("No images to analyze")
      return {
        success: true,
        data: { diagrams: [] },
        metadata: { tokensUsed: 0, processingTime: 0 }
      }
    }

    try {
      const contentExtraction = (input.metadata as any)?.contentExtraction
      const documentContext = input.documentContent?.substring(0, 5000) || ""

      const systemPrompt = `You are a diagram and figure analysis specialist. Your task is to analyze extracted images from educational documents and create definitive, confident descriptions.

REQUIREMENTS:
1. Analyze what each diagram/figure shows based on the document context
2. Create descriptive titles that indicate the diagram's purpose
3. Write detailed captions explaining what the diagram illustrates
4. Identify the type of diagram (flowchart, tree, graph, table, trace, algorithm visualization, etc.)
5. Extract keywords for potential web image search if needed
6. Reference the page number where the diagram appears
7. Connect diagrams to concepts mentioned in the document

CRITICAL LANGUAGE REQUIREMENTS:
- NEVER use uncertain language like "likely", "possibly", "may", "might", "probably", "perhaps", "appears to", "seems to", "could be"
- Use definitive, confident statements: "This diagram shows...", "The figure illustrates...", "This visualization demonstrates..."
- Base descriptions on what you can see and what the document context tells you
- If you're confident about what it shows, state it directly
- Only use conditional language if you genuinely cannot determine what the diagram shows

Return a JSON object with:
{
  "diagrams": [{
    "source": "file",
    "title": "Descriptive title based on content",
    "caption": "Detailed explanation of what the diagram shows and how it relates to the document content (p. N)",
    "page": N,
    "type": "diagram|table|trace|flowchart|tree|graph|algorithm|visualization",
    "keywords": ["relevant", "search", "terms"],
    "relates_to_concepts": ["concept1", "concept2"]
  }]
}

IMPORTANT: Base all descriptions on the document context. If the document mentions "Heap Sort", "Bubble Sort", "Selection Sort", or shows algorithm traces, reference those specifically. Use confident, definitive language throughout.`

      const userPrompt = `Analyze these extracted diagrams from the document:

DOCUMENT CONTEXT (first 5000 chars):
${documentContext}

${contentExtraction ? `\nKEY TERMS FROM DOCUMENT:\n${JSON.stringify(contentExtraction.key_terms?.slice(0, 20) || [], null, 2)}` : ''}

EXTRACTED IMAGES:
${input.extractedImages.map((img, idx) => 
  `Image ${idx + 1}:
  - Page: ${img.page}
  - Dimensions: ${img.width}x${img.height}px
  - Type: ${img.type || 'unknown'}
  - [Base64 image data available]
`).join('\n')}

${input.topic ? `TOPIC: ${input.topic}` : ''}

For each image, analyze what it shows based on the document context and create:
1. A descriptive title (e.g., "Heap Sort - Insertion and Re-heapification", "Bubble Sort Trace Example")
2. A detailed caption explaining the diagram's content and how it relates to the document
3. Appropriate keywords for search
4. The type of visualization
5. Which concepts from the document it relates to

Include page references in captions.`

      const { content, usage } = await this.callOpenAI(
        systemPrompt,
        userPrompt,
        {
          responseFormat: "json_object",
          temperature: 0.3,
        }
      )

      const data = JSON.parse(content)

      // Merge extracted image data with analysis
      // Match by page number first, then fall back to index if page number doesn't match
      const enrichedDiagrams = data.diagrams?.map((diagram: any, idx: number) => {
        // Try to find matching image by page number first (most reliable)
        let originalImage = diagram.page 
          ? input.extractedImages?.find((img) => img.page === diagram.page)
          : null
        
        // Fallback to index-based matching if page number match fails
        if (!originalImage && input.extractedImages?.[idx]) {
          originalImage = input.extractedImages[idx]
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[DIAGRAM ANALYZER] Page number mismatch for diagram ${idx + 1}, using index-based matching`)
          }
        }
        
        return {
          ...diagram,
          // Preserve page number from original image if available
          page: originalImage?.page || diagram.page,
          image_data_b64: originalImage?.image_data_b64,
          width: originalImage?.width,
          height: originalImage?.height,
        }
      }) || []

      this.log("Diagram analysis completed", {
        diagrams: enrichedDiagrams.length,
        tokensUsed: usage.total_tokens,
      })

      return {
        success: true,
        data: { diagrams: enrichedDiagrams },
        metadata: {
          tokensUsed: usage.total_tokens,
          processingTime: usage.processingTime,
        }
      }
    } catch (error) {
      this.error("Diagram analysis failed", error)
      return {
        success: false,
        data: { diagrams: [] },
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    }
  }
}

