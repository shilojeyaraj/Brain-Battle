/**
 * OpenRouter AI Client Implementation
 * 
 * OpenRouter provides access to multiple AI providers including Moonshot
 * Uses OpenAI-compatible API
 */

import OpenAI from 'openai'
import type { AIClient, AIChatMessage, AIChatCompletionOptions, AIChatCompletionResponse } from './types'

export class OpenRouterClient implements AIClient {
  private client: OpenAI
  private defaultModel: string

  constructor() {
    const apiKey = process.env.OPEN_ROUTER_KEY || process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      throw new Error('OPEN_ROUTER_KEY environment variable is required. Please check your .env.local file.')
    }

    // Trim whitespace and validate key format
    const trimmedKey = apiKey.trim()
    if (trimmedKey.length < 10) {
      throw new Error('OPEN_ROUTER_KEY appears to be invalid (too short). Please check your .env.local file.')
    }

    if (trimmedKey !== apiKey) {
      console.warn('⚠️ [OPENROUTER] Warning: API key has leading/trailing whitespace. Trimming...')
    }

    // OpenRouter API is OpenAI-compatible
    this.client = new OpenAI({
      apiKey: trimmedKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 120000, // 2 minute timeout (120 seconds) - prevent hanging
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Brain-Brawl Study App',
      },
    })
    
    // Default to Moonshot models available on OpenRouter
    // Valid Moonshot models on OpenRouter (verified via API):
    // - moonshotai/kimi-k2-thinking (262K context) - DEFAULT - Best for complex reasoning
    // - moonshotai/kimi-k2-0905 (262K context) - Latest version
    // - moonshotai/kimi-k2 (131K context) - Standard version
    // - moonshotai/kimi-k2:free (32K context) - Free tier
    // - moonshotai/kimi-linear-48b-a3b-instruct (1M context) - Largest context
    this.defaultModel = process.env.OPENROUTER_MODEL || process.env.MOONSHOT_MODEL || 'moonshotai/kimi-k2-thinking'
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [OPENROUTER] Client initialized with API key (length: ' + trimmedKey.length + ' characters)')
      console.log('   Default model: ' + this.defaultModel)
    }
  }

  async chatCompletions(
    messages: AIChatMessage[],
    options: AIChatCompletionOptions = {}
  ): Promise<AIChatCompletionResponse> {
    // Map model names: if using old Moonshot model names, convert to OpenRouter format
    let model = options.model || this.defaultModel
    
    // Convert old Moonshot model names to OpenRouter format
    // OpenRouter uses provider/model format - verified models:
    // - moonshotai/kimi-k2-thinking (262K context) - Best for complex reasoning
    // - moonshotai/kimi-k2-0905 (262K context) - Latest version
    // - moonshotai/kimi-k2 (131K context) - Standard version
    const modelMapping: Record<string, string> = {
      'kimi-k2-thinking': 'moonshotai/kimi-k2-thinking', // Perfect match - 262K context
      'kimi-k2-0905-preview': 'moonshotai/kimi-k2-0905', // Latest version
      'kimi-k2-turbo-preview': 'moonshotai/kimi-k2', // Standard version for speed
      'kimi-k2-thinking-turbo': 'moonshotai/kimi-k2-thinking', // Use thinking model
      // Fallback for invalid/old model names
      'moonshot/moonshot-v1-128k': 'moonshotai/kimi-k2-thinking', // Use K2 thinking instead
      'moonshot/moonshot-v1-32k': 'moonshotai/kimi-k2-thinking', // Use K2 thinking instead
      'moonshot/moonshot-v1-8k': 'moonshotai/kimi-k2:free', // Use free version for small context
    }
    
    if (modelMapping[model]) {
      const mappedModel = modelMapping[model]
      if (process.env.NODE_ENV === 'development' && mappedModel !== model) {
        console.log(`   🔄 [OPENROUTER] Mapped "${model}" to OpenRouter format: "${mappedModel}"`)
      }
      model = mappedModel
    }

    try {
      const requestOptions: any = {
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature ?? 0.2,
        response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
      }
      
      // OpenRouter/Moonshot models support up to 32,000 max_tokens for output
      // For notes generation, we need more tokens to ensure complete JSON responses
      if (options.responseFormat === 'json_object') {
        requestOptions.max_tokens = options.maxTokens || 32000 // Increase for complete JSON responses
      } else {
        requestOptions.max_tokens = options.maxTokens || 16000
      }
      if (options.maxTokens) {
        requestOptions.max_tokens = Math.min(options.maxTokens, 32000)
      }
      
      const response = await this.client.chat.completions.create(requestOptions)

      // Log full response structure for debugging (especially for thinking models)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [OPENROUTER] Response structure:`)
        console.log(`   Choices count: ${response.choices?.length || 0}`)
        console.log(`   Usage: ${JSON.stringify(response.usage)}`)
        if (response.choices?.[0]) {
          const choice = response.choices[0]
          console.log(`   Finish reason: ${choice.finish_reason}`)
          console.log(`   Message keys: ${Object.keys(choice.message || {}).join(', ')}`)
          console.log(`   Content length: ${choice.message?.content?.length || 0}`)
          console.log(`   Content preview: ${choice.message?.content?.substring(0, 200) || 'N/A'}`)
        }
      }

      // For thinking models, check multiple possible content locations
      let content = response.choices[0]?.message?.content
      
      // If content is empty or very short but we have completion tokens, check for thinking content
      if ((!content || content.length < 50) && response.usage?.completion_tokens && response.usage.completion_tokens > 100) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [OPENROUTER] Content seems truncated (${content?.length || 0} chars) but ${response.usage.completion_tokens} completion tokens used`)
          console.warn(`   Checking response structure for thinking content...`)
        }
        
        // Check if there's a thinking field or other content location
        const message = response.choices[0]?.message as any
        
        // Log all message fields
        if (process.env.NODE_ENV === 'development') {
          console.log(`   Message fields:`, Object.keys(message || {}))
          for (const [key, value] of Object.entries(message || {})) {
            if (typeof value === 'string') {
              console.log(`     ${key}: ${value.length} chars - "${value.substring(0, 100)}..."`)
            } else {
              console.log(`     ${key}: ${typeof value}`)
            }
          }
        }
        
        if (message?.thinking) {
          content = message.thinking
          if (process.env.NODE_ENV === 'development' && content) {
            console.log(`   [OPENROUTER] Found content in thinking field (${content.length} chars)`)
          }
        } else if (message?.refusal) {
          content = message.refusal
          if (process.env.NODE_ENV === 'development' && content) {
            console.log(`   [OPENROUTER] Found refusal field (${content.length} chars)`)
          }
        } else if (typeof message === 'object' && message !== null) {
          // Try to find any string field that might contain the actual response
          for (const [key, value] of Object.entries(message)) {
            if (typeof value === 'string' && value.length > (content?.length || 0)) {
              content = value
              if (process.env.NODE_ENV === 'development' && content) {
                console.log(`   [OPENROUTER] Found longer content in field "${key}" (${content.length} chars)`)
              }
            }
          }
        }
      }
      
      if (!content || content.trim().length === 0) {
        // Log full response structure for debugging
        console.error('❌ [OPENROUTER] No content found in response')
        console.error('   Full response:', JSON.stringify(response, null, 2))
        throw new Error('No content in OpenRouter response')
      }
      
      // Log final content length
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [OPENROUTER] Extracted content: ${content.length} characters`)
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
        provider: 'moonshot', // Keep provider as 'moonshot' for compatibility
      }
    } catch (error: any) {
      // Log full error details for debugging
      console.error('❌ [OPENROUTER] API call failed:', {
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
      
      // Handle model not found errors (400 with model ID error)
      if (error?.status === 400 && error?.message?.includes('not a valid model ID')) {
        console.error('❌ [OPENROUTER] Invalid model ID:', model)
        console.error('   Available Moonshot models on OpenRouter:')
        console.error('   - moonshotai/kimi-k2-thinking (262K context) - Recommended')
        console.error('   - moonshotai/kimi-k2-0905 (262K context)')
        console.error('   - moonshotai/kimi-k2 (131K context)')
        console.error('   - moonshotai/kimi-k2:free (32K context, free)')
        console.error('   Check https://openrouter.ai/models for the latest available models')
        console.error('   You can override the model by setting OPENROUTER_MODEL in .env.local')
        console.error('   Run: node scripts/test-openrouter-models.mjs to see all available models')
        
        throw new Error(
          `Invalid model ID: ${model}. ` +
          'Available Moonshot models: moonshotai/kimi-k2-thinking, moonshotai/kimi-k2-0905, moonshotai/kimi-k2. ' +
          'Check https://openrouter.ai/models for latest models. ' +
          'Set OPENROUTER_MODEL in .env.local to override. ' +
          'Run "node scripts/test-openrouter-models.mjs" to see all available models.'
        )
      }
      
      // Provide helpful error messages for authentication issues
      if (error?.status === 401 || error?.type === 'invalid_authentication_error') {
        const apiKey = process.env.OPEN_ROUTER_KEY || process.env.OPENROUTER_API_KEY
        const keyPreview = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'
        
        // Get actual error message from API response if available
        const apiErrorMessage = error?.response?.data?.error?.message || 
                              error?.response?.data?.message || 
                              error?.message || 
                              'Unknown error'
        
        console.error('❌ [OPENROUTER] Authentication failed (401 Invalid Authentication)')
        console.error('   API Key preview:', keyPreview)
        console.error('   Key length:', apiKey?.length || 0)
        console.error('   Model requested:', model)
        console.error('   API Error Message:', apiErrorMessage)
        
        // Check for common issues
        if (!apiKey) {
          console.error('   ❌ CRITICAL: OPEN_ROUTER_KEY is not set in environment variables!')
        } else if (apiKey.length < 20) {
          console.error('   ❌ CRITICAL: API key appears to be too short')
        }
        
        console.error('   Please check:')
        console.error('   1. Is OPEN_ROUTER_KEY set in your .env.local file?')
        console.error('   2. Is the API key valid and not expired?')
        console.error('   3. Does your OpenRouter account have credits?')
        console.error('   4. Have you restarted your dev server after updating .env.local?')
        console.error('   5. Check your OpenRouter dashboard: https://openrouter.ai/')
        
        throw new Error(
          `OpenRouter API authentication failed (401). Model: ${model}. ` +
          `API Error: ${apiErrorMessage}. ` +
          'Please check your OPEN_ROUTER_KEY in .env.local and ensure your account has credits.'
        )
      }
      
      // Re-throw other errors as-is
      throw error
    }
  }

  /**
   * Generate embeddings for text input
   * OpenRouter supports embeddings through various providers
   */
  async embeddings(text: string): Promise<number[]> {
    // OpenRouter doesn't directly support embeddings, but we can use OpenAI's embedding model
    // For now, throw an error suggesting to use OpenAI directly for embeddings
    throw new Error('Embeddings not directly supported through OpenRouter. Use OpenAI client for embeddings.')
  }
}

