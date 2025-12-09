/**
 * Moonshot AI (Kimi K2) Client Implementation
 * 
 * Now uses OpenRouter as a proxy to access Moonshot models
 * This provides better reliability and easier API key management
 */

import { OpenRouterClient } from './openrouter-client'
import type { AIClient, AIChatMessage, AIChatCompletionOptions, AIChatCompletionResponse } from './types'

export class MoonshotClient implements AIClient {
  private openRouterClient: OpenRouterClient

  constructor() {
    // Use OpenRouter client to access Moonshot models
    // This provides better reliability and easier API key management
    this.openRouterClient = new OpenRouterClient()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [MOONSHOT] Client initialized via OpenRouter')
    }
  }

  async chatCompletions(
    messages: AIChatMessage[],
    options: AIChatCompletionOptions = {}
  ): Promise<AIChatCompletionResponse> {
    // Delegate to OpenRouter client which handles Moonshot models
    return await this.openRouterClient.chatCompletions(messages, options)
  }

  /**
   * Generate embeddings for text input
   * OpenRouter doesn't directly support embeddings through Moonshot
   */
  async embeddings(text: string): Promise<number[]> {
    // OpenRouter doesn't directly support embeddings, use OpenAI client instead
    throw new Error('Embeddings not supported through OpenRouter/Moonshot. Use OpenAI client for embeddings.')
  }
}

