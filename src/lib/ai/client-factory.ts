/**
 * AI Client Factory
 * 
 * Creates and manages AI client instances based on configuration
 */

import type { AIClient, AIProvider } from './types'
import { OpenAIClient } from './openai-client'
import { MoonshotClient } from './moonshot-client'

/**
 * Get the configured AI provider from environment
 */
export function getConfiguredProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() as AIProvider | undefined
  
  if (provider === 'openai') {
    return 'openai'
  } else if (provider === 'both') {
    return 'both'
  } else {
    return 'moonshot' // Default to Moonshot
  }
}

/**
 * Create an AI client instance
 */
export function createAIClient(provider?: AIProvider): AIClient {
  const configuredProvider = provider || getConfiguredProvider()

  switch (configuredProvider) {
    case 'openai':
      return new OpenAIClient()
    case 'moonshot':
      return new MoonshotClient()
    default:
      return new MoonshotClient() // Default to Moonshot
  }
}

/**
 * Create both clients for parallel testing
 */
export function createBothClients(): { openai: AIClient; moonshot: AIClient } {
  return {
    openai: new OpenAIClient(),
    moonshot: new MoonshotClient(),
  }
}

/**
 * Check if parallel testing is enabled
 */
export function isParallelTestingEnabled(): boolean {
  return getConfiguredProvider() === 'both' && 
         !!process.env.OPENAI_API_KEY && 
         !!process.env.MOONSHOT_API_KEY
}

