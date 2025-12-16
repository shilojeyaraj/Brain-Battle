/**
 * AI Provider Types
 * 
 * Defines interfaces for AI client abstraction layer
 */

export type AIProvider = 'openai' | 'moonshot' | 'both'

export type AIChatMessageContent = 
  | string 
  | Array<{
      type: 'text' | 'image_url'
      text?: string
      image_url?: {
        url: string
        detail?: 'low' | 'high' | 'auto'
      }
    }>

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: AIChatMessageContent
}

export interface AIChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json_object' | 'text'
}

export interface AIChatCompletionResponse {
  id: string
  model: string
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: 'openai' | 'moonshot'
}

export interface AIClient {
  chatCompletions(
    messages: AIChatMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatCompletionResponse>
}

