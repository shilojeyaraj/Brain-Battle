/**
 * Base Agent Class
 * 
 * Provides common functionality for all agents
 */

import OpenAI from "openai"
import { Agent, AgentInput, AgentOutput } from "./agent-types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export abstract class BaseAgent implements Agent {
  abstract name: string
  abstract description: string
  abstract dependencies?: string[]

  protected openai: OpenAI = openai

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
    
    const response = await this.openai.chat.completions.create({
      model: options.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens,
    })

    const processingTime = Date.now() - startTime

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error(`No content in response from ${this.name}`)
    }

    return {
      content,
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

