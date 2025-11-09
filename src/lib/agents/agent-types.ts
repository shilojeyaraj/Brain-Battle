/**
 * Multi-Agent System Type Definitions
 * 
 * Defines interfaces and types for the multi-agent note generation system
 */

export interface AgentInput {
  documentContent: string
  fileNames: string[]
  topic?: string
  difficulty?: string
  instructions?: string
  studyContext?: any
  extractedImages?: Array<{
    image_data_b64?: string
    page: number
    width?: number
    height?: number
  }>
  relevantChunks?: any[]
  metadata?: Record<string, any>
}

export interface AgentOutput {
  success: boolean
  data: any
  metadata?: {
    tokensUsed?: number
    processingTime?: number
    confidence?: number
  }
  errors?: string[]
}

export interface Agent {
  name: string
  description: string
  execute(input: AgentInput): Promise<AgentOutput>
  validate?(output: AgentOutput): boolean
  dependencies?: string[] // Other agents this depends on
}

export interface OrchestratorContext {
  documentContent: string
  fileNames: string[]
  topic?: string
  difficulty?: string
  instructions?: string
  studyContext?: any
  extractedImages?: Array<{
    image_data_b64?: string
    page: number
    width?: number
    height?: number
  }>
  relevantChunks?: any[]
  
  // Agent outputs (populated as agents execute)
  contentExtraction?: any
  complexityAnalysis?: any
  concepts?: any
  questions?: any
  diagrams?: any
  resources?: any
  citations?: any
}

export interface OrchestratorResult {
  success: boolean
  notes: any
  metadata: {
    totalTime: number
    agentTimes: Record<string, number>
    tokensUsed: number
    agentsExecuted: string[]
  }
  errors?: string[]
}

