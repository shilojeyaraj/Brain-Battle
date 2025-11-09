/**
 * Multi-Agent Orchestrator
 * 
 * Coordinates multiple agents to generate study notes in parallel
 */

import { AgentInput, OrchestratorContext, OrchestratorResult } from "./agent-types"
import { ContentExtractorAgent } from "./content-extractor-agent"
import { ComplexityAnalyzerAgent } from "./complexity-analyzer-agent"
import { ConceptOrganizerAgent } from "./concept-organizer-agent"
import { QuestionGeneratorAgent } from "./question-generator-agent"
import { DiagramAnalyzerAgent } from "./diagram-analyzer-agent"

export class NotesOrchestrator {
  private agents = {
    contentExtractor: new ContentExtractorAgent(),
    complexityAnalyzer: new ComplexityAnalyzerAgent(),
    conceptOrganizer: new ConceptOrganizerAgent(),
    questionGenerator: new QuestionGeneratorAgent(),
    diagramAnalyzer: new DiagramAnalyzerAgent(),
  }

  async generateNotes(input: AgentInput): Promise<OrchestratorResult> {
    const startTime = Date.now()
    const agentTimes: Record<string, number> = {}
    const agentsExecuted: string[] = []
    let totalTokens = 0
    const errors: string[] = []

    console.log("🚀 [ORCHESTRATOR] Starting multi-agent note generation...")

    try {
      // Phase 1: Parallel extraction and analysis
      console.log("📊 [ORCHESTRATOR] Phase 1: Parallel extraction and analysis...")
      const phase1Start = Date.now()

      const [contentResult, complexityResult] = await Promise.all([
        this.agents.contentExtractor.execute(input).then(result => {
          agentTimes.contentExtractor = Date.now() - phase1Start
          agentsExecuted.push("contentExtractor")
          totalTokens += result.metadata?.tokensUsed || 0
          if (!result.success) errors.push(`ContentExtractor: ${result.errors?.join(', ')}`)
          return result
        }),
        this.agents.complexityAnalyzer.execute(input).then(result => {
          agentTimes.complexityAnalyzer = Date.now() - phase1Start
          agentsExecuted.push("complexityAnalyzer")
          totalTokens += result.metadata?.tokensUsed || 0
          if (!result.success) errors.push(`ComplexityAnalyzer: ${result.errors?.join(', ')}`)
          return result
        }),
      ])

      // Phase 2: Organization and generation (can run in parallel)
      console.log("📊 [ORCHESTRATOR] Phase 2: Organization and generation...")
      const phase2Start = Date.now()

      // Prepare input with dependencies
      const organizerInput: AgentInput = {
        ...input,
        metadata: {
          contentExtraction: contentResult.data,
          complexityAnalysis: complexityResult.data,
        }
      }

      const generatorInput: AgentInput = {
        ...input,
        metadata: {
          contentExtraction: contentResult.data,
          complexityAnalysis: complexityResult.data,
        }
      }

      const diagramInput: AgentInput = {
        ...input,
        metadata: {
          contentExtraction: contentResult.data,
        }
      }

      const [conceptResult, questionResult, diagramResult] = await Promise.all([
        this.agents.conceptOrganizer.execute(organizerInput).then(result => {
          agentTimes.conceptOrganizer = Date.now() - phase2Start
          agentsExecuted.push("conceptOrganizer")
          totalTokens += result.metadata?.tokensUsed || 0
          if (!result.success) errors.push(`ConceptOrganizer: ${result.errors?.join(', ')}`)
          return result
        }),
        this.agents.questionGenerator.execute(generatorInput).then(result => {
          agentTimes.questionGenerator = Date.now() - phase2Start
          agentsExecuted.push("questionGenerator")
          totalTokens += result.metadata?.tokensUsed || 0
          if (!result.success) errors.push(`QuestionGenerator: ${result.errors?.join(', ')}`)
          return result
        }),
        input.extractedImages && input.extractedImages.length > 0
          ? this.agents.diagramAnalyzer.execute(diagramInput).then(result => {
              agentTimes.diagramAnalyzer = Date.now() - phase2Start
              agentsExecuted.push("diagramAnalyzer")
              totalTokens += result.metadata?.tokensUsed || 0
              if (!result.success) errors.push(`DiagramAnalyzer: ${result.errors?.join(', ')}`)
              return result
            })
          : Promise.resolve({ success: true, data: { diagrams: [] }, metadata: {} } as any),
      ])

      // Phase 3: Assemble final notes
      console.log("📊 [ORCHESTRATOR] Phase 3: Assembling final notes...")
      const notes = this.assembleNotes({
        contentExtraction: contentResult.data,
        complexityAnalysis: complexityResult.data,
        concepts: conceptResult.data,
        questions: questionResult.data,
        diagrams: diagramResult.data?.diagrams || [],
        input,
      })

      const totalTime = Date.now() - startTime

      console.log("✅ [ORCHESTRATOR] Note generation completed", {
        totalTime: `${totalTime}ms`,
        agentsExecuted: agentsExecuted.length,
        totalTokens,
      })

      return {
        success: true,
        notes,
        metadata: {
          totalTime,
          agentTimes,
          tokensUsed: totalTokens,
          agentsExecuted,
        },
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      console.error("❌ [ORCHESTRATOR] Note generation failed", error)
      return {
        success: false,
        notes: null,
        metadata: {
          totalTime: Date.now() - startTime,
          agentTimes,
          tokensUsed: totalTokens,
          agentsExecuted,
        },
        errors: [error instanceof Error ? error.message : "Unknown error", ...errors],
      }
    }
  }

  private assembleNotes(components: {
    contentExtraction: any
    complexityAnalysis: any
    concepts: any
    questions: any
    diagrams: any[]
    input: AgentInput
  }): any {
    // Extract title from topic or first document
    const title = components.input.topic || 
      components.concepts?.outline?.[0]?.split('(')[0]?.trim() ||
      "Study Notes"

    // Assemble according to notesSchema
    return {
      title,
      subject: components.complexityAnalysis?.subject || "General",
      education_level: components.complexityAnalysis?.education_level || "college",
      difficulty_level: components.complexityAnalysis?.difficulty_level || "intermediate",
      complexity_analysis: {
        vocabulary_level: components.complexityAnalysis?.vocabulary_level || "intermediate",
        concept_sophistication: components.complexityAnalysis?.concept_sophistication || "abstract",
        prerequisite_knowledge: components.complexityAnalysis?.prerequisite_knowledge || [],
        reasoning_level: components.complexityAnalysis?.reasoning_level || "application",
      },
      outline: components.concepts?.outline || [],
      key_terms: components.contentExtraction?.key_terms || [],
      concepts: components.concepts?.concepts || [],
      diagrams: components.diagrams.length > 0 
        ? components.diagrams 
        : (components.input.extractedImages?.map((img: any, idx: number) => ({
            source: "file",
            title: `Diagram ${idx + 1}`,
            caption: `Extracted from page ${img.page}`,
            page: img.page,
            image_data_b64: img.image_data_b64,
            width: img.width,
            height: img.height,
          })) || []),
      formulas: components.contentExtraction?.formulas || [],
      practice_questions: components.questions?.practice_questions || [],
      resources: {
        links: [],
        videos: [],
        simulations: [],
      },
      study_tips: components.concepts?.study_tips || [],
      common_misconceptions: components.concepts?.common_misconceptions || [],
    }
  }
}

