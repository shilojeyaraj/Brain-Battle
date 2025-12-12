// CLI to test quiz generation end-to-end - DIRECT INTERNAL TESTING (NO HTTP/AUTH)
// Usage: pnpm tsx scripts/test-quiz-generation-direct.ts -- --notes-file <path-to-notes.json> [--questions <n>]
// This mirrors the EXACT flow in /api/generate-quiz route to catch issues before deployment

import fs from "fs"
import path from "path"
import { config } from "dotenv"

// Load environment variables from .env.local (same as Next.js)
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  config({ path: envPath })
} else {
  const envPath2 = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath2)) {
    config({ path: envPath2 })
  }
}

import { createAIClient } from "../src/lib/ai/client-factory"
import type { AIChatMessage } from "../src/lib/ai/types"
import { initializeBrowserPolyfills } from "../src/lib/polyfills/browser-apis"

async function main() {
  const args = process.argv.slice(2)
  
  // Parse arguments
  const notesFileIndex = args.findIndex((arg) => arg === "--notes-file" || arg === "-n")
  const questionsIndex = args.findIndex((arg) => arg === "--questions" || arg === "-q")
  
  if (notesFileIndex === -1 || !args[notesFileIndex + 1]) {
    console.error("Usage: pnpm tsx scripts/test-quiz-generation-direct.ts -- --notes-file <path-to-notes.json> [--questions <n>]")
    console.error("\nExample:")
    console.error('  pnpm tsx scripts/test-quiz-generation-direct.ts -- --notes-file notes.json --questions 5')
    console.error("\nNote: First generate notes using: pnpm test:notes-gen -- --file ...")
    process.exit(1)
  }

  const notesFilePath = path.resolve(process.cwd(), args[notesFileIndex + 1])
  const numQuestions = questionsIndex !== -1 && args[questionsIndex + 1]
    ? parseInt(args[questionsIndex + 1])
    : 5

  console.log("🧪 Testing Quiz Generation (DIRECT INTERNAL TEST)")
  console.log("=" .repeat(60))
  console.log(`📄 Notes File: ${notesFilePath}`)
  console.log(`❓ Questions: ${numQuestions}`)
  console.log("=" .repeat(60))
  console.log()

  // Step 1: Load notes
  console.log("📋 Step 1: Loading notes from file...")
  let notesData
  try {
    const notesContent = fs.readFileSync(notesFilePath, 'utf-8')
    notesData = JSON.parse(notesContent)
    console.log(`  ✅ Loaded notes`)
    console.log(`  - Title: ${notesData.title || 'N/A'}`)
    console.log(`  - Outline items: ${notesData.outline?.length || 0}`)
    console.log(`  - Key terms: ${notesData.key_terms?.length || 0}`)
    console.log(`  - Concepts: ${notesData.concepts?.length || 0}`)
    console.log(`  - Formulas: ${notesData.formulas?.length || 0}`)
  } catch (error: any) {
    console.error(`  ❌ Failed to load notes: ${error.message}`)
    process.exit(1)
  }

  // Step 2: Build quiz prompt (EXACT SAME AS SERVER)
  console.log()
  console.log("📝 Step 2: Building quiz prompt (using server's exact prompt structure)...")
  
  // Initialize polyfills
  initializeBrowserPolyfills()
  
  // Build notes content string (same as server)
  const notesContent = JSON.stringify(notesData, null, 2)
  const notesLength = notesContent.length
  const trimmedNotes = notesLength > 6000 ? notesContent.substring(0, 6000) + "..." : notesContent
  
  const systemPrompt = `You are an expert quiz generator. Your ONLY job is to create questions based on the EXACT document content provided. 

CRITICAL REQUIREMENTS:
1. You MUST ALWAYS generate the requested number of questions - NEVER return an empty questions array
2. NEVER create generic questions about a topic - only use what's in the documents
3. Every question MUST reference specific facts, examples, formulas, or processes from the provided documents
4. Always return valid JSON format with a "questions" array containing the exact number of questions requested
5. An empty questions array is NEVER acceptable - you must generate questions even if the content is minimal

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "Question text here",
      "type": "multiple_choice" | "true_false" | "open_ended",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple_choice
      "correct": "correct answer or index",
      "explanation": "Explanation of the answer"
    }
  ]
}`

  const userPrompt = `Generate ${numQuestions} quiz questions based on these study notes:

${trimmedNotes}

Requirements:
- Generate exactly ${numQuestions} questions
- Use ONLY content from the notes above
- Mix question types: multiple choice, true/false, and open-ended
- Include explanations for each answer
- Return ONLY valid JSON, no markdown code blocks`

  console.log(`  ✅ System prompt: ${systemPrompt.length} characters`)
  console.log(`  ✅ User prompt: ${userPrompt.length} characters`)
  console.log()

  // Step 3: Call AI API (EXACT SAME AS SERVER)
  console.log("🤖 Step 3: Calling AI API (using server's exact configuration)...")
  
  const aiClient = createAIClient('moonshot')
  const messages: AIChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  const startTime = Date.now()
  let response
  try {
    response = await aiClient.chatCompletions(messages, {
      model: process.env.MOONSHOT_MODEL || 'kimi-k2-thinking',
      temperature: 0.25,
      maxTokens: 9000, // Same as server
    })
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`  ✅ AI API call completed in ${elapsed} seconds`)
    console.log(`  📊 Usage: ${JSON.stringify(response.usage)}`)
  } catch (error: any) {
    console.error("  ❌ AI API call failed:", error.message)
    console.error("     Full error:", error)
    process.exit(1)
  }

  // Step 4: Extract and parse response (EXACT SAME AS SERVER)
  console.log()
  console.log("📝 Step 4: Extracting content from AI response...")
  
  let content = response.content
  console.log(`  📏 Content length: ${content?.length || 0} characters`)
  console.log(`  👀 Content preview: ${content?.substring(0, 200) || 'N/A'}...`)

  if (!content) {
    console.error("  ❌ No content in AI response!")
    process.exit(1)
  }

  // Step 5: Parse JSON (EXACT SAME AS SERVER - with markdown stripping)
  console.log()
  console.log("🔍 Step 5: Parsing JSON response...")
  
  // Strip markdown code blocks if present (same as server)
  let cleanedContent = content.trim()
  if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '')
    cleanedContent = cleanedContent.replace(/\s*```$/i, '')
    cleanedContent = cleanedContent.trim()
    console.log("  🔧 Stripped markdown code blocks from response")
  }
  
  let quizData
  try {
    quizData = JSON.parse(cleanedContent)
    console.log("  ✅ Successfully parsed JSON response")
    console.log(`  - Questions: ${quizData.questions?.length || 0}`)
  } catch (parseError: any) {
    console.error("  ❌ Failed to parse JSON response:", parseError.message)
    console.error("     Raw content:", cleanedContent.substring(0, 500))
    process.exit(1)
  }

  // Step 6: Validate questions (EXACT SAME AS SERVER)
  console.log()
  console.log("✅ Step 6: Validating questions...")
  
  const questions = quizData.questions || []
  
  if (questions.length === 0) {
    console.error("  ❌ No questions generated!")
    process.exit(1)
  }

  if (questions.length < numQuestions) {
    console.warn(`  ⚠️  Expected ${numQuestions} questions, got ${questions.length}`)
  }

  let validCount = 0
  let invalidCount = 0
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const hasQuestion = q.question && q.question.trim().length > 0
    const hasType = q.type && ["multiple_choice", "true_false", "open_ended"].includes(q.type)
    const hasCorrect = q.correct !== undefined && q.correct !== null
    const hasExplanation = q.explanation && q.explanation.trim().length > 0
    
    if (hasQuestion && hasType && hasCorrect && hasExplanation) {
      validCount++
      const questionPreview = q.question.length > 60 
        ? q.question.substring(0, 60) + "..." 
        : q.question
      console.log(`  ✅ Question ${i + 1}: ${q.type} - "${questionPreview}"`)
    } else {
      invalidCount++
      console.error(`  ❌ Question ${i + 1} is invalid:`)
      if (!hasQuestion) console.error("     - Missing question text")
      if (!hasType) console.error(`     - Invalid type: ${q.type}`)
      if (!hasCorrect) console.error("     - Missing correct answer")
      if (!hasExplanation) console.error("     - Missing explanation")
    }
  }

  console.log()
  console.log("=" .repeat(60))
  console.log("📊 Test Results:")
  console.log(`   ✅ PDF Extraction: (from notes file)`)
  console.log(`   ✅ AI API Call: ${response.usage?.total_tokens || 0} tokens`)
  console.log(`   ✅ Content Extraction: ${content.length} characters`)
  console.log(`   ✅ JSON Parsing: Success`)
  console.log(`   📝 Total Questions: ${questions.length}`)
  console.log(`   ✅ Valid: ${validCount}`)
  console.log(`   ❌ Invalid: ${invalidCount}`)
  console.log("=" .repeat(60))

  if (invalidCount > 0) {
    console.error("\n❌ Some questions are invalid!")
    process.exit(1)
  }

  if (validCount === 0) {
    console.error("\n❌ No valid questions generated!")
    process.exit(1)
  }

  console.log("\n✅ All tests passed! Quiz generation is working correctly.")
  console.log("   This matches the exact server flow, so it should work in production.")
}

main().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})

