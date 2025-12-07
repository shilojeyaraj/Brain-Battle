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
    const apiKey = process.env.MOONSHOT_API_KEY
    
    if (!apiKey) {
      throw new Error('MOONSHOT_API_KEY environment variable is required. Please check your .env.local file.')
    }

    // Trim whitespace and validate key format
    const trimmedKey = apiKey.trim()
    if (trimmedKey.length < 10) {
      throw new Error('MOONSHOT_API_KEY appears to be invalid (too short). Please check your .env.local file.')
    }

    if (trimmedKey !== apiKey) {
      console.warn('⚠️ [MOONSHOT] Warning: API key has leading/trailing whitespace. Trimming...')
    }

    // Moonshot API is OpenAI-compatible
    this.client = new OpenAI({
      apiKey: trimmedKey,
      baseURL: 'https://api.moonshot.cn/v1', // Moonshot API endpoint
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [MOONSHOT] Client initialized with API key (length: ' + trimmedKey.length + ' characters)')
    }
  }

  async chatCompletions(
    messages: AIChatMessage[],
    options: AIChatCompletionOptions = {}
  ): Promise<AIChatCompletionResponse> {
    // Kimi K2 model name - can be overridden via environment variable or options
    // Official K2 models (all support 256K context):
    // - kimi-k2-0905-preview: Latest version, 256K context
    // - kimi-k2-turbo-preview: High-speed version (60-100 tokens/s)
    // - kimi-k2-thinking: Long-thinking model with multi-step tool calls (default)
    // - kimi-k2-thinking-turbo: High-speed thinking version
    const model = options.model || process.env.MOONSHOT_MODEL || 'kimi-k2-thinking'

    try {
      // Kimi K2 models support up to 32,000 max_tokens for output
      // If maxTokens is not specified, we'll let the API use its default
      const requestOptions: any = {
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature ?? 0.2,
        response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
      }
      
      // Only set max_tokens if explicitly provided (K2 models support up to 32K)
      if (options.maxTokens) {
        requestOptions.max_tokens = Math.min(options.maxTokens, 32000) // Cap at 32K as per K2 docs
      }
      
      const response = await this.client.chat.completions.create(requestOptions)

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
    } catch (error: any) {
      // Log full error details for debugging
      console.error('❌ [MOONSHOT] API call failed:', {
        status: error?.status,
        statusText: error?.statusText,
        type: error?.type,
        code: error?.code,
        message: error?.message,
        error: error?.error,
        response: error?.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : undefined
      })
      
      // Provide helpful error messages for authentication issues
      if (error?.status === 401 || error?.type === 'invalid_authentication_error') {
        const apiKey = process.env.MOONSHOT_API_KEY
        const keyPreview = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'
        
        console.error('❌ [MOONSHOT] Authentication failed (401 Invalid Authentication)')
        console.error('   API Key preview:', keyPreview)
        console.error('   Key length:', apiKey?.length || 0)
        console.error('   Model requested:', model)
        console.error('   Request details:', {
          messagesCount: messages.length,
          temperature: options.temperature ?? 0.2,
          maxTokens: options.maxTokens,
          responseFormat: options.responseFormat
        })
        
        // Check if it's a model-specific issue
        if (model && !model.includes('kimi')) {
          console.error('   ⚠️ WARNING: Model name does not contain "kimi" - this might be the issue!')
          console.error('   Expected model format: kimi-k2-thinking, kimi-k2-0905-preview, kimi-k2-turbo-preview, or kimi-k2-thinking-turbo')
        }
        
        // Validate model name format
        const validK2Models = [
          'kimi-k2-0905-preview',
          'kimi-k2-turbo-preview',
          'kimi-k2-thinking',
          'kimi-k2-thinking-turbo'
        ]
        if (model && model.includes('kimi-k2') && !validK2Models.includes(model)) {
          console.error(`   ⚠️ WARNING: Model "${model}" may not be a valid K2 model name`)
          console.error('   Valid K2 models:', validK2Models.join(', '))
        }
        
        console.error('   Please check:')
        console.error('   1. Is MOONSHOT_API_KEY set in your .env.local file?')
        console.error('   2. Is the API key valid and not expired?')
        console.error('   3. Does the API key have access to the requested model?')
        console.error(`   4. Is the model name correct? (currently using: ${model})`)
        console.error('   5. Have you restarted your dev server after updating .env.local?')
        
        throw new Error(
          `Moonshot API authentication failed (401). Model: ${model}. ` +
          'Please check your MOONSHOT_API_KEY in .env.local and ensure the key has access to the requested model.'
        )
      }
      
      // Re-throw other errors as-is
      throw error
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

