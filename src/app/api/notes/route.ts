import { NextRequest, NextResponse } from "next/server"
import { notesSchema } from "@/lib/schemas/notes-schema"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { extractImagesFromPDF as extractPDFImages } from "@/lib/pdf-image-extractor"
import { smartExtractDiagrams } from "@/lib/pdf-smart-extractor"
import { DiagramAnalyzerAgent } from "@/lib/agents/diagram-analyzer-agent"
import { 
  enrichDiagramsWithWebImages, 
  enrichWithYouTubeVideos, 
  generateEmbeddingsForNotes 
} from "@/lib/utils/parallel-enrichment"
import { notesGenerationSchema, validateFile } from "@/lib/validation/schemas"
import { sanitizeError, createSafeErrorResponse } from "@/lib/utils/error-sanitizer"
import { createAIClient } from "@/lib/ai/client-factory"
import { extractTextFromDocument } from "@/lib/document-text-extractor"
import type { AIChatMessage } from "@/lib/ai/types"
import { initializeBrowserPolyfills } from "@/lib/polyfills/browser-apis"

// Ensure this route runs in the Node.js runtime (needed for pdfjs + Supabase client libs)
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // CRITICAL: Initialize browser API polyfills BEFORE any PDF parsing
  // This must happen before pdf-parse or pdfjs-dist are imported/used
  initializeBrowserPolyfills()

  if (process.env.NODE_ENV === 'development') {
    console.log("🚀 [NOTES API] Starting notes generation request...")
  }
  try {
    // SECURITY: Get userId from session cookie, not form data
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      )
    }

    const form = await req.formData()
    const files = form.getAll("files") as File[]
    let topic = form.get("topic") as string
    const difficulty = form.get("difficulty") as string
    let instructions = form.get("instructions") as string
    const studyContextStr = form.get("studyContext") as string
    let studyContext = null
    if (studyContextStr) {
      try {
        studyContext = JSON.parse(studyContextStr)
      } catch (e) {
        console.log("⚠️ [NOTES API] Failed to parse study context:", e)
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log("📋 [NOTES API] Request details:")
      console.log(`  - Topic: ${topic}`)
      console.log(`  - Difficulty: ${difficulty}`)
      console.log(`  - Files: ${files.length}`)
      files.forEach((file, index) => {
        console.log(`    ${index + 1}. ${file.name} (${file.type}, ${file.size} bytes)`)
      })
    }
    
    if (!files.length) {
      console.log("❌ [NOTES API] No files provided")
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // SECURITY: Validate and sanitize inputs
    try {
      // Validate difficulty
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return NextResponse.json(
          { error: 'Invalid difficulty. Must be easy, medium, or hard.' },
          { status: 400 }
        )
      }

      // Sanitize topic (max 500 chars, trim)
      if (topic && typeof topic === 'string') {
        topic = topic.trim().slice(0, 500)
      }

      // Sanitize instructions (max 1000 chars, trim)
      if (instructions && typeof instructions === 'string') {
        instructions = instructions.trim().slice(0, 1000)
      }

      // SECURITY: Validate all files
      for (const file of files) {
        if (!file || !file.name || typeof file.size !== 'number') {
          return NextResponse.json(
            { error: 'Invalid file object' },
            { status: 400 }
          )
        }

        const validation = validateFile(file)
        if (!validation.valid) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [NOTES API] File validation failed for ${file.name}:`, validation.error)
          }
          return NextResponse.json(
            { error: validation.error || 'Invalid file' },
            { status: 400 }
          )
        }

        // Additional security: Check file size (5MB limit - optimized for cost control)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds maximum size of 5MB. For larger files, consider splitting them or upgrading to Pro.` },
            { status: 400 }
          )
        }

        // Check file type by content, not just extension
        const allowedMimeTypes = [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]
        if (!file.type || !allowedMimeTypes.includes(file.type)) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [NOTES API] File type not allowed: ${file.name} (${file.type})`)
          }
          return NextResponse.json(
            { error: `File type not allowed: ${file.name}. Supported types: PDF, DOC, DOCX, PPT, PPTX, TXT` },
            { status: 400 }
          )
        }

        // 🛡️ SECURITY: Validate file content by checking magic numbers (prevents MIME type spoofing)
        const { validateFileContent } = await import('@/lib/security/input-validation')
        const contentValidation = await validateFileContent(file)
        if (!contentValidation.valid) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [NOTES API] File content validation failed for ${file.name}:`, contentValidation.error)
          }
          return NextResponse.json(
            { error: contentValidation.error || `File content validation failed for ${file.name}. Please ensure the file is not corrupted or malicious.` },
            { status: 400 }
          )
        }
      }
    } catch (validationError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [NOTES API] Validation error:', validationError)
      }
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid input data' },
        { status: 400 }
      )
    }

    // Deduplicate files by name + size (same file uploaded multiple times)
    const uniqueFiles: File[] = []
    const seenFiles = new Set<string>()
    const duplicateFiles: string[] = []
    
    for (const file of files) {
      // Create unique key: name + size (handles same file uploaded twice)
      const fileKey = `${file.name}:${file.size}`
      
      if (seenFiles.has(fileKey)) {
        duplicateFiles.push(file.name)
        if (process.env.NODE_ENV === 'development') {
          console.log(`  ⚠️ [NOTES API] Skipping duplicate file: ${file.name} (${file.size} bytes)`)
        }
        continue
      }
      
      seenFiles.add(fileKey)
      uniqueFiles.push(file)
    }
    
    if (duplicateFiles.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`  ℹ️ [NOTES API] Removed ${duplicateFiles.length} duplicate file(s): ${duplicateFiles.join(', ')}`)
    }
    
    if (uniqueFiles.length === 0) {
      console.log("❌ [NOTES API] All files were duplicates")
      return NextResponse.json({ 
        error: "All uploaded files were duplicates. Please upload unique files." 
      }, { status: 400 })
    }

    // 1) Process files in parallel - extract text and images simultaneously
    const fileContents: string[] = []
    const extractedImages: { image_data_b64: string; page: number; width?: number; height?: number }[] = []
    const fileNames: string[] = []
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📁 [NOTES API] Processing ${uniqueFiles.length} unique files in parallel...`)
    }
    
    // Helper function to extract text and images from a single file
    // 🚀 OPTIMIZATION: For PDFs, extract both text and images in a single scan
    const extractTextAndImagesFromFile = async (file: File, buffer: Buffer): Promise<{ textContent: string; fileName: string; images: { image_data_b64: string; page: number; width?: number; height?: number }[] }> => {
      let textContent = ""
      let images: { image_data_b64: string; page: number; width?: number; height?: number }[] = []
      
      if (file.type === "text/plain") {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📝 [NOTES API] Processing ${file.name} as plain text file`)
        }
        textContent = buffer.toString('utf-8')
      } else if (file.type === "application/pdf") {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📄 [NOTES API] Processing ${file.name} as PDF file (unified extraction)`)
        }
        
        try {
          // 🚀 OPTIMIZATION: Use unified extractor - loads PDF once, extracts both text and images
          const { extractPDFTextAndImages } = await import('@/lib/pdf-unified-extractor')
          const pdfContent = await extractPDFTextAndImages(buffer, file.name)
          
          textContent = pdfContent.text
          images = pdfContent.images
          
          if (!textContent || textContent.trim().length < 100) {
            throw new Error(`PDF parsing returned insufficient content (${textContent.length} characters).`)
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters and ${images.length} images from ${file.name} (single scan)`)
          }
        } catch (pdfError) {
          throw new Error(`Failed to parse PDF "${file.name}". Error: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`)
        }
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        // Word document (.docx or .doc) - no images
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📝 [NOTES API] Processing ${file.name} as Word document`)
        }
        try {
          textContent = await extractTextFromDocument(file, buffer)
          if (!textContent || textContent.trim().length < 10) {
            throw new Error(`Word document "${file.name}" appears to be empty.`)
          }
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from ${file.name}`)
          }
        } catch (wordError) {
          throw new Error(`Failed to parse Word document "${file.name}". Error: ${wordError instanceof Error ? wordError.message : String(wordError)}`)
        }
        images = [] // Word documents don't have extractable images
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.type === 'application/vnd.ms-powerpoint'
      ) {
        // PowerPoint presentation (.pptx or .ppt) - no images
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📊 [NOTES API] Processing ${file.name} as PowerPoint presentation`)
        }
        try {
          textContent = await extractTextFromDocument(file, buffer)
          if (!textContent || textContent.trim().length < 10) {
            throw new Error(`PowerPoint presentation "${file.name}" appears to be empty.`)
          }
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from ${file.name}`)
          }
        } catch (pptError) {
          throw new Error(`Failed to parse PowerPoint "${file.name}". Error: ${pptError instanceof Error ? pptError.message : String(pptError)}`)
        }
        images = [] // PowerPoint files don't have extractable images in our current implementation
      } else if (file.type?.startsWith('text/')) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📝 [NOTES API] Processing ${file.name} as text file (${file.type})`)
        }
        textContent = buffer.toString('utf-8')
        if (!textContent || textContent.trim().length < 10) {
          throw new Error(`Text file "${file.name}" appears to be empty.`)
        }
        images = [] // Text files don't have images
      } else {
        throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, DOC, DOCX, PPT, PPTX, TXT`)
      }
      
      return { textContent, fileName: file.name, images }
    }
    
    // 🚀 OPTIMIZATION: Process all files in parallel
    // For PDFs, text and images are extracted together in a single scan (no duplicate loading!)
    const fileProcessingStart = Date.now()
    const fileProcessingPromises = uniqueFiles.map(async (file, index) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n📄 [NOTES API] Processing file ${index + 1}/${uniqueFiles.length}: ${file.name}`)
      }
      
      const buffer = Buffer.from(await file.arrayBuffer())
      
      // Extract text and images together (for PDFs, this is a single scan)
      const result = await extractTextAndImagesFromFile(file, buffer)
      
      return {
        textContent: result.textContent,
        fileName: result.fileName,
        images: result.images
      }
    })
    
    // Wait for all files to be processed
    const fileResults = await Promise.allSettled(fileProcessingPromises)
    
    // Process results and collect valid content
    let hasValidContent = false
    for (const result of fileResults) {
      if (result.status === 'fulfilled') {
        const { textContent, fileName, images } = result.value
        
        if (textContent && textContent.trim().length > 0) {
          fileContents.push(textContent)
          fileNames.push(fileName)
          if (textContent.trim().length >= 100) {
            hasValidContent = true
          }
        }
        
        if (images && images.length > 0) {
          extractedImages.push(...images)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error(`  ❌ [NOTES API] Error processing file:`, result.reason)
        }
        // Re-throw critical errors
        if (result.reason instanceof Error && result.reason.message.includes('Failed to parse')) {
          throw result.reason
        }
      }
    }
    
    const fileProcessingTime = Date.now() - fileProcessingStart
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n⏱️ [NOTES API] File processing completed in ${fileProcessingTime}ms (parallel processing)`)
    }
    
    // CRITICAL: Validate that we have actual document content before proceeding
    if (!hasValidContent || fileContents.length === 0 || fileContents.every(content => content.trim().length < 100)) {
      const totalContent = fileContents.join('').trim().length
      console.error(`  ❌ [NOTES API] CRITICAL: No valid content extracted from documents. Total content length: ${totalContent} characters`)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to extract meaningful content from the uploaded documents. Please ensure the files are not corrupted, password-protected, or image-only PDFs. Extracted only ${totalContent} characters total.` 
      }, { status: 400 })
    }
    
    const totalContentLength = fileContents.join('').length
    console.log(`  ✅ [NOTES API] Successfully extracted ${totalContentLength} total characters from ${fileContents.length} files`)
    
    console.log(`\n📊 [NOTES API] File processing summary:`)
    console.log(`  - Files received: ${files.length}`)
    console.log(`  - Unique files processed: ${uniqueFiles.length}`)
    if (duplicateFiles.length > 0) {
      console.log(`  - Duplicate files skipped: ${duplicateFiles.length} (${duplicateFiles.join(', ')})`)
    }
    console.log(`  - File contents extracted: ${fileContents.length}`)
    console.log(`  - Images extracted: ${extractedImages.length}`)
    console.log(`  - Total content length: ${totalContentLength} characters`)

    // 3) Use semantic search to understand the content better (optional)
    // Note: Semantic search requires userId and searches stored documents.
    // Since we're processing new documents, we'll skip this for now.
    // If you want to search previously uploaded documents, you can add userId to the request.
    console.log("🔍 [NOTES API] Skipping semantic search (processing new documents)")
    let relevantChunks: any[] = []
    
    // Semantic search is optional and only useful if searching previously uploaded documents
    // For new document processing, we'll proceed with the document content directly

    // 4) Analyze content complexity and education level
    console.log("🔍 [NOTES API] Analyzing content complexity and education level...")
    
    // 5) Generate study notes using OpenAI with enhanced schema
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

3. IMAGE/DIAGRAM AWARENESS:
   - If a chart/diagram/table/figure is shown, reference it in the relevant concept section
   - Include page numbers where diagrams appear
   - Describe what the visual shows and how it supports the concept
   - Create questions that reference specific diagrams when applicable
   - NEVER use uncertain language: avoid "likely", "possibly", "may", "might", "probably", "perhaps", "appears to", "seems to"
   - Use definitive statements: "This diagram shows...", "The figure illustrates...", "This chart demonstrates..."

4. FORMULA EXTRACTION (CRITICAL - EXTRACT EVERY FORMULA):
   - **MANDATORY**: Extract EVERY formula, equation, and mathematical expression from the documents - do not skip any
   - Include ALL types of formulas regardless of subject:
     * Mathematical formulas (algebra, calculus, geometry, statistics)
     * Scientific formulas (physics, chemistry, biology, engineering)
     * Algorithmic formulas (time complexity, space complexity, recurrence relations)
     * Conversion formulas (unit conversions, coordinate transformations)
     * Definition formulas (mathematical definitions, scientific laws)
     * Test/measurement formulas (standardized tests, experimental calculations)
     * Percentage calculations, ratios, proportions
     * Any equation with mathematical operators (=, +, -, ×, ÷, √, ^, log, ln, ∫, Σ, ∏, etc.)
   - Look for formulas with:
     * Mathematical operators: =, +, -, ×, ÷, /, √, ^, ², ³, log, ln, ∫, Σ, ∏, lim, etc.
     * Subscripts and superscripts (A₀, x², H₂O, E=mc²)
     * Greek letters (α, β, γ, δ, ε, θ, λ, μ, π, ρ, σ, τ, φ, ω, Δ, Σ, etc.)
     * Special notation (vectors, matrices, sets, functions)
     * Variables and constants
     * Percentages, ratios, and proportions
   - For each formula, provide: name, the EXACT formula as written (preserve all notation), description, ALL variable meanings, page reference, and example calculation if shown
   - Extract formulas from: main text, examples, diagrams, captions, side notes, footnotes, worked problems, and any mathematical expressions
   - If a formula appears multiple times, include it with each page reference
   - Include derived formulas, conversion formulas, and formulas used in worked examples
   - **FORMULA FORMATTING (CRITICAL)**: Format formulas using LaTeX-style notation for proper display:
     * Use underscores for subscripts: D_i, A_0, l_f (not D<sub>i</sub>)
     * Use caret (^) or Unicode superscripts for powers: x^2, x², D²
     * Use \frac{numerator}{denominator} for fractions: \frac{2F}{\pi D}
     * Use \sqrt{} for square roots: \sqrt{D^2 - D_i^2}
     * Use proper function names: \ln, \log, \sin, \cos (not "In" or "in")
     * Preserve Greek letters: \mu, \pi, \sigma, \alpha, \beta, etc.
     * Use proper operators: \times, \div, \pm, \leq, \geq
     * Example: "BHN = \frac{2F}{\pi D[D-\sqrt{D^2-D_i^2}]}" instead of "BHN = 2F/(πD[D-√(D²-Di²)])"
   - Preserve mathematical notation exactly: subscripts, superscripts, Greek letters, special symbols, formatting
   - **COUNT**: Before finishing, count how many formulas you found in the document and ensure ALL are in the formulas array

5. CITATIONS & REFERENCES:
   - Use the format (p. N) or (pp. N–M) directly in bullets, definitions, and explanations
   - For multi-step processes spanning multiple pages, cite each page next to the step it came from
   - Include page references in key_terms definitions when the term is defined
   - Add page references to examples and practice questions

6. QUOTE EXACT PHRASES:
   - When definitions or key terms appear in the document, quote them exactly with quotation marks
   - Format: "Exact definition from document" (p. XX)
   - Preserve the original terminology and phrasing from the source material

7. DIFFICULTY & PREREQUISITES:
   - Infer difficulty from vocabulary and depth in the document (explain why, with page refs)
   - List prerequisite topics only if they are mentioned or clearly implied (with page refs)
   - Base complexity_analysis on actual document content, not assumptions
   - Use the inferred education_level to adjust HOW you explain (language, depth, notation),
     not WHAT facts you include. All facts must still come directly from the document.

8. SCHEMA COMPLIANCE:
   - Output MUST be valid JSON that matches the provided notesSchema exactly (no extra keys, no missing required keys)
   - If information is not present in the document, omit it or mark as null—do not invent
   - All arrays must contain actual content from documents, not placeholder items

9. QUESTION & QUIZ GENERATION (ALL SUBJECTS):
   - Create varied items that reference exact examples/figures from the documents
   - Recall questions: terms/definitions exactly as written (with page refs)
   - Procedure/Trace questions: use the exact examples from slides/documents (with page refs)
   - Application questions: use the same algorithmic steps or examples as shown in documents
   - For each question: include answer, explanation, and page references used
   
   **Topic-local rules (any subject):**
   - Each practice_question must primarily test ONE clearly identifiable concept or topic.
   - Questions must be tightly tied to the specific slide/section where that concept appears.
   - In a section about concept A, do NOT ask about concept B or C unless the original document
     is explicitly comparing them in that section.
   - Comparison sections (e.g., time/space complexity tables, summary/comparison slides) may
     mention multiple concepts, but MUST NOT repeat full algorithm/definition blocks that already
     appeared elsewhere. Focus on differences, trade-offs, and relationships instead.
   - Do NOT create the same "global" question in every section (e.g., "What is the time complexity
     of Bubble Sort?")—that question should appear only in the most relevant section.
   
   **De-duplication guidance (CRITICAL):**
   - Within a section, questions must be semantically distinct (no trivial rephrasings).
   - Across sections, avoid copying the same question text or idea; if a similar question is
     needed, adapt it so it is clearly section-specific (e.g., reference that section's example
     array, diagram, or formula).
   - Before finalizing, scan all practice_questions and mentally normalize them; if several
     questions are effectively the same (same answer/explanation), keep only the most precise
     and section-appropriate version.
   - REJECT and regenerate if you notice "the same three questions" being reused under multiple
     different topics or sections.
   
   **Formulas and numeric examples:**
   - When you list a formula (in the formulas array or in explanations), always tie it to how
     the document actually uses it: if the document shows a worked example, reproduce the
     calculation and show how the numbers plug into the formula.
   - Do NOT invent new numeric examples that are not clearly implied by the document; prefer the
     exact input sizes, values, or datasets shown in the slides/notes.
   
   **Diagrams and visuals:**
   - When relevant diagrams exist for a concept (based on page numbers), questions and bullets
     should explicitly refer to what those diagrams show (e.g., trace of an algorithm, graph
     shape, physical setup), not just list the diagram title.

   **Algorithm & pseudocode specific guidance (e.g., sorting algorithms):**
   - When the document shows pseudocode or numbered algorithm steps, include that pseudocode in
     the concepts and/or outline, and base at least some practice_questions on those exact steps.
   - For trace/step-by-step slides, create questions that walk through the SAME example arrays or
     inputs shown in the document (with page refs), not invented ones.
   - If the document distinguishes between build-heap, heapify, or similar sub-steps, represent
     those as separate bullets/concepts and, if appropriate, separate questions.

   **Page reference discipline:**
   - Page/slide references must match where the concept actually appears in the document text.
   - Do NOT reuse the same page numbers for unrelated topics (e.g., do not say Heap Sort is on
     the same page numbers as Bubble Sort if that is not true in the document).
   - If you are not confident about the exact page number for a fact, omit the page number rather
     than guessing.

VALIDATION & SELF-CHECK (Before returning output - CRITICAL):
Reject and regenerate if any of these fail:

1. **Generic outline items (MANDATORY CHECK)**:
   - REJECT if outline contains generic phrases like:
     * "Definition and importance of..."
     * "Understanding... concepts"
     * "Introduction to..."
     * "Tensile testing and its role in..."
     * "Elastic modulus and yield strength concepts"
     * "Poisson's ratio and its significance..."
   - ACCEPT only if outline items contain:
     * Specific formulas (e.g., "Engineering stress S = F/A₀")
     * Specific examples (e.g., "Example: D₀=12.5mm, Df=9.85mm → 37.9% RA")
     * Specific tests or procedures (e.g., "Brinell Hardness Test: BHN = 2F/(πD[D-√(D²-Dᵢ²)])")
     * Specific calculations or methods
     * Page references
     * Content that could ONLY come from this specific document

2. **Missing formulas (MANDATORY CHECK)**:
   - Scan document for ALL mathematical expressions
   - REJECT if document contains formulas but formulas array is empty or missing key formulas
   - Must include ALL formulas found: mathematical, scientific, algorithmic, conversion, definition, test, percentage, ratio, or ANY equation
   - Check for: =, ÷, ×, +, -, /, √, ^, ², ³, ln, log, ∫, Σ, ∏, lim, subscripts, superscripts, Greek letters, special notation
   - Count formulas in document vs formulas array - they should match or be very close

3. **Missing concepts (MANDATORY CHECK)**:
   - REJECT if major concepts from slide titles/headings are missing
   - Must include ALL concepts mentioned in the document (do not skip any)
   - Check that concepts array has detailed bullets with specific examples/formulas from the document
   - Concepts should be specific to the document's subject matter (not generic)

4. **Missing diagrams (MANDATORY CHECK)**:
   - REJECT if diagrams are mentioned in text but not in diagrams array
   - Must include ALL figures, charts, illustrations, and visual content
   - Each diagram must have: title, caption, page reference

5. **Other validation checks**:
   - No page refs present in bullets/answers/examples where content is fact-heavy
   - Any placeholder phrasing like "Key point 1/2/3", "Detailed explanation…", "Important aspect…"
   - Facts/examples not found in the document text or figures
   - JSON not valid against notesSchema
   - Missing diagram references when the document shows figures for that topic
   - Generic content instead of document-specific information
   - Use of uncertain language: "likely", "possibly", "may", "might", "probably", "perhaps", "appears to", "seems to", "could be"
   - Outline items that could apply to any document on the topic (must be specific to THIS document's content)

**CRITICAL**: Before finalizing output, count:
- Number of formulas in document vs formulas array (must match or be very close)
- Number of major concepts in document vs concepts array (must match)
- Number of diagrams mentioned vs diagrams array (must match)
- Check that outline items are specific enough that they couldn't apply to a different document on the same topic

OUTPUT REQUIREMENTS:
- Temperature should be low (0.2–0.4) to minimize invention
- Strictly follow the schema—no markdown in JSON
- If instructions conflict with the document, the document wins
- Prefer concise, bullet-first, example-heavy format
- Quote exact phrases where it helps fidelity

You must return a valid JSON object matching this exact schema:
${JSON.stringify(notesSchema, null, 2)}

REMEMBER: Every piece of content must be directly derived from the actual document content provided. Extract specific information, examples, and details from these documents rather than generating generic educational content.`

    // Build study context instructions
    let contextInstructions = ""
    if (studyContext) {
      contextInstructions = "\n\nSTUDY PREFERENCES:\n"
      if (studyContext.studyFocus) {
        contextInstructions += `- Study Focus: ${studyContext.studyFocus}\n`
      }
      if (studyContext.questionTypes && studyContext.questionTypes.length > 0) {
        contextInstructions += `- Preferred Question Types: ${studyContext.questionTypes.join(', ')}\n`
      }
      if (studyContext.difficulty) {
        contextInstructions += `- Difficulty Level: ${studyContext.difficulty}\n`
      }
      if (studyContext.specialInstructions) {
        contextInstructions += `- Special Instructions: ${studyContext.specialInstructions}\n`
      }
      contextInstructions += "\nPlease tailor the study notes to these preferences while still basing everything on the document content.\n"
    }

    // Auto-generate topic from document content if not provided
    let studyTopic = topic || instructions
    if (!studyTopic) {
      // Extract first few lines from documents to generate a topic
      const firstDocument = fileContents[0] || ''
      const firstLines = firstDocument.split('\n').slice(0, 10).join(' ').substring(0, 200)
      studyTopic = `Study materials from uploaded documents: ${firstLines}...`
    }

    // Build topic instruction - if topic is provided, use it; otherwise instruct AI to determine from content
    const topicInstruction = studyTopic && studyTopic !== `Content from uploaded documents: ${fileNames.join(', ')}`
      ? `STUDY TOPIC: ${studyTopic}`
      : `STUDY TOPIC: Analyze the uploaded documents and determine the subject matter from their content. Extract the main topic, theme, or subject from the document text itself.`
    
    const userPrompt = `Generate comprehensive study notes based on the ACTUAL CONTENT from these specific documents:

${topicInstruction}
DIFFICULTY: ${difficulty || 'medium'}
STUDY INSTRUCTIONS: ${instructions || 'Analyze the uploaded documents and create comprehensive study notes based on their actual content. Extract key concepts, terms, and topics from the documents themselves. Determine the subject matter from the document content if no specific topic was provided.'}

⚠️ CRITICAL REQUIREMENT: You MUST extract and use ONLY the ACTUAL content from these documents. 
- If the document is about chemistry, create chemistry notes
- If the document is about algorithms, create algorithm notes  
- If the document is about biology, create biology notes
- DO NOT generate generic content or content from other topics
- Every fact, example, and definition must come directly from the document text below
- If the document content is about "${fileNames[0] || 'the uploaded file'}", your notes MUST be about that topic

DOCUMENT CONTENT (EXTRACT THE SPECIFIC INFORMATION FROM THESE - THIS IS THE ACTUAL CONTENT):
${fileContents.map((content, index) => `--- DOCUMENT ${index + 1}: ${fileNames[index] || `File ${index + 1}`} (${content.length} characters) ---\n${content}\n`).join('\n\n')}

VALIDATION: The document content above contains ${fileContents.join('').length} total characters. You MUST base all notes on this actual content, not on the topic name or generic knowledge.

⚠️ CRITICAL EXTRACTION REQUIREMENTS FOR THIS DOCUMENT - DO NOT SKIP ANY:

1. **FORMULAS (MANDATORY - EXTRACT EVERY SINGLE ONE)**: 
   Scan the ENTIRE document character by character for ALL formulas, equations, and mathematical expressions. Look for:
   
   **Mathematical Operators & Symbols**:
   - Basic operators: =, +, -, ×, ÷, /, ^, ², ³
   - Advanced operators: √, ∛, log, ln, lg, ∫, Σ, ∏, lim, ∂, ∇
   - Comparison operators: <, >, ≤, ≥, ≠, ≈, ≡
   - Set operators: ∈, ∉, ∪, ∩, ⊂, ⊆, ∅
   - Logic operators: ∧, ∨, ¬, →, ↔
   
   **Notation Types**:
   - Subscripts: A₀, x₁, H₂O, C₆H₁₂O₆, T(n), f(x)
   - Superscripts: x², x³, e⁻ˣ, 10⁻³, Aᵀ, xⁿ
   - Greek letters: α, β, γ, δ, ε, θ, λ, μ, π, ρ, σ, τ, φ, ω, Δ, Σ, Ω, etc.
   - Special symbols: ∞, ±, ∓, ∑, ∏, ∫, ∂, ∇, ∠, °, %, etc.
   - Vectors and matrices: **v**, **A**, |x|, ||x||
   
   **Formula Categories** (extract ALL types):
   - Mathematical formulas: algebra, calculus, geometry, trigonometry, statistics, probability
   - Scientific formulas: physics (mechanics, thermodynamics, electromagnetism), chemistry (stoichiometry, kinetics), biology (growth, decay)
   - Engineering formulas: stress/strain, fluid dynamics, heat transfer, electrical circuits
   - Algorithmic formulas: time complexity O(n), space complexity, recurrence relations T(n) = ...
   - Conversion formulas: unit conversions, coordinate transformations, scaling factors
   - Definition formulas: mathematical definitions, scientific laws, physical constants
   - Test/measurement formulas: standardized calculations, experimental formulas, test procedures
   - Percentage/ratio formulas: percentages, ratios, proportions, rates
   - Statistical formulas: mean, variance, standard deviation, correlation, regression
   - Any equation that expresses a relationship between variables
   
   **Extraction Requirements**:
   - Extract from: main text, examples, worked problems, diagrams, captions, side notes, footnotes, tables, charts
   - Preserve exact notation: subscripts, superscripts, Greek letters, special symbols, formatting
   - Include variable definitions when provided
   - Include example calculations if shown
   - If a formula appears multiple times, include it with each page reference
   - Include derived formulas, conversion formulas, and formulas used in worked examples
   - **COUNT**: Before finishing, count how many formulas you found in the document and ensure ALL are in the formulas array

2. **OUTLINE**: Create outline items that are SPECIFIC to this document - MUST be identifiable to THIS document only:
   - Use EXACT slide titles, section headings, and chapter titles from the document
   - Include specific formulas, calculations, or examples in outline items when mentioned
   - Include specific tests, procedures, methods, or algorithms mentioned
   - Include specific concepts, definitions, or examples from the document
   - Add page references to each outline item: "Specific Content (p. XX)"
   - Make each item so specific that it could ONLY come from this document
   - BAD (REJECT): "Definition and importance of [topic]" (too generic, could apply to any document)
   - BAD (REJECT): "Understanding [topic] concepts" (too generic)
   - BAD (REJECT): "[Topic] and its significance" (too generic)
   - GOOD: Include specific formulas, examples, calculations, procedures, or unique content from the document
   - GOOD: Reference specific examples, worked problems, or case studies shown
   - GOOD: Include specific terminology, notation, or methods unique to this document
   - GOOD: Add page references and make items identifiable to specific slides/sections

3. **CONCEPTS**: Extract EVERY concept mentioned - do not skip any:
   - Main concepts from headings, titles, and slide titles
   - Concepts from examples and worked problems (include specific examples with values/calculations)
   - Concepts shown in diagrams (describe what diagrams show in detail)
   - Related concepts and connections
   - Do not skip "minor" concepts - if it's mentioned, include it
   - Extract concepts relevant to the document's subject matter (mathematics, science, engineering, computer science, etc.)
   - For each concept, include: heading, detailed bullets with specific examples/formulas from the document, examples with actual values, connections to other concepts, page references

4. **DIAGRAMS**: Reference ALL diagrams, figures, charts, and illustrations:
   - Describe what each diagram shows
   - Include page references
   - Link diagrams to relevant concepts
   - Extract formulas or data shown in diagrams

${relevantChunks.length > 0 ? `\nSEMANTIC SEARCH RESULTS (for additional context):
${relevantChunks.map((chunk, index) => `Chunk ${index + 1}: ${chunk.content}`).join('\n\n')}\n` : ''}

${extractedImages.length > 0 ? `\nEXTRACTED IMAGES FROM DOCUMENTS: ${extractedImages.length} images were extracted from the PDF documents.

IMPORTANT: These images contain diagrams, figures, charts, and illustrations from the original documents. When creating study notes and quiz questions:
- Reference these images with their page numbers: (p. XX)
- Ask questions about the content visible in these images
- Use the images to create visual learning questions
- Include image descriptions and captions in your study materials
- Describe what each diagram shows and how it supports the concept

${extractedImages.map((img, idx) => `Image ${idx + 1} (Page ${img.page}${img.width && img.height ? `, ${img.width}x${img.height}px` : ''}):
[Base64 encoded image data available - use this to reference visual content from the document]
`).join('\n')}\n` : ''}${contextInstructions}

CONTENT EXTRACTION REQUIREMENTS:

1. EXTRACT SPECIFIC INFORMATION WITH CITATIONS:
   - Pull out the exact key terms, definitions, and concepts from the documents
   - Quote definitions exactly as they appear: "exact definition text" (p. XX)
   - Extract specific examples, case studies, and data mentioned in the documents with page refs
   - Identify the actual structure and organization of the content
   - Note any specific formulas, equations, or technical details provided (with page refs)
   - Extract any specific learning objectives or goals mentioned
   - If no study instructions are provided, analyze the documents to determine the main subject area, key topics, and educational level

2. DOCUMENT-SPECIFIC QUESTION CREATION:
   - Create questions that test understanding of the ACTUAL content in these documents
   - Include questions about specific examples, data, or concepts mentioned (with page refs)
   - Reference specific sections, chapters, or topics from the documents
   - Extract specific facts, figures, or details for factual questions
   - Create application questions based on the specific examples given in the documents
   - Use the exact examples/traces/arrays shown in the documents for practice questions

3. CONTENT-SPECIFIC RESOURCES:
   - Find resources that directly relate to the specific topics covered in these documents
   - Include resources that explain the same concepts using similar terminology
   - Prioritize resources that cover the same examples or case studies mentioned
   - Ensure resources match the specific subject matter and level of these documents

4. ACCURATE COMPLEXITY ANALYSIS:
   - Base education level on the actual vocabulary and concepts used in these documents (cite examples with page refs)
   - Identify prerequisite knowledge based on what's actually mentioned or implied (with page refs)
   - Match difficulty level to the actual content complexity in these documents
   - Explain your reasoning for complexity assessment with references to document content

5. DOCUMENT-SPECIFIC STUDY MATERIALS:
   - **OUTLINE REQUIREMENTS (CRITICAL)**:
     * Create outline items that are SPECIFIC to the actual content, not generic
     * Use exact terminology, formulas, and concepts from the documents
     * Include specific formulas in outline items when relevant (e.g., "Engineering stress (S = F/A₀) vs True stress (σ = F/A)")
     * Reference specific examples, tests, or procedures mentioned (e.g., "Brinell Hardness Test: BHN = 2F/(πD[D-√(D²-Dᵢ²)])")
     * Include page references in outline items: "Concept Name (p. XX)"
     * BAD: "Definition and importance of stress and strain" (too generic)
     * GOOD: "Engineering stress (S = F/A₀) and strain (e = Δl/l₀) definitions and measurement via tensile testing (p. 1)"
     * BAD: "Understanding tensile strength concepts" (too generic)
     * GOOD: "Tensile strength, modulus of resilience, and tensile toughness calculations with worked examples (p. 3)"
     * Extract outline from: slide titles, section headings, chapter titles, and document structure
     * Each outline item should be specific enough that someone could identify which slide/section it refers to
   - **CONCEPT EXTRACTION (EXTRACT ALL CONCEPTS)**:
     * Extract EVERY concept mentioned in the documents, not just main ones
     * Include concepts from: definitions, examples, diagrams, side notes, captions, and worked problems
     * Extract related concepts and connections between concepts
     * Include concepts shown visually in diagrams (describe what diagrams show)
     * For each concept: provide heading, detailed bullets with specific information, examples from the document, connections to other concepts, and page references
     * Do not skip "minor" concepts - if it's in the document, include it
   - Extract key terms and definitions as they appear in the documents (with quotations and page refs)
   - Use the specific examples and explanations provided in the documents
   - Create study tips based on the actual content and learning objectives
   - Identify misconceptions based on the specific subject matter covered
     - **EXTRACT ALL FORMULAS**: Identify and extract EVERY formula, equation, and mathematical expression
     * Mathematical formulas (algebra, calculus, geometry, statistics, etc.)
     * Scientific formulas (physics, chemistry, biology, engineering, etc.)
     * Algorithmic formulas (time complexity, space complexity, recurrence relations, etc.)
     * Conversion formulas (unit conversions, coordinate transformations, etc.)
     * Definition formulas (mathematical definitions, scientific laws, etc.)
     * Test/measurement formulas (standardized tests, experimental calculations, etc.)
     * Percentage/ratio formulas, proportions, rates
     * Any formula with mathematical notation, subscripts, superscripts, Greek letters, special symbols
     * For each formula: extract name, exact formula text (preserve notation), description, ALL variables, page reference, and examples

6. AUTOMATIC DOCUMENT ANALYSIS (when no instructions provided):
   - Analyze the document titles, headers, and content to determine the main subject
   - Identify the educational level based on vocabulary and concept complexity
   - Extract the key learning objectives from the document structure
   - Determine the appropriate difficulty level based on content complexity
   - Create a meaningful title that reflects the actual document content

CITATION FORMAT:
- Use (p. N) for single page references
- Use (pp. N–M) for multi-page references
- Use (Section X) or (Chapter Y) if page numbers aren't available
- Include citations in: key_terms definitions, concept bullets, examples, practice questions, complexity analysis

ANTI-PATTERNS TO AVOID:
- ❌ "Key point 1: Important aspect of [topic]"
- ✅ "Bubble sort compares adjacent elements and swaps if out of order (p. 9)"
- ❌ "Detailed explanation of [concept]"
- ✅ "The algorithm uses two nested loops: outer loop runs n-1 times, inner loop runs n-i-1 times (p. 11)"
- ❌ "Real-world application of [topic]"
- ✅ "Example trace: [29, 10, 14, 37, 13] after pass 1 becomes [10, 14, 29, 13, 37] (p. 12)"
- ❌ Outline: "Definition and importance of [topic]"
- ✅ Outline: Include specific formulas, examples, calculations, or procedures from the document with page references
- ❌ Outline: "Understanding [topic] concepts"
- ✅ Outline: Reference specific content, formulas, examples, or methods unique to this document with page references
- ❌ Missing formula: Document shows a formula but it's not in formulas array
- ✅ Extract ALL formulas: Include every formula found with exact notation, variables, page reference, and example calculation if shown
- ❌ Generic concept: "[Topic] is important in [field]"
- ✅ Specific concept: Include detailed information with specific formulas, examples, calculations, or procedures from the document with page references

REMEMBER: Every piece of content must be directly derived from the actual document content provided above. Extract specific information, examples, and details from these documents rather than generating generic educational content. If information is not in the document, omit it—do not invent.`

    // Start diagram analysis early (in parallel with notes generation)
    const diagramAnalysisStart = Date.now()
    const diagramAnalysisPromise = extractedImages.length > 0
      ? (async () => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`\n🖼️ [NOTES API] Starting early diagram analysis (${extractedImages.length} images)...`)
          }
          try {
            const diagramAnalyzer = new DiagramAnalyzerAgent()
            const diagramResult = await diagramAnalyzer.execute({
              documentContent: fileContents.join('\n'),
              fileNames: fileNames,
              topic: topic,
              difficulty: difficulty,
              instructions: instructions,
              studyContext: studyContext,
              extractedImages: extractedImages,
              relevantChunks: relevantChunks,
              metadata: {
                contentExtraction: {
                  // We don't have key_terms yet, but diagram analyzer can work without them
                }
              }
            })
            
            if (diagramResult.success && diagramResult.data?.diagrams) {
              const analysisTime = Date.now() - diagramAnalysisStart
              if (process.env.NODE_ENV === 'development') {
                console.log(`  ✅ [NOTES API] Early diagram analysis completed in ${analysisTime}ms: ${diagramResult.data.diagrams.length} diagrams`)
              }
              return diagramResult.data.diagrams
            }
            return []
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`  ⚠️ [NOTES API] Early diagram analysis error:`, error)
            }
            return []
          }
        })()
      : Promise.resolve([])
    
    // Use Moonshot for study notes generation
    const aiProvider = 'moonshot' as const
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🤖 [NOTES API] Preparing AI API call...`)
      console.log(`  - Provider: Moonshot (Kimi K2)`)
      console.log(`  - Model: ${process.env.MOONSHOT_MODEL || 'kimi-k2-thinking'}`)
      console.log(`  - Temperature: 0.2 (very low for maximum document fidelity)`)
      console.log(`  - System prompt length: ${systemPrompt.length} characters`)
      console.log(`  - User prompt length: ${userPrompt.length} characters`)
      console.log(`  - Total document content: ${fileContents.join('').length} characters`)
      console.log(`  - Using JSON schema: StudyNotes`)
      console.log(`  ⚠️ CRITICAL: Must extract ALL formulas, make outline content-specific, and include ALL concepts`)
      console.log(`  🚀 Diagram analysis running in parallel with notes generation`)
    }
    
    const notesGenerationStart = Date.now()
    let content: string
    let responseId: string
    let modelUsed: string
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    let provider: 'moonshot' = 'moonshot'

    // Use Moonshot for study notes generation
    const aiClient = createAIClient('moonshot')
      
    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const response = await aiClient.chatCompletions(messages, {
      model: process.env.MOONSHOT_MODEL || 'kimi-k2-thinking',
      temperature: 0.2,
      responseFormat: 'json_object',
    })

    content = response.content
    responseId = response.id
    modelUsed = response.model
    usage = response.usage
    // Provider is always 'moonshot' since we're using Moonshot client

    console.log(`✅ [NOTES API] Moonshot (Kimi K2) API call successful`)
    console.log(`  - Response ID: ${responseId}`)
    console.log(`  - Model used: ${modelUsed}`)
    console.log(`  - Usage: ${JSON.stringify(usage)}`)

    if (!content) {
      console.log(`❌ [NOTES API] No content in Moonshot response`)
      throw new Error(`No response from Moonshot`)
    }

    console.log(`📝 [NOTES API] Processing Moonshot response...`)
    console.log(`  - Content length: ${content.length} characters`)
    console.log(`  - Content preview: ${content.substring(0, 200)}...`)

    let notesData
    try {
      console.log(`🔍 [NOTES API] Parsing JSON response...`)
      notesData = JSON.parse(content)
      console.log(`✅ [NOTES API] Successfully parsed JSON response`)
      console.log(`  - Title: ${notesData.title || 'No title'}`)
      console.log(`  - Outline items: ${notesData.outline?.length || 0}`)
      console.log(`  - Key terms: ${notesData.key_terms?.length || 0}`)
      console.log(`  - Concepts: ${notesData.concepts?.length || 0}`)
      console.log(`  - Diagrams: ${notesData.diagrams?.length || 0}`)
      console.log(`  - Formulas: ${notesData.formulas?.length || 0}`)
      console.log(`  - Quiz questions: ${notesData.practice_questions?.length || 0}`)
      
      // Post-processing: de-duplicate practice questions by question text (case-insensitive)
      if (Array.isArray(notesData.practice_questions)) {
        const seenQuestions = new Map<string, any>()
        for (const q of notesData.practice_questions as any[]) {
          const key = (q?.question || "").toString().trim().toLowerCase()
          if (!key) continue
          if (!seenQuestions.has(key)) {
            seenQuestions.set(key, q)
          }
        }
        const originalCount = notesData.practice_questions.length
        const deduped = Array.from(seenQuestions.values())
        if (deduped.length !== originalCount) {
          console.warn(
            `  ⚠️ [NOTES API] De-duplicated practice_questions: ${originalCount} → ${deduped.length}`
          )
        }
        notesData.practice_questions = deduped
      }
      
      // Post-processing validation: Check for missing content and generic content
      if (process.env.NODE_ENV === 'development') {
        const formulaCount = notesData.formulas?.length || 0
        const conceptCount = notesData.concepts?.length || 0
        const diagramCount = notesData.diagrams?.length || 0
        const outlineCount = notesData.outline?.length || 0
        
        console.log(`\n📊 [NOTES API] Content extraction summary:`)
        console.log(`  - Formulas extracted: ${formulaCount}`)
        console.log(`  - Concepts extracted: ${conceptCount}`)
        console.log(`  - Diagrams extracted: ${diagramCount}`)
        console.log(`  - Outline items: ${outlineCount}`)
        
        // Check for generic outline items (CRITICAL VALIDATION)
        const genericPatterns = [
          /definition and importance of/i,
          /understanding.*concepts/i,
          /introduction to/i,
          /tensile testing and its role/i,
          /elastic modulus and yield strength concepts/i,
          /poisson's ratio and its significance/i,
          /^[^()]*concepts?$/i,  // Items ending with just "concepts" or "concept"
          /^[^()]*significance$/i,  // Items ending with just "significance"
          /^[^()]*importance$/i,  // Items ending with just "importance"
        ]
        
        const genericOutlineItems = notesData.outline?.filter((item: string) => 
          genericPatterns.some(pattern => pattern.test(item))
        ) || []
        
        if (genericOutlineItems.length > 0) {
          console.error(`  ❌ [NOTES API] CRITICAL: ${genericOutlineItems.length} generic outline items detected!`)
          console.error(`     Generic items found:`)
          genericOutlineItems.forEach((item: string, idx: number) => {
            console.error(`       ${idx + 1}. "${item}"`)
          })
          console.error(`     Outline items MUST contain specific formulas, examples, calculations, or procedures from the document`)
          console.error(`     Each item should be identifiable to THIS specific document only`)
        }
        
        // Check if outline items have specific content (formulas, examples, page refs)
        const outlineHasSpecifics = notesData.outline?.some((item: string) => {
          const hasFormula = /[=+\-×÷√lnlog∫Σ∏]|%|[\u03B1-\u03C9\u0391-\u03A9]|[\u2080-\u2089\u00B2\u00B3]|[\u2070-\u2079]|O\(|T\(|f\(|g\(|h\(|S\s*=|e\s*=|σ\s*=|ε\s*=|x\s*=|y\s*=|z\s*=/.test(item)
          const hasExample = /\d+\.?\d*\s*(mm|cm|m|kg|g|psi|pa|%|°|rad|deg|s|min|h|Hz|J|W|V|A|Ω|F|H|C|K|mol)/i.test(item) || /example|worked|case study|trace|calculation/i.test(item)
          const hasPageRef = /\(p\.|\(pp\.|\(page|\(pg\./i.test(item)
          const hasSpecificProcedure = /test|procedure|method|algorithm|technique|process|step/i.test(item)
          return hasFormula || hasExample || hasPageRef || hasSpecificProcedure
        })
        
        if (!outlineHasSpecifics && (notesData.outline?.length || 0) > 0) {
          console.warn(`  ⚠️ [NOTES API] WARNING: Outline items lack specific content (formulas, examples, page refs)`)
        }
        
        // Check if formulas might be missing (generic pattern matching)
        const documentHasMath = /[=+\-×÷√lnlog∫Σ∏]|%|[\u03B1-\u03C9\u0391-\u03A9]|[\u2080-\u2089\u00B2\u00B3]|[\u2070-\u2079]|O\(|T\(|f\(|g\(|h\(|S\s*=|e\s*=|σ\s*=|ε\s*=|x\s*=|y\s*=|z\s*=/.test(fileContents.join(''))
        if (documentHasMath && formulaCount === 0) {
          console.error(`  ❌ [NOTES API] CRITICAL: Document appears to contain formulas but none were extracted!`)
          console.error(`     Document contains mathematical notation but formulas array is empty`)
        } else if (documentHasMath && formulaCount < 3) {
          console.warn(`  ⚠️ [NOTES API] WARNING: Document contains mathematical notation but only ${formulaCount} formula(s) were extracted`)
          console.warn(`     Consider reviewing if more formulas should be extracted`)
        }
      }
    } catch (parseError) {
      console.error(`❌ [NOTES API] Failed to parse JSON response:`, parseError)
      console.log(`📄 [NOTES API] Raw content:`, content)
      throw new Error("Failed to parse AI response as JSON")
    }

    // 4) Wait for diagram analysis to complete (ran in parallel with notes generation)
    const notesGenerationTime = Date.now() - notesGenerationStart
    if (process.env.NODE_ENV === 'development') {
      console.log(`  ⏱️ [NOTES API] Notes generation completed in ${notesGenerationTime}ms`)
    }
    
    let analyzedDiagrams = notesData.diagrams || []
    
    // Wait for diagram analysis (may have already completed)
    const diagramAnalysisResult = await diagramAnalysisPromise
    if (diagramAnalysisResult.length > 0) {
      analyzedDiagrams = diagramAnalysisResult
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ✅ [NOTES API] Diagram analysis completed: ${analyzedDiagrams.length} diagrams (ran in parallel)`)
      }
    } else if (extractedImages.length > 0 && analyzedDiagrams.length === 0) {
      // Fallback: If early analysis didn't work, try again with key_terms
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🖼️ [NOTES API] Retrying diagram analysis with key_terms...`)
      }
      try {
        const diagramAnalyzer = new DiagramAnalyzerAgent()
        const diagramResult = await diagramAnalyzer.execute({
          documentContent: fileContents.join('\n'),
          fileNames: fileNames,
          topic: topic,
          difficulty: difficulty,
          instructions: instructions,
          studyContext: studyContext,
          extractedImages: extractedImages,
          relevantChunks: relevantChunks,
          metadata: {
            contentExtraction: {
              key_terms: notesData.key_terms || [],
            }
          }
        })
        
        if (diagramResult.success && diagramResult.data?.diagrams) {
          analyzedDiagrams = diagramResult.data.diagrams
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [NOTES API] Analyzed ${analyzedDiagrams.length} diagrams (fallback)`)
          }
          
          // Ensure image_data_b64 is preserved from extracted images
          // Match analyzed diagrams with extracted images by page number
          analyzedDiagrams = analyzedDiagrams.map((diagram: any, idx: number) => {
            if (diagram.source === 'file' && diagram.page) {
              // Try page number matching first (most reliable)
              let matchingImage = extractedImages.find((img) => img.page === diagram.page)
              
              // Fallback to index-based matching if page number doesn't match
              if (!matchingImage && extractedImages[idx]) {
                matchingImage = extractedImages[idx]
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[NOTES API] Page number mismatch for diagram ${idx + 1} (expected page ${diagram.page}, using index ${idx})`)
                }
              }
              
              if (matchingImage && matchingImage.image_data_b64) {
                return {
                  ...diagram,
                  page: matchingImage.page, // Use actual page number from extracted image
                  image_data_b64: matchingImage.image_data_b64,
                  width: matchingImage.width,
                  height: matchingImage.height,
                }
              } else if (process.env.NODE_ENV === 'development') {
                console.warn(`[NOTES API] No matching image found for diagram ${idx + 1} (page ${diagram.page})`)
              }
            }
            return diagram
          })
        } else {
          console.log(`⚠️ [NOTES API] Diagram analysis failed, will rely on text-based diagrams from AI`)
          analyzedDiagrams = []
        }
      } catch (diagramError) {
        console.error(`❌ [NOTES API] Error analyzing diagrams:`, diagramError)
        analyzedDiagrams = []
      }
    } else {
      // No images extracted (disabled for free tier), but we still have diagrams from AI text analysis
      // These diagrams won't have image_data_b64, but we can enrich with web images
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️ [NOTES API] PDF image extraction disabled (free tier)`)
        console.log(`  ℹ️ [NOTES API] Using text-based diagrams from AI analysis only`)
        console.log(`  💡 [NOTES API] Diagrams will be enriched with web images if keywords are available`)
      }
      
      // Ensure diagrams from AI have proper structure even without images
      if (analyzedDiagrams && analyzedDiagrams.length > 0) {
        analyzedDiagrams = analyzedDiagrams.map((diagram: any) => ({
          ...diagram,
          source: diagram.source || 'text',
          image_data_b64: diagram.image_data_b64 || null, // Explicitly set to null if missing
        }))
      } else {
        analyzedDiagrams = []
      }
    }

    // 5) Parallel enrichment: diagrams, videos, and embeddings
    // Run all enrichment operations in parallel for maximum speed
    const enrichmentStart = Date.now()
    console.log(`\n🚀 [NOTES API] Starting parallel enrichment operations...`)
    
    // Prepare data for parallel operations
    const topicForVideos = notesData.title || studyTopic || fileNames.join(", ")
    let baseNotes = { ...notesData, diagrams: analyzedDiagrams }
    
    // Log diagram status before enrichment
    if (process.env.NODE_ENV === 'development') {
      console.log(`  📊 [NOTES API] Diagram status before enrichment:`)
      analyzedDiagrams.forEach((diagram: any, idx: number) => {
        console.log(`    - Diagram ${idx + 1}: "${diagram.title}"`)
        console.log(`      Source: ${diagram.source}, Page: ${diagram.page || 'N/A'}`)
        console.log(`      Has image_data_b64: ${!!diagram.image_data_b64}`)
        console.log(`      Has image_url: ${!!diagram.image_url}`)
      })
    }
    
    // Run all enrichment operations in parallel
    const [enrichedDiagrams, videoEnrichmentResult, embeddingResult] = await Promise.allSettled([
      // 5a) Enrich diagrams with web images (parallel processing)
      enrichDiagramsWithWebImages(analyzedDiagrams).catch((error) => {
        console.error(`  ❌ [NOTES API] Diagram enrichment error:`, error)
        return analyzedDiagrams // Return original diagrams on error
      }),
      
      // 5b) Enrich with YouTube videos (includes search and validation)
      enrichWithYouTubeVideos(
        baseNotes,
        topicForVideos,
        fileNames
      ).catch((error) => {
        console.error(`  ❌ [NOTES API] Video enrichment error:`, error)
        return { videos: baseNotes.resources?.videos || [] } // Return existing videos on error
      }),
      
      // 5c) Generate embeddings (non-blocking, can fail without affecting notes)
      generateEmbeddingsForNotes(
        fileContents,
        fileNames,
        userId || 'temp-user' // Fallback for safety
      ).catch((error) => {
        console.error(`  ❌ [NOTES API] Embedding generation error:`, error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      })
    ])
    
    const enrichmentTime = Date.now() - enrichmentStart
    if (process.env.NODE_ENV === 'development') {
      console.log(`  ⏱️ [NOTES API] Parallel enrichment completed in ${enrichmentTime}ms`)
    }
    
    // Process enrichment results
    let enrichedNotes = baseNotes
    
    // Process diagram enrichment result
    if (enrichedDiagrams.status === 'fulfilled') {
      enrichedNotes = { ...enrichedNotes, diagrams: enrichedDiagrams.value }
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [NOTES API] Diagram enrichment completed`)
        console.log(`  📊 [NOTES API] Final diagram count: ${enrichedNotes.diagrams.length}`)
      }
    } else {
      console.error(`  ❌ [NOTES API] Diagram enrichment failed:`, enrichedDiagrams.reason)
      // Keep original diagrams
    }
    
    // Process video enrichment result
    if (videoEnrichmentResult.status === 'fulfilled') {
      enrichedNotes = {
        ...enrichedNotes,
        resources: {
          ...enrichedNotes.resources,
          videos: videoEnrichmentResult.value.videos,
        },
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [NOTES API] Video enrichment completed`)
        console.log(`  📹 [NOTES API] Total videos: ${videoEnrichmentResult.value.videos.length}`)
      }
    } else {
      console.error(`  ❌ [NOTES API] Video enrichment failed:`, videoEnrichmentResult.reason)
      // Keep existing videos if any
    }
    
    // Process embedding result (non-blocking, just log)
    if (embeddingResult.status === 'fulfilled') {
      if (embeddingResult.value.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [NOTES API] Embeddings generated successfully`)
          if (embeddingResult.value.success && 'result' in embeddingResult.value && embeddingResult.value.result) {
            console.log(`  - Chunks processed: ${embeddingResult.value.result.chunksProcessed}`)
            console.log(`  - Subject tags: ${embeddingResult.value.result.metadata?.subjectTags?.join(', ') || 'None'}`)
            console.log(`  - Course topics: ${embeddingResult.value.result.metadata?.courseTopics?.join(', ') || 'None'}`)
            console.log(`  - Difficulty: ${embeddingResult.value.result.metadata?.difficultyLevel || 'Unknown'}`)
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ [NOTES API] Embedding generation failed: ${embeddingResult.value.error || 'Unknown error'}`)
        }
      }
    } else {
      console.error(`  ❌ [NOTES API] Embedding generation failed:`, embeddingResult.reason)
    }

    console.log(`\n🎉 [NOTES API] Notes generation completed successfully!`)
    console.log(`📊 [NOTES API] Final summary:`)
    console.log(`  - Files processed: ${fileNames.length}`)
    console.log(`  - Images extracted: ${extractedImages.length}`)
    console.log(`  - Notes generated: ${enrichedNotes.title}`)
    console.log(`  - Outline points: ${enrichedNotes.outline?.length || 0}`)
    console.log(`  - Key terms: ${enrichedNotes.key_terms?.length || 0}`)
    console.log(`  - Concepts: ${enrichedNotes.concepts?.length || 0}`)
    console.log(`  - Diagrams: ${enrichedNotes.diagrams?.length || 0}`)
    console.log(`  - Quiz questions: ${enrichedNotes.quiz?.length || 0}`)

    // 🚀 OPTIMIZATION: Save notes to database asynchronously (non-blocking)
    // This doesn't delay the response - saves 100-500ms
    let noteId: string | null = null
    
    // Start the save operation but don't block the response
    const savePromise = (async () => {
      try {
        const supabase = createAdminClient()
        const { data: savedNote, error: saveError } = await supabase
          .from('user_study_notes')
          .insert({
            user_id: userId,
            title: enrichedNotes.title,
            subject: enrichedNotes.subject,
            notes_json: enrichedNotes,
            file_names: fileNames,
          })
          .select('id')
          .single()

        if (saveError) {
          console.error('⚠️ [NOTES API] Failed to save notes to database:', saveError)
          return null
        } else if (savedNote) {
          const id = savedNote.id
          console.log(`✅ [NOTES API] Notes saved to database with ID: ${id}`)
          return id
        }
        return null
      } catch (dbError: any) {
        console.error('⚠️ [NOTES API] Database save error:', dbError)
        return null
      }
    })()
    
    // Try to get result quickly (100ms timeout), but don't block
    try {
      const timeoutPromise = new Promise<string | null>((resolve) => 
        setTimeout(() => resolve(null), 100)
      )
      noteId = await Promise.race([savePromise, timeoutPromise])
    } catch (error) {
      // If race fails, continue without noteId - save will complete in background
      console.warn('⚠️ [NOTES API] Database save timeout, continuing in background')
    }
    
    // Continue saving in background even if we didn't get the ID
    savePromise.then((id) => {
      if (id && !noteId) {
        console.log(`✅ [NOTES API] Notes saved to database (background) with ID: ${id}`)
      }
    }).catch((dbError: any) => {
      console.error('⚠️ [NOTES API] Background database save error:', dbError)
    })

    return NextResponse.json({ 
      success: true, 
      noteId: noteId, // May be null if save is still in progress
      notes: enrichedNotes,
      extractedImages: extractedImages.length,
      processedFiles: fileNames.length,
      fileNames: fileNames,
      fileContents: fileContents.length
    })

  } catch (error) {
    console.error("\n❌ [NOTES API] Error generating study notes:", error)
    console.error(`❌ [NOTES API] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.error(`❌ [NOTES API] Error message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    if (error instanceof Error && error.stack) {
      console.error(`❌ [NOTES API] Stack trace:`, error.stack)
    }
    // SECURITY: Sanitize error message before sending to client
    const sanitized = sanitizeError(error, 'Failed to generate notes')
    return NextResponse.json(
      { 
        success: false, 
        ...createSafeErrorResponse(error, 'Failed to generate notes')
      },
      { status: sanitized.statusCode }
    )
  }
}

// Helper function to extract images from PDF
async function extractImagesFromPDF(buffer: Buffer, filename: string): Promise<{ image_data_b64: string; page: number; width?: number; height?: number }[]> {
  try {
    // Use the smart extractor to get individual diagrams
    const diagrams = await smartExtractDiagrams(buffer, filename, {
      minDiagramSize: 10000, // 100x100 pixels minimum
      maxDiagramsPerPage: 5, // Limit to prevent too many diagrams
    })
    
    // Convert to expected format
    return diagrams.map(diagram => ({
      image_data_b64: diagram.image_data_b64,
      page: diagram.page,
      width: diagram.width,
      height: diagram.height,
      x: diagram.x,
      y: diagram.y
    }))
  } catch (error) {
    // Fallback to original extractor if smart extractor fails
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [NOTES API] Smart extraction failed, falling back to full page extraction:`, error)
    }
    
    // Use the original extractor as fallback
    const { extractImagesFromPDF: extractFullPages } = await import('@/lib/pdf-image-extractor')
    return extractFullPages(buffer, filename)
  }
}

// Note: enrichWithWebImages has been replaced with parallel enrichment
// See src/lib/utils/parallel-enrichment.ts for enrichDiagramsWithWebImages

