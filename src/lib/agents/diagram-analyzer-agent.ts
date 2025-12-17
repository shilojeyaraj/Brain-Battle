/**
 * Diagram Analyzer Agent
 * 
 * Analyzes extracted images/diagrams and generates descriptions, titles, and captions
 * Uses OpenAI GPT-4o Vision API for actual image analysis (Pro-only feature)
 */

import { BaseAgent } from "./base-agent"
import { AgentInput, AgentOutput } from "./agent-types"
import { OpenAIClient } from "@/lib/ai/openai-client"
import type { AIChatMessage } from "@/lib/ai/types"

export class DiagramAnalyzerAgent extends BaseAgent {
  name = "DiagramAnalyzer"
  description = "Analyzes extracted diagrams and figures to generate titles, captions, and descriptions using OpenAI Vision API"
  dependencies = ["ContentExtractor"]
  
  private openAIClient: OpenAIClient

  constructor() {
    super()
    // Use OpenAI directly for Vision API (not Moonshot)
    this.openAIClient = new OpenAIClient()
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log("Starting diagram analysis with Vision API...")

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
1. Analyze what each diagram/figure shows based on the document context AND what you can see in the image
2. Create descriptive titles that indicate the diagram's purpose
3. Write detailed captions explaining what the diagram illustrates
4. Identify the type of diagram (flowchart, tree, graph, table, trace, algorithm visualization, etc.)
5. Extract keywords for potential web image search if needed
6. Reference the page number where the diagram appears
7. Connect diagrams to concepts mentioned in the document

CRITICAL LANGUAGE REQUIREMENTS:
- NEVER use uncertain language like "likely", "possibly", "may", "might", "probably", "perhaps", "appears to", "seems to", "could be"
- Use definitive, confident statements: "This diagram shows...", "The figure illustrates...", "This visualization demonstrates..."
- Base descriptions on what you can ACTUALLY SEE in the image and what the document context tells you
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

IMPORTANT: Base all descriptions on BOTH the document context AND what you can see in the images. If the document mentions "Heap Sort", "Bubble Sort", "Selection Sort", or shows algorithm traces, reference those specifically. Use confident, definitive language throughout.`

      // Process images in batches (OpenAI has limits on images per request)
      // Process up to 5 images at a time to avoid token limits
      const MAX_IMAGES_PER_REQUEST = 5
      const imageBatches: typeof input.extractedImages[] = []
      
      for (let i = 0; i < input.extractedImages.length; i += MAX_IMAGES_PER_REQUEST) {
        imageBatches.push(input.extractedImages.slice(i, i + MAX_IMAGES_PER_REQUEST))
      }

      this.log(`Processing ${input.extractedImages.length} images in ${imageBatches.length} batch(es)`)

      const allDiagrams: any[] = []
      const analysisStartTime = Date.now()
      let totalTokensUsed = 0

      // Process each batch
      for (let batchIdx = 0; batchIdx < imageBatches.length; batchIdx++) {
        const batch = imageBatches[batchIdx]
        this.log(`Processing batch ${batchIdx + 1}/${imageBatches.length} (${batch.length} images)`)

        // Build Vision API message with actual images
        const visionContent: AIChatMessage['content'] = [
          {
            type: 'text',
            text: `Analyze these ${batch.length} extracted diagram(s) from the document:

DOCUMENT CONTEXT (first 5000 chars):
${documentContext}

${contentExtraction ? `\nKEY TERMS FROM DOCUMENT:\n${JSON.stringify(contentExtraction.key_terms?.slice(0, 20) || [], null, 2)}` : ''}

${input.topic ? `TOPIC: ${input.topic}` : ''}

For each image, analyze what it shows based on the document context AND what you can see in the image. Create:
1. A descriptive title (e.g., "Heap Sort - Insertion and Re-heapification", "Bubble Sort Trace Example")
2. A detailed caption explaining the diagram's content and how it relates to the document
3. Appropriate keywords for search
4. The type of visualization
5. Which concepts from the document it relates to

Include page references in captions. Return a JSON object with a "diagrams" array containing analysis for each image in order.`
          },
          // Add each image in the batch
          ...batch.map((img, idx) => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${img.image_data_b64}`,
              detail: 'high' as const, // Use high detail for better analysis
            },
          })),
        ]

        const messages: AIChatMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: visionContent },
        ]

        const startTime = Date.now()
        const response = await this.openAIClient.chatCompletions(messages, {
          model: 'gpt-4o', // Use GPT-4o for Vision API
          responseFormat: 'json_object',
          temperature: 0.3,
        })

        const processingTime = Date.now() - startTime

        try {
          const data = JSON.parse(response.content)

          // Match analyzed diagrams with original images by index (since we process in batches)
          const batchDiagrams = (data.diagrams || []).map((diagram: any, idx: number) => {
            const originalImage = batch[idx]
        return {
          ...diagram,
          page: originalImage?.page || diagram.page,
          image_data_b64: originalImage?.image_data_b64,
          width: originalImage?.width,
          height: originalImage?.height,
        }
          })
          
          allDiagrams.push(...batchDiagrams)
          totalTokensUsed += response.usage.total_tokens
          
          this.log(`Batch ${batchIdx + 1} completed: ${batchDiagrams.length} diagrams analyzed`, {
            tokensUsed: response.usage.total_tokens,
            processingTime,
          })
        } catch (parseError) {
          this.error(`Failed to parse response from batch ${batchIdx + 1}`, parseError)
          // Continue with other batches even if one fails
        }
      }

      const totalProcessingTime = Date.now() - analysisStartTime

      this.log("Diagram analysis completed", {
        diagrams: allDiagrams.length,
        totalImages: input.extractedImages.length,
        batches: imageBatches.length,
        totalTokensUsed,
        totalProcessingTime,
      })

      return {
        success: true,
        data: { diagrams: allDiagrams },
        metadata: {
          tokensUsed: totalTokensUsed,
          processingTime: totalProcessingTime,
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

