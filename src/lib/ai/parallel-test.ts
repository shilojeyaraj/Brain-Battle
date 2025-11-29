/**
 * Parallel Testing Utilities
 * 
 * Runs the same request on both OpenAI and Moonshot to compare results
 */

import type { AIClient, AIChatMessage, AIChatCompletionOptions, AIChatCompletionResponse } from './types'
import { createBothClients } from './client-factory'

export interface ParallelTestResult {
  openai?: AIChatCompletionResponse
  moonshot?: AIChatCompletionResponse
  openaiError?: Error
  moonshotError?: Error
  comparison: {
    costOpenAI: number
    costMoonshot: number
    costSavings: number
    costSavingsPercent: number
    timeOpenAI?: number
    timeMoonshot?: number
    tokenDifference: number
  }
}

/**
 * Pricing constants (per 1M tokens)
 */
const PRICING = {
  openai: {
    input: 2.50,  // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
  moonshot: {
    input: 0.15,  // $0.15 per 1M input tokens
    output: 2.50, // $2.50 per 1M output tokens
  },
}

/**
 * Calculate cost for a response
 */
function calculateCost(usage: AIChatCompletionResponse['usage'], provider: 'openai' | 'moonshot'): number {
  const pricing = PRICING[provider]
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

/**
 * Run parallel test on both providers
 */
export async function runParallelTest(
  messages: AIChatMessage[],
  options: AIChatCompletionOptions = {}
): Promise<ParallelTestResult> {
  const { openai: openaiClient, moonshot: moonshotClient } = createBothClients()
  
  const startTime = Date.now()
  
  // Run both requests in parallel
  const [openaiResult, moonshotResult] = await Promise.allSettled([
    (async () => {
      const start = Date.now()
      const response = await openaiClient.chatCompletions(messages, options)
      return { response, time: Date.now() - start }
    })(),
    (async () => {
      const start = Date.now()
      const response = await moonshotClient.chatCompletions(messages, options)
      return { response, time: Date.now() - start }
    })(),
  ])

  // Extract results
  let openai: AIChatCompletionResponse | undefined
  let moonshot: AIChatCompletionResponse | undefined
  let openaiError: Error | undefined
  let moonshotError: Error | undefined
  let timeOpenAI: number | undefined
  let timeMoonshot: number | undefined

  if (openaiResult.status === 'fulfilled') {
    openai = openaiResult.value.response
    timeOpenAI = openaiResult.value.time
  } else {
    openaiError = openaiResult.reason
  }

  if (moonshotResult.status === 'fulfilled') {
    moonshot = moonshotResult.value.response
    timeMoonshot = moonshotResult.value.time
  } else {
    moonshotError = moonshotResult.reason
  }

  // Calculate costs
  const costOpenAI = openai ? calculateCost(openai.usage, 'openai') : 0
  const costMoonshot = moonshot ? calculateCost(moonshot.usage, 'moonshot') : 0
  const costSavings = costOpenAI - costMoonshot
  const costSavingsPercent = costOpenAI > 0 ? (costSavings / costOpenAI) * 100 : 0

  // Calculate token difference
  const tokenDifference = moonshot && openai 
    ? moonshot.usage.total_tokens - openai.usage.total_tokens
    : 0

  return {
    openai,
    moonshot,
    openaiError,
    moonshotError,
    comparison: {
      costOpenAI,
      costMoonshot,
      costSavings,
      costSavingsPercent,
      timeOpenAI,
      timeMoonshot,
      tokenDifference,
    },
  }
}

/**
 * Log parallel test results
 */
export function logParallelTestResults(result: ParallelTestResult, context: string = '') {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 PARALLEL TEST RESULTS ${context ? `- ${context}` : ''}`)
  console.log(`${'='.repeat(60)}`)

  if (result.openai) {
    console.log(`\n✅ OpenAI (GPT-4o):`)
    console.log(`   - Model: ${result.openai.model}`)
    console.log(`   - Tokens: ${result.openai.usage.total_tokens} (${result.openai.usage.prompt_tokens} input + ${result.openai.usage.completion_tokens} output)`)
    console.log(`   - Cost: $${result.comparison.costOpenAI.toFixed(4)}`)
    if (result.comparison.timeOpenAI) {
      console.log(`   - Time: ${result.comparison.timeOpenAI}ms`)
    }
  } else {
    console.log(`\n❌ OpenAI: ${result.openaiError?.message || 'Failed'}`)
  }

  if (result.moonshot) {
    console.log(`\n✅ Moonshot (Kimi K2):`)
    console.log(`   - Model: ${result.moonshot.model}`)
    console.log(`   - Tokens: ${result.moonshot.usage.total_tokens} (${result.moonshot.usage.prompt_tokens} input + ${result.moonshot.usage.completion_tokens} output)`)
    console.log(`   - Cost: $${result.comparison.costMoonshot.toFixed(4)}`)
    if (result.comparison.timeMoonshot) {
      console.log(`   - Time: ${result.comparison.timeMoonshot}ms`)
    }
  } else {
    console.log(`\n❌ Moonshot: ${result.moonshotError?.message || 'Failed'}`)
  }

  console.log(`\n💰 COST COMPARISON:`)
  console.log(`   - OpenAI: $${result.comparison.costOpenAI.toFixed(4)}`)
  console.log(`   - Moonshot: $${result.comparison.costMoonshot.toFixed(4)}`)
  console.log(`   - Savings: $${result.comparison.costSavings.toFixed(4)} (${result.comparison.costSavingsPercent.toFixed(1)}%)`)

  if (result.comparison.tokenDifference !== 0) {
    console.log(`\n📊 TOKEN DIFFERENCE:`)
    console.log(`   - Moonshot used ${Math.abs(result.comparison.tokenDifference)} ${result.comparison.tokenDifference > 0 ? 'more' : 'fewer'} tokens`)
  }

  console.log(`${'='.repeat(60)}\n`)
}

