// CLI to test quiz generation end-to-end via HTTP API
// Requires dev server to be running: pnpm dev
// Usage: pnpm test:quiz-gen -- --file ./path/to/file.pdf [--topic <topic>] [--num-questions <n>] [--api-url <url>]

import fs from "fs/promises"
import path from "path"

async function main() {
  const args = process.argv.slice(2)
  
  // Parse arguments
  const fileFlagIndex = args.findIndex((arg) => arg === "--file" || arg === "-f")
  const topicIndex = args.findIndex((arg) => arg === "--topic" || arg === "-t")
  const numQuestionsIndex = args.findIndex((arg) => arg === "--num-questions" || arg === "-n")
  const apiUrlIndex = args.findIndex((arg) => arg === "--api-url" || arg === "-u")
  
  if (fileFlagIndex === -1 || !args[fileFlagIndex + 1]) {
    console.error("Usage: pnpm test:quiz-gen -- --file ./path/to/file.pdf [--topic <topic>] [--num-questions <n>] [--api-url <url>]")
    console.error("\nExample:")
    console.error('  pnpm test:quiz-gen -- --file "Slides - Ch.6.4-6.10-A-2024.pdf" --topic "Mechanics" --num-questions 5')
    console.error("\nNote: Requires dev server running (pnpm dev)")
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), args[fileFlagIndex + 1])
  if (!filePath.toLowerCase().endsWith(".pdf")) {
    console.error("Error: file must be a PDF")
    process.exit(1)
  }
  
  const topic = topicIndex !== -1 && args[topicIndex + 1]
    ? args[topicIndex + 1]
    : "Test Topic"
  
  const numQuestions = numQuestionsIndex !== -1 && args[numQuestionsIndex + 1]
    ? parseInt(args[numQuestionsIndex + 1])
    : 5

  const apiUrl = apiUrlIndex !== -1 && args[apiUrlIndex + 1]
    ? args[apiUrlIndex + 1]
    : process.env.TEST_API_URL || "http://localhost:3000"

  console.log("🧪 Testing Quiz Generation (via HTTP API)")
  console.log("=" .repeat(60))
  console.log(`📄 PDF File: ${filePath}`)
  console.log(`📝 Topic: ${topic}`)
  console.log(`❓ Questions: ${numQuestions}`)
  console.log(`🌐 API URL: ${apiUrl}`)
  console.log("=" .repeat(60))
  console.log()

  // Check if server is running
  try {
    const healthCheck = await fetch(`${apiUrl}/api/health`).catch(() => null)
    if (!healthCheck || !healthCheck.ok) {
      console.error("  ❌ Could not reach API server!")
      console.error("     Please start the dev server first:")
      console.error("     pnpm dev")
      console.error()
      console.error("     Then in another terminal, run this test again.")
      process.exit(1)
    } else {
      console.log("  ✅ Server is running")
    }
  } catch (error: any) {
    console.error("  ❌ Could not reach API server:", error.message)
    console.error("     Please start the dev server first: pnpm dev")
    process.exit(1)
  }

  // Check for session cookie
  const sessionCookie = process.env.TEST_SESSION_COOKIE || null
  if (!sessionCookie) {
    console.warn("  ⚠️  No session cookie provided!")
    console.warn("     Authentication will fail. To test with auth:")
    console.warn("     1. Start dev server: pnpm dev")
    console.warn("     2. Log in via web app: http://localhost:3000/login")
    console.warn("     3. Copy session cookie from browser DevTools")
    console.warn("     4. Run: TEST_SESSION_COOKIE=<cookie> pnpm test:quiz-gen -- --file ...")
    console.warn()
    console.warn("     Continuing without auth (will fail at API calls)...")
    console.log()
  }

  // Step 1: Generate notes from PDF
  console.log("📋 Step 1: Generating notes from PDF...")
  const fileBuffer = await fs.readFile(filePath)
  const fileName = path.basename(filePath)
  
  // Create FormData for notes API (Node.js 18+ has native FormData)
  const formData = new FormData()
  const blob = new Blob([fileBuffer], { type: "application/pdf" })
  const file = new File([blob], fileName, { type: "application/pdf" })
  formData.append("files", file)
  formData.append("topic", topic)
  formData.append("difficulty", "medium")
  formData.append("educationLevel", "university")

  const notesHeaders: HeadersInit = {}
  if (sessionCookie) {
    notesHeaders["Cookie"] = `brain-brawl-session=${sessionCookie}`
  }

  let notesResponse
  try {
    notesResponse = await fetch(`${apiUrl}/api/notes`, {
      method: "POST",
      headers: notesHeaders,
      body: formData,
    })
  } catch (error: any) {
    console.error("  ❌ Failed to call notes API:", error.message)
    console.error("     Make sure dev server is running: pnpm dev")
    process.exit(1)
  }

  if (!notesResponse.ok) {
    const errorText = await notesResponse.text()
    console.error(`  ❌ Notes API returned ${notesResponse.status}:`, errorText)
    if (notesResponse.status === 401) {
      console.error("     Authentication required. Make sure you're logged in via the web app.")
    }
    process.exit(1)
  }

  const notesData = await notesResponse.json()
  if (!notesData.success) {
    console.error("  ❌ Notes generation failed:", notesData.error)
    process.exit(1)
  }

  console.log("  ✅ Notes generated successfully")
  console.log(`     Title: ${notesData.notes?.title || "N/A"}`)
  console.log(`     Key Terms: ${notesData.notes?.key_terms?.length || 0}`)
  console.log(`     Concepts: ${notesData.notes?.concepts?.length || 0}`)
  console.log()

  // Step 2: Generate quiz from notes
  console.log("🎯 Step 2: Generating quiz from notes...")
  
  const quizPayload = {
    topic: topic,
    difficulty: "medium",
    totalQuestions: numQuestions,
    studyNotes: notesData.notes,
    educationLevel: "university",
    contentFocus: "both",
    includeDiagrams: false,
  }

  const quizHeaders: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (sessionCookie) {
    quizHeaders["Cookie"] = `brain-brawl-session=${sessionCookie}`
  }

  const quizResponse = await fetch(`${apiUrl}/api/generate-quiz`, {
    method: "POST",
    headers: quizHeaders,
    body: JSON.stringify(quizPayload),
  })

  if (!quizResponse.ok) {
    const errorText = await quizResponse.text()
    console.error(`  ❌ Quiz API returned ${quizResponse.status}:`, errorText)
    if (quizResponse.status === 401) {
      console.error("     Authentication required. Make sure you're logged in via the web app.")
    }
    process.exit(1)
  }

  const quizData = await quizResponse.json()
  
  if (!quizData.success) {
    console.error("  ❌ Quiz generation failed:", quizData.error)
    console.error("     Response:", JSON.stringify(quizData, null, 2))
    process.exit(1)
  }

  console.log("  ✅ Quiz generated successfully")
  console.log(`     Questions: ${quizData.questions?.length || 0}`)
  console.log(`     Session ID: ${quizData.sessionId || "N/A"}`)
  console.log()

  // Step 3: Validate questions
  console.log("✅ Step 3: Validating questions...")
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
      const questionPreview = q.question.length > 50 
        ? q.question.substring(0, 50) + "..." 
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
  console.log(`   Total Questions: ${questions.length}`)
  console.log(`   Valid: ${validCount}`)
  console.log(`   Invalid: ${invalidCount}`)
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
}

main().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})
