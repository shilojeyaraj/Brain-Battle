#!/usr/bin/env node
/**
 * Test Moonshot API Key
 * 
 * This script verifies your Moonshot API key and checks:
 * 1. If the key is valid
 * 2. What models are available
 * 3. If the key can make API calls
 */

require('dotenv').config({ path: '.env.local' })

const OpenAI = require('openai')

async function testMoonshotKey() {
  const apiKey = process.env.MOONSHOT_API_KEY

  if (!apiKey) {
    console.error('❌ MOONSHOT_API_KEY not found in .env.local')
    console.log('\n💡 Make sure you have MOONSHOT_API_KEY set in your .env.local file')
    process.exit(1)
  }

  const trimmedKey = apiKey.trim()
  console.log('🔑 API Key Info:')
  console.log(`   Length: ${trimmedKey.length} characters`)
  console.log(`   Preview: ${trimmedKey.substring(0, 8)}...${trimmedKey.substring(trimmedKey.length - 4)}`)
  console.log(`   Starts with: ${trimmedKey.substring(0, 3)}`)
  
  // Check for common issues
  if (apiKey !== trimmedKey) {
    console.log('   ⚠️  WARNING: Key has leading/trailing whitespace!')
  }
  if (apiKey.includes('"') || apiKey.includes("'")) {
    console.log('   ⚠️  WARNING: Key appears to have quotes! Remove quotes from .env.local')
  }
  if (!trimmedKey.startsWith('sk-')) {
    console.log('   ⚠️  WARNING: Key should start with "sk-"')
  }
  if (trimmedKey.length < 40 || trimmedKey.length > 60) {
    console.log('   ⚠️  WARNING: Key length seems unusual (expected ~51 characters)')
  }
  console.log('')

  // Create Moonshot client
  console.log('🔧 Creating Moonshot client...')
  console.log(`   Base URL: https://api.moonshot.cn/v1`)
  console.log('')
  
  const client = new OpenAI({
    apiKey: trimmedKey,
    baseURL: 'https://api.moonshot.cn/v1',
    // Add timeout to prevent hanging
    timeout: 30000, // 30 seconds
  })

  try {
    // Test 1: List available models
    console.log('📋 Test 1: Checking available models...')
    try {
      const models = await client.models.list()
      console.log('✅ Successfully connected to Moonshot API!')
      console.log(`   Found ${models.data.length} available model(s):`)
      models.data.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.id}`)
      })
      console.log('')

      // Check if kimi-k2 models are available
      const kimiModels = models.data.filter(m => m.id.includes('kimi-k2') || m.id.includes('k2'))
      if (kimiModels.length > 0) {
        console.log(`✅ Found ${kimiModels.length} Kimi K2 model(s):`)
        kimiModels.forEach(m => {
          console.log(`   - ${m.id}`)
        })
        console.log('')
        
        // Check for specific K2 models
        const officialK2Models = [
          'kimi-k2-0905-preview',
          'kimi-k2-turbo-preview',
          'kimi-k2-thinking',
          'kimi-k2-thinking-turbo'
        ]
        
        console.log('📋 Checking for official K2 models:')
        officialK2Models.forEach(modelName => {
          const found = models.data.find(m => m.id === modelName)
          if (found) {
            console.log(`   ✅ ${modelName} - Available`)
          } else {
            console.log(`   ❌ ${modelName} - Not available`)
          }
        })
        
        // Check for thinking model specifically
        const thinkingModel = models.data.find(m => m.id.includes('thinking'))
        if (thinkingModel) {
          console.log(`\n   ✅ Found thinking model: ${thinkingModel.id}`)
          console.log('   💡 Thinking models support multi-step tool calls and reasoning')
        }
      } else {
        console.log('⚠️  No Kimi K2 models found in available models')
        console.log('   Available models that might work:')
        models.data.forEach(m => {
          if (m.id.includes('kimi') || m.id.includes('moonshot')) {
            console.log(`   - ${m.id}`)
          }
        })
      }
      console.log('')
    } catch (error) {
      console.error('❌ Failed to list models:', error.message)
      if (error.status === 401) {
        console.error('   ⚠️  401 Invalid Authentication Error')
        console.error('')
        console.error('   Possible reasons:')
        console.error('   1. ❌ Key is invalid or incorrectly copied')
        console.error('   2. ❌ Key needs activation (wait a few minutes after creation)')
        console.error('   3. ❌ Account needs verification or has restrictions')
        console.error('   4. ❌ Account needs billing setup or has no credits')
        console.error('   5. ❌ Key has IP restrictions or region blocking')
        console.error('   6. ❌ Account is suspended or has limitations')
        console.error('   7. ❌ Wrong API endpoint (should be api.moonshot.cn/v1)')
        console.error('')
        console.error('   💡 Next steps:')
        console.error('   1. Check your Moonshot dashboard: https://platform.moonshot.cn/')
        console.error('   2. Verify the key is "Active" (not revoked)')
        console.error('   3. Check if your account has credits/quota')
        console.error('   4. Check if your account needs verification')
        console.error('   5. Try creating a new key and wait 2-3 minutes')
        console.error('   6. Check if there are IP/region restrictions on your account')
        console.error('   7. Contact Moonshot support if issue persists')
      } else {
        console.error(`   Error status: ${error.status}`)
        console.error(`   Error type: ${error.type || 'unknown'}`)
      }
      process.exit(1)
    }

    // Test 2: Try a simple API call
    console.log('🧪 Test 2: Testing API call with kimi-k2-thinking...')
    try {
      const response = await client.chat.completions.create({
        model: 'kimi-k2-thinking',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello" if you can read this.' }
        ],
        max_tokens: 10,
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content
      if (content) {
        console.log('✅ API call successful!')
        console.log(`   Response: "${content}"`)
        console.log(`   Model used: ${response.model}`)
        console.log(`   Tokens used: ${response.usage?.total_tokens || 'N/A'}`)
      } else {
        console.log('⚠️  API call succeeded but no content returned')
      }
    } catch (error) {
      console.error('❌ API call failed:', error.message)
      if (error.status === 401) {
        console.error('   Error: Invalid Authentication (401)')
        console.error('   Your API key may be:')
        console.error('   - Invalid or expired')
        console.error('   - Not have access to this model')
        console.error('   - Missing required permissions')
      } else if (error.status === 404) {
        console.error('   Error: Model not found (404)')
        console.error('   The model "kimi-k2-thinking" may not be available with your API key')
        console.error('   Try checking what models are available in Test 1 above')
      } else {
        console.error(`   Error status: ${error.status}`)
        console.error(`   Error type: ${error.type || 'unknown'}`)
      }
      process.exit(1)
    }

    console.log('')
    console.log('✅ All tests passed! Your Moonshot API key is working correctly.')
    console.log('')
    console.log('💡 If quiz generation still fails, the issue might be:')
    console.log('   1. Request size/format differences')
    console.log('   2. Rate limiting')
    console.log('   3. Model availability at the time of request')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

testMoonshotKey()

