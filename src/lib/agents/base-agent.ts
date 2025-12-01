/**
 * Base Agent Class
 * 
 * Provides common functionality for all agents
 */

import { Agent, AgentInput, AgentOutput } from "./agent-types"
import { createAIClient } from "@/lib/ai/client-factory"

export abstract class BaseAgent implements Agent {
  abstract name: string
  abstract description: string
  abstract dependencies?: string[]

  protected aiClient = createAIClient('moonshot')

  abstract execute(input: AgentInput): Promise<AgentOutput>

  validate?(output: AgentOutput): boolean {
    return output.success && output.data !== null && output.data !== undefined
  }

  protected async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    options: {
      model?: string
      temperature?: number
      responseFormat?: "json_object" | "text"
      maxTokens?: number
    } = {}
  ): Promise<{ content: string; usage: any }> {
    const startTime = Date.now()
    
    const response = await this.aiClient.chatCompletions(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      {
        model: options.model || process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview',
        responseFormat: options.responseFormat,
        temperature: options.temperature ?? 0.3,
        maxTokens: options.maxTokens,
      }
    )

    const processingTime = Date.now() - startTime

    return {
      content: response.content,
      usage: {
        ...response.usage,
        processingTime,
      }
    }
  }

  protected log(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] ${message}`, data || '')
    }
  }

  protected error(message: string, error: any) {
    console.error(`[${this.name}] ❌ ${message}`, error)
  }
}

