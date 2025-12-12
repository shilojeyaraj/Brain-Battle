// CLI to test notes generation end-to-end - EXACT SAME FLOW AS SERVER
// Usage: pnpm test:notes-gen -- --file ./path/to/file.pdf [--topic <topic>] [--difficulty <difficulty>]
// This mirrors the EXACT flow in /api/notes route to catch issues before deployment

import fs from "fs"
import path from "path"
import { config } from "dotenv"

// Load environment variables from .env.local (same as Next.js)
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  config({ path: envPath })
} else {
  // Try .env as fallback
  const envPath2 = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath2)) {
    config({ path: envPath2 })
  }
}

import { notesSchema } from "../src/lib/schemas/notes-schema"
// Note: We use pdfjs directly (same as server) instead of extractTextFromDocument
import { createAIClient } from "../src/lib/ai/client-factory"
import type { AIChatMessage } from "../src/lib/ai/types"
import { initializeBrowserPolyfills } from "../src/lib/polyfills/browser-apis"

async function main() {
  const args = process.argv.slice(2)
  
  // Parse arguments
  const fileFlagIndex = args.findIndex((arg) => arg === "--file" || arg === "-f")
  const topicIndex = args.findIndex((arg) => arg === "--topic" || arg === "-t")
  const difficultyIndex = args.findIndex((arg) => arg === "--difficulty" || arg === "-d")
  
  if (fileFlagIndex === -1 || !args[fileFlagIndex + 1]) {
    console.error("Usage: pnpm test:notes-gen -- --file ./path/to/file.pdf [--topic <topic>] [--difficulty <difficulty>]")
    console.error("\nExample:")
    console.error('  pnpm test:notes-gen -- --file "Slides - Ch.6.4-6.10-A-2024.pdf" --topic "Mechanics" --difficulty "medium"')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), args[fileFlagIndex + 1])
  if (!filePath.toLowerCase().endsWith(".pdf")) {
    console.error("Error: file must be a PDF")
    process.exit(1)
  }
  
  const topic = topicIndex !== -1 && args[topicIndex + 1]
    ? args[topicIndex + 1]
    : null
  
  const difficulty = difficultyIndex !== -1 && args[difficultyIndex + 1]
    ? args[difficultyIndex + 1]
    : "medium"

  console.log("🧪 Testing Notes Generation (EXACT SERVER FLOW)")
  console.log("=" .repeat(60))
  console.log(`📄 PDF File: ${filePath}`)
  console.log(`📝 Topic: ${topic || "Auto-detect from document"}`)
  console.log(`📊 Difficulty: ${difficulty}`)
  console.log("=" .repeat(60))
  console.log()

  // CRITICAL: Initialize browser polyfills (same as server)
  initializeBrowserPolyfills()

  // Step 1: Extract text from PDF (EXACT SAME AS SERVER)
  console.log("📋 Step 1: Extracting text from PDF (using server's exact pdfjs extraction)...")
  const fileBuffer = await fs.promises.readFile(filePath)
  const fileName = path.basename(filePath)
  
  // Create a File-like object (same as server)
  const blob = new Blob([fileBuffer], { type: "application/pdf" })
  const file = new File([blob], fileName, { type: "application/pdf" })
  
  let extractedText: string
  try {
    // Use the EXACT same extraction method as the server (pdfjs-dist)
    const { getPdfjsLib, SERVERLESS_PDF_OPTIONS, applyGlobalPdfjsWorkerDisable } = await import('../src/lib/pdfjs-config')
    
    // Apply global worker disable FIRST (before any pdfjs operations) - EXACT SAME AS SERVER
    applyGlobalPdfjsWorkerDisable()
    
    const pdfjsLib = await getPdfjsLib()
    
    // Belt-and-suspenders: ensure worker is disabled (EXACT SAME AS SERVER - lines 235-259 in route.ts)
    if (pdfjsLib?.GlobalWorkerOptions) {
      // Server uses resolved workerSrc from config (which getPdfjsLib already set)
      // Just ensure disableWorker is true
      ;(pdfjsLib.GlobalWorkerOptions as any).disableWorker = true
    } else {
      (pdfjsLib as any).GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
    }
    if (typeof pdfjsLib?.setWorkerFetch === 'function') {
      try { pdfjsLib.setWorkerFetch(false) } catch {}
    }
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      ...SERVERLESS_PDF_OPTIONS,
      disableWorker: true,
    })
    const pdfDoc = await loadingTask.promise
    const pageTexts: string[] = []
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const textContentObj = await page.getTextContent()
      const pageText = textContentObj.items.map((item: any) => item.str).join(' ')
      pageTexts.push(pageText)
    }
    extractedText = pageTexts.join('\n\n')
    
    console.log(`  ✅ Extracted ${extractedText.length} characters from ${pdfDoc.numPages} pages`)
    console.log(`  🧩 Snippet: ${extractedText.slice(0, 200).replace(/\s+/g, " ")}...`)
  } catch (error: any) {
    console.error("  ❌ PDF extraction failed:", error.message)
    process.exit(1)
  }

  if (!extractedText || extractedText.trim().length === 0) {
    console.error("  ❌ No text extracted from PDF!")
    process.exit(1)
  }

  console.log()

  // Step 2: Build prompts (EXACT SAME AS SERVER)
  console.log("📋 Step 2: Building AI prompts (using server's exact prompt structure)...")
  
  // Build system prompt (exact copy from server)
  const systemPrompt = `You are an expert study-note generator that produces content-specific notes from the provided document(s). Your job is to extract, structure, and cite the actual material—not to invent filler.

PRIMARY GOAL:
Create high-quality study notes and quizzes only from the supplied document content, with page references and diagram mentions. Output valid JSON that matches the provided notesSchema exactly.

HARD REQUIREMENTS (NO EXCEPTIONS):

1. DOCUMENT-SPECIFIC ONLY:
   - Every sentence must be grounded in the actual text or figures
   - Include page numbers for every fact-heavy bullet, example, formula, and quiz answer: (p. XX) or (pp. XX-YY)
   - Quote short phrases exactly where definitions/terms appear (use quotation marks and page refs)
   - If page numbers are not available, use section/chapter references or document structure indicators

2. NO GENERIC FILLER (STRICTLY DISALLOWED):
   - Disallowed phrases: "Key point 1…", "Detailed explanation of…", "Important aspect of…", "This section covers…", "Real-world application of…"
   - Replace with specifics from the documents: exact terminology, steps, examples, code, formulas, data
   - Every bullet point must contain concrete information from the document

3. FORMULA EXTRACTION (CRITICAL - EXTRACT EVERY FORMULA):
   - **MANDATORY**: Extract EVERY formula, equation, and mathematical expression from the documents - do not skip any
   - Include ALL types of formulas regardless of subject
   - For each formula, provide: name, the EXACT formula as written (preserve all notation), description, ALL variable meanings, page reference, and example calculation if shown
   - Format formulas using LaTeX-style notation for proper display

You must return a valid JSON object matching this exact schema:
${JSON.stringify(notesSchema, null, 2)}

REMEMBER: Every piece of content must be directly derived from the actual document content provided.`

  // Build user prompt (exact copy from server)
  const studyTopic = topic || `Analyze the uploaded documents and determine the subject matter from their content.`
  const instructions = `Analyze the uploaded documents and create comprehensive study notes based on their actual content.`
  
  const userPrompt = `Generate comprehensive study notes based on the ACTUAL CONTENT from these specific documents:

STUDY TOPIC: ${studyTopic}
DIFFICULTY: ${difficulty}
STUDY INSTRUCTIONS: ${instructions}

⚠️ CRITICAL REQUIREMENT: You MUST extract and use ONLY the ACTUAL content from these documents.

DOCUMENT CONTENT (EXTRACT THE SPECIFIC INFORMATION FROM THESE - THIS IS THE ACTUAL CONTENT):
--- DOCUMENT 1: ${fileName} (${extractedText.length} characters) ---
${extractedText}

VALIDATION: The document content above contains ${extractedText.length} total characters. You MUST base all notes on this actual content, not on the topic name or generic knowledge.`

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
      temperature: 0.2,
      responseFormat: 'json_object',
    })
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`  ✅ AI API call completed in ${elapsed} seconds`)
    console.log(`  📊 Usage: ${JSON.stringify(response.usage)}`)
  } catch (error: any) {
    console.error("  ❌ AI API call failed:", error.message)
    console.error("     Full error:", error)
    process.exit(1)
  }

  // Step 4: Extract content (EXACT SAME AS SERVER)
  console.log()
  console.log("📝 Step 4: Extracting content from AI response...")
  
  let content = response.content
  console.log(`  📏 Content length: ${content?.length || 0} characters`)
  console.log(`  👀 Content preview: ${content?.substring(0, 200) || 'N/A'}...`)

  if (!content) {
    console.error("  ❌ No content in AI response!")
    console.error("     Full response:", JSON.stringify(response, null, 2))
    process.exit(1)
  }

  // Step 5: Parse JSON (EXACT SAME AS SERVER)
  console.log()
  console.log("🔍 Step 5: Parsing JSON response...")
  
  // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json ... ```)
  let cleanedContent = content.trim()
  if (cleanedContent.startsWith('```')) {
    // Remove opening ```json or ```
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '')
    // Remove closing ```
    cleanedContent = cleanedContent.replace(/\s*```$/i, '')
    cleanedContent = cleanedContent.trim()
    console.log("  🔧 Stripped markdown code blocks from response")
  }
  
  let notesData
  try {
    notesData = JSON.parse(cleanedContent)
    console.log("  ✅ Successfully parsed JSON response")
    console.log(`  - Title: ${notesData.title || 'No title'}`)
    console.log(`  - Outline items: ${notesData.outline?.length || 0}`)
    console.log(`  - Key terms: ${notesData.key_terms?.length || 0}`)
    console.log(`  - Concepts: ${notesData.concepts?.length || 0}`)
    console.log(`  - Formulas: ${notesData.formulas?.length || 0}`)
    console.log(`  - Diagrams: ${notesData.diagrams?.length || 0}`)
    console.log(`  - Practice questions: ${notesData.practice_questions?.length || 0}`)
  } catch (parseError: any) {
    console.error("  ❌ Failed to parse JSON response:", parseError.message)
    console.error("     Raw content:", content.substring(0, 500))
    process.exit(1)
  }

  // Step 6: Validate content (EXACT SAME AS SERVER)
  console.log()
  console.log("✅ Step 6: Validating content (using server's validation logic)...")
  
  const hasMeaningfulContent =
    Boolean(notesData?.title && String(notesData.title).trim().length > 1 && notesData.title !== ':') ||
    (Array.isArray(notesData?.outline) && notesData.outline.length > 0) ||
    (Array.isArray(notesData?.key_terms) && notesData.key_terms.length > 0) ||
    (Array.isArray(notesData?.concepts) && notesData.concepts.length > 0) ||
    (Array.isArray(notesData?.formulas) && notesData.formulas.length > 0)

  if (!hasMeaningfulContent) {
    console.error("  ❌ AI returned empty/meaningless notes payload!")
    console.error("     Title:", notesData.title)
    console.error("     Outline:", notesData.outline?.length || 0)
    console.error("     Key terms:", notesData.key_terms?.length || 0)
    console.error("     Concepts:", notesData.concepts?.length || 0)
    console.error("     Formulas:", notesData.formulas?.length || 0)
    process.exit(1)
  }

  console.log("  ✅ Content validation passed")
  console.log()

  // Step 7: Summary
  console.log("=" .repeat(60))
  console.log("📊 Test Results:")
  console.log(`   ✅ PDF Extraction: ${extractedText.length} characters`)
  console.log(`   ✅ AI API Call: ${response.usage?.total_tokens || 0} tokens`)
  console.log(`   ✅ Content Extraction: ${content.length} characters`)
  console.log(`   ✅ JSON Parsing: Success`)
  console.log(`   ✅ Content Validation: Passed`)
  console.log(`   📝 Title: ${notesData.title || 'N/A'}`)
  console.log(`   📋 Outline Items: ${notesData.outline?.length || 0}`)
  console.log(`   🔑 Key Terms: ${notesData.key_terms?.length || 0}`)
  console.log(`   💡 Concepts: ${notesData.concepts?.length || 0}`)
  console.log(`   📐 Formulas: ${notesData.formulas?.length || 0}`)
  console.log("=" .repeat(60))

  console.log("\n✅ All tests passed! Notes generation is working correctly.")
  console.log("   This matches the exact server flow, so it should work in production.")
  
  // Save notes to file for quiz generation testing
  const outputFile = path.resolve(process.cwd(), 'test-notes-output.json')
  fs.writeFileSync(outputFile, JSON.stringify(notesData, null, 2))
  console.log(`\n💾 Saved notes to: ${outputFile}`)
  console.log(`   Use this file to test quiz generation:`)
  console.log(`   pnpm tsx scripts/test-quiz-generation-direct.ts -- --notes-file ${outputFile} --questions 5`)
}

main().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})

