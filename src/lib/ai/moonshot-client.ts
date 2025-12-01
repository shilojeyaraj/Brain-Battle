/**
 * Moonshot AI (Kimi K2) Client Implementation
 * 
 * Moonshot API is OpenAI-compatible, so we can use the OpenAI SDK
 */

import OpenAI from 'openai'
import type { AIClient, AIChatMessage, AIChatCompletionOptions, AIChatCompletionResponse } from './types'

export class MoonshotClient implements AIClient {
  private client: OpenAI

  constructor() {
    if (!process.env.MOONSHOT_API_KEY) {
      throw new Error('MOONSHOT_API_KEY environment variable is required')
    }

    // Moonshot API is OpenAI-compatible
    this.client = new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1', // Moonshot API endpoint
    })
  }

  async chatCompletions(
    messages: AIChatMessage[],
    options: AIChatCompletionOptions = {}
  ): Promise<AIChatCompletionResponse> {
    // Kimi K2 model name - can be overridden via environment variable or options
    // Default: kimi-k2-0711-preview (Kimi K2 preview model with 128k context)
    // Alternative: moonshot-v1-128k (if available)
    const model = options.model || process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview'

    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in Moonshot response')
    }

    return {
      id: response.id,
      model: response.model,
      content,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      provider: 'moonshot',
    }
  }

  /**
   * Generate embeddings for text input
   * Moonshot API is OpenAI-compatible, so embeddings should work the same way
   */
  async createEmbeddings(
    input: string | string[],
    model: string = 'text-embedding-3-small'
  ): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model,
      input: Array.isArray(input) ? input : [input],
    })

    return response.data.map(item => item.embedding)
  }
}

