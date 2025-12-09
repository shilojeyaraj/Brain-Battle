/**
 * OpenAI Client Implementation
 */

import OpenAI from 'openai'
import type { AIClient, AIChatMessage, AIChatCompletionOptions, AIChatCompletionResponse } from './types'

export class OpenAIClient implements AIClient {
  private client: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async chatCompletions(
    messages: AIChatMessage[],
    options: AIChatCompletionOptions = {}
  ): Promise<AIChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4o',
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
      throw new Error('No content in OpenAI response')
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
      provider: 'openai',
    }
  }

  /**
   * Generate embeddings for text input
   * Supports batch embeddings (array of texts)
   */
  async createEmbeddings(texts: string[], model: string = 'text-embedding-3-small'): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new Error('No texts provided for embedding generation')
    }

    const response = await this.client.embeddings.create({
      model: model,
      input: texts,
    })

    return response.data.map(item => item.embedding)
  }

  /**
   * Generate single embedding (convenience method)
   */
  async embeddings(text: string): Promise<number[]> {
    const results = await this.createEmbeddings([text])
    return results[0]
  }
}

