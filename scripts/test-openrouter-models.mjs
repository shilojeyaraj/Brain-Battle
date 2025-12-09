/**
 * Test script to check available Moonshot models on OpenRouter
 * Run: node scripts/test-openrouter-models.mjs
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const OPEN_ROUTER_KEY = process.env.OPEN_ROUTER_KEY

if (!OPEN_ROUTER_KEY) {
  console.error('❌ OPEN_ROUTER_KEY not found in .env.local')
  process.exit(1)
}

async function testOpenRouterModels() {
  console.log('🔍 Testing OpenRouter API and checking available Moonshot models...\n')
  
  try {
    // Fetch available models from OpenRouter
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPEN_ROUTER_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Brain-Brawl Test',
      },
    })
    
    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text()
      console.error('❌ Failed to fetch models:', modelsResponse.status, errorText)
      process.exit(1)
    }
    
    const modelsData = await modelsResponse.json()
    const models = modelsData.data || []
    
    // Filter Moonshot models
    const moonshotModels = models.filter((m) => 
      m.id?.includes('moonshot') || m.id?.includes('kimi')
    )
    
    console.log(`✅ Found ${moonshotModels.length} Moonshot/Kimi models on OpenRouter:\n`)
    
    moonshotModels.forEach((model) => {
      console.log(`   📌 ${model.id}`)
      if (model.name) console.log(`      Name: ${model.name}`)
      if (model.context_length) console.log(`      Context: ${model.context_length.toLocaleString()} tokens`)
      if (model.pricing) {
        console.log(`      Pricing: $${model.pricing.prompt}/1M prompt, $${model.pricing.completion}/1M completion`)
      }
      console.log('')
    })
    
    // Test a simple API call with the first available model
    if (moonshotModels.length > 0) {
      const testModel = moonshotModels[0].id
      console.log(`🧪 Testing API call with model: ${testModel}\n`)
      
      const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPEN_ROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Brain-Brawl Test',
        },
        body: JSON.stringify({
          model: testModel,
          messages: [
            { role: 'user', content: 'Say "Hello, Brain Battle!" in one sentence.' }
          ],
          max_tokens: 50,
        }),
      })
      
      if (!testResponse.ok) {
        const errorData = await testResponse.json()
        console.error('❌ API test failed:', errorData)
        process.exit(1)
      }
      
      const testData = await testResponse.json()
      console.log('✅ API test successful!')
      console.log(`   Response: ${testData.choices[0]?.message?.content}`)
      console.log(`   Model used: ${testData.model}`)
      console.log(`   Tokens: ${testData.usage?.total_tokens}`)
      
      // Recommend best model
      const bestModel = moonshotModels.find((m) => 
        m.id.includes('32k') || (m.context_length && m.context_length >= 32000)
      ) || moonshotModels[0]
      
      console.log(`\n💡 Recommended model for Brain-Brawl: ${bestModel.id}`)
      console.log(`   Set in .env.local: OPENROUTER_MODEL=${bestModel.id}`)
    } else {
      console.log('⚠️ No Moonshot models found on OpenRouter')
      console.log('   Check https://openrouter.ai/models for available models')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testOpenRouterModels()

