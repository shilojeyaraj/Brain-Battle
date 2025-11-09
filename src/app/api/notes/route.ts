import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { notesSchema } from "@/lib/schemas/notes-schema"
import { createClient } from "@/lib/supabase/server"
import { extractImagesFromPDF as extractPDFImages } from "@/lib/pdf-image-extractor"
import { DiagramAnalyzerAgent } from "@/lib/agents/diagram-analyzer-agent"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    console.log("🚀 [NOTES API] Starting notes generation request...")
  }
  try {
    const form = await req.formData()
    const files = form.getAll("files") as File[]
    const topic = form.get("topic") as string
    const difficulty = form.get("difficulty") as string
    const instructions = form.get("instructions") as string
    const studyContextStr = form.get("studyContext") as string
    let studyContext = null
    if (studyContextStr) {
      try {
        studyContext = JSON.parse(studyContextStr)
      } catch (e) {
        console.log("⚠️ [NOTES API] Failed to parse study context:", e)
      }
    }
    
    console.log("📋 [NOTES API] Request details:")
    console.log(`  - Topic: ${topic}`)
    console.log(`  - Difficulty: ${difficulty}`)
    console.log(`  - Files: ${files.length}`)
    files.forEach((file, index) => {
      console.log(`    ${index + 1}. ${file.name} (${file.type}, ${file.size} bytes)`)
    })
    
    if (!files.length) {
      console.log("❌ [NOTES API] No files provided")
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // 1) Process files and extract text content
    const fileContents: string[] = []
    const extractedImages: { image_data_b64: string; page: number; width?: number; height?: number }[] = []
    const fileNames: string[] = []
    
    console.log(`📁 [NOTES API] Processing ${files.length} files for study notes generation...`)
    
    // CRITICAL: Validate that we can extract content before proceeding
    let hasValidContent = false
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`\n📄 [NOTES API] Processing file ${i + 1}/${files.length}: ${file.name}`)
      console.log(`  - Type: ${file.type}`)
      console.log(`  - Size: ${file.size} bytes`)
      
      const buffer = Buffer.from(await file.arrayBuffer())
      fileNames.push(file.name)
      
      // Extract text content from files
      let textContent = ""
      try {
        if (file.type === "text/plain") {
          console.log(`  📝 [NOTES API] Processing as plain text file`)
          textContent = buffer.toString('utf-8')
          console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from text file`)
        } else if (file.type === "application/pdf") {
          console.log(`  📄 [NOTES API] Processing as PDF file`)
          // Extract text from PDF using pdf-parse
          try {
            console.log(`  🔍 [NOTES API] Using pdfjs-dist for PDF text extraction...`)
            // Use dynamic import for ESM module (required by Next.js)
            const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
            const pdfjsLib = pdfjsModule.default || pdfjsModule
            
            // For server-side Node.js, we don't need to configure workerSrc
            // pdfjs-dist will handle server-side execution automatically
            // DO NOT set workerSrc to false - it must be a string or undefined
            
            console.log(`  📖 [NOTES API] Parsing PDF content...`)
            
            // Load the PDF document with server-side optimized settings
            const loadingTask = pdfjsLib.getDocument({
              data: new Uint8Array(buffer),
              useSystemFonts: true,
              verbosity: 0,
              // Disable worker for server-side (runs in main thread)
              isEvalSupported: false,
            })
            
            const pdfDocument = await loadingTask.promise
            console.log(`  📄 [NOTES API] PDF loaded: ${pdfDocument.numPages} pages`)
            
            // Extract text from all pages
            const textParts: string[] = []
            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
              const page = await pdfDocument.getPage(pageNum)
              const textContent = await page.getTextContent()
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
              textParts.push(pageText)
            }
            
            textContent = textParts.join('\n\n')
            
            // CRITICAL: Validate that we actually extracted meaningful content
            if (!textContent || textContent.trim().length < 100) {
              throw new Error(`PDF parsing returned insufficient content (${textContent.length} characters). The PDF may be image-based, corrupted, or password-protected.`)
            }
            
            hasValidContent = true
            console.log(`  ✅ [NOTES API] Successfully extracted ${textContent.length} characters from PDF`)
            
            // Log first 500 characters to verify content extraction
            console.log(`  📄 [NOTES API] Content preview: ${textContent.substring(0, 500)}...`)
          } catch (pdfError) {
            console.error(`  ❌ [NOTES API] Error parsing PDF ${file.name}:`, pdfError)
            console.error(`  ❌ [NOTES API] Error details:`, pdfError)
            // CRITICAL: Don't use fallback - fail the request if PDF can't be parsed
            // This prevents generating wrong content
            throw new Error(`Failed to parse PDF "${file.name}". The document content could not be extracted. Please ensure the PDF is not corrupted or password-protected. Error: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`)
          }
        } else if (file.type?.startsWith('text/')) {
          console.log(`  📝 [NOTES API] Processing as text file (${file.type})`)
          textContent = buffer.toString('utf-8')
          if (!textContent || textContent.trim().length < 10) {
            throw new Error(`Text file "${file.name}" appears to be empty or contains insufficient content.`)
          }
          hasValidContent = true
          console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from text file`)
        } else {
          console.log(`  ⚠️ [NOTES API] Unsupported file type: ${file.type}`)
          textContent = `[File: ${file.name} - Type: ${file.type} - Size: ${file.size} bytes]`
        }
        
        // Only add if we have valid content
        if (textContent && textContent.trim().length > 0) {
          fileContents.push(textContent)
          fileNames.push(file.name)
          console.log(`  ✅ [NOTES API] Added content to file contents (${textContent.length} chars)`)
        } else {
          console.error(`  ❌ [NOTES API] Skipping file ${file.name} - no valid content extracted`)
        }
        
        // Extract images from PDF files
        if (file.type === "application/pdf") {
          console.log(`  🖼️ [NOTES API] Attempting to extract images from PDF...`)
          try {
            const images = await extractImagesFromPDF(buffer, file.name)
            extractedImages.push(...images)
            console.log(`  ✅ [NOTES API] Extracted ${images.length} images from ${file.name}`)
          } catch (error) {
            console.error(`  ❌ [NOTES API] Error extracting images from PDF:`, error)
          }
        }
      } catch (error) {
        console.error(`  ❌ [NOTES API] Error processing file ${file.name}:`, error)
        // Re-throw to prevent generating wrong content
        throw error
      }
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
    console.log(`  - Files processed: ${fileNames.length}`)
    console.log(`  - File contents extracted: ${fileContents.length}`)
    console.log(`  - Images extracted: ${extractedImages.length}`)
    console.log(`  - Total content length: ${fileContents.join('').length} characters`)

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

4. FORMULA EXTRACTION:
   - Identify and extract ALL important formulas, equations, and mathematical expressions from the documents
   - Include formulas for: time complexity (O(n²), O(n log n), etc.), algorithms, calculations, definitions
   - For each formula, provide: name, the actual formula as written, description, variable meanings, page reference, and example if shown
   - Extract formulas exactly as they appear (e.g., "T(n) = n(n-1)/2", "O(n²)", "A = πr²")
   - Include Big-O notation, algorithmic complexity formulas, mathematical equations, and any computational formulas
   - If formulas are used in examples or traces, extract those specific instances with page references

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

8. SCHEMA COMPLIANCE:
   - Output MUST be valid JSON that matches the provided notesSchema exactly (no extra keys, no missing required keys)
   - If information is not present in the document, omit it or mark as null—do not invent
   - All arrays must contain actual content from documents, not placeholder items

9. QUESTION & QUIZ GENERATION:
   - Create varied items that reference exact examples/figures from the documents
   - Recall questions: terms/definitions exactly as written (with page refs)
   - Procedure/Trace questions: use the exact examples from slides/documents (with page refs)
   - Application questions: use the same algorithmic steps or examples as shown in documents
   - For each question: include answer, explanation, and page references used

VALIDATION & SELF-CHECK (Before returning output):
Reject and regenerate if any of these fail:
- No page refs present in bullets/answers/examples where content is fact-heavy
- Any placeholder phrasing like "Key point 1/2/3", "Detailed explanation…", "Important aspect…"
- Facts/examples not found in the document text or figures
- JSON not valid against notesSchema
- Missing diagram references when the document shows figures for that topic
- Generic content instead of document-specific information
- Use of uncertain language: "likely", "possibly", "may", "might", "probably", "perhaps", "appears to", "seems to", "could be"

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

    const userPrompt = `Generate comprehensive study notes based on the ACTUAL CONTENT from these specific documents:

STUDY TOPIC: ${studyTopic}
DIFFICULTY: ${difficulty || 'medium'}
STUDY INSTRUCTIONS: ${instructions || 'Analyze the uploaded documents and create comprehensive study notes based on their actual content. Extract key concepts, terms, and topics from the documents themselves.'}

⚠️ CRITICAL REQUIREMENT: You MUST extract and use ONLY the ACTUAL content from these documents. 
- If the document is about chemistry, create chemistry notes
- If the document is about algorithms, create algorithm notes  
- If the document is about biology, create biology notes
- DO NOT generate generic content or content from other topics
- Every fact, example, and definition must come directly from the document text below
- If the document content is about "${fileNames[0] || 'the uploaded file'}", your notes MUST be about that topic

DOCUMENT CONTENT (EXTRACT THE SPECIFIC INFORMATION FROM THESE - THIS IS THE ACTUAL CONTENT):
${fileContents.map((content, index) => `--- DOCUMENT ${index + 1}: ${fileNames[index] || `File ${index + 1}`} (${content.length} characters) ---\n${content.substring(0, 50000)}\n${content.length > 50000 ? `\n[... ${content.length - 50000} more characters ...]` : ''}\n`).join('\n\n')}

VALIDATION: The document content above contains ${fileContents.join('').length} total characters. You MUST base all notes on this actual content, not on the topic name or generic knowledge.

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
   - Create an outline based on the actual structure of the documents
   - Extract key terms and definitions as they appear in the documents (with quotations and page refs)
   - Use the specific examples and explanations provided in the documents
   - Create study tips based on the actual content and learning objectives
   - Identify misconceptions based on the specific subject matter covered
   - EXTRACT ALL FORMULAS: Identify and extract every important formula, equation, and mathematical expression
     * Time complexity formulas (O(n²), O(n log n), etc.)
     * Algorithmic formulas (T(n) = n(n-1)/2, etc.)
     * Mathematical equations (A = πr², etc.)
     * Any computational formulas or expressions
     * For each formula: extract name, exact formula text, description, variables, page reference, and examples

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

REMEMBER: Every piece of content must be directly derived from the actual document content provided above. Extract specific information, examples, and details from these documents rather than generating generic educational content. If information is not in the document, omit it—do not invent.`

    console.log(`\n🤖 [NOTES API] Preparing OpenAI API call...`)
    console.log(`  - Model: gpt-4o`)
    console.log(`  - Temperature: 0.3 (low for document-grounded output)`)
    console.log(`  - System prompt length: ${systemPrompt.length} characters`)
    console.log(`  - User prompt length: ${userPrompt.length} characters`)
    console.log(`  - Using JSON schema: StudyNotes`)
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_object"
      },
      temperature: 0.3  // Low temperature to minimize invention and ensure document-grounded output
    })
    
    console.log(`✅ [NOTES API] OpenAI API call successful`)
    console.log(`  - Response ID: ${response.id}`)
    console.log(`  - Model used: ${response.model}`)
    console.log(`  - Usage: ${JSON.stringify(response.usage)}`)

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.log("❌ [NOTES API] No content in OpenAI response")
      throw new Error("No response from OpenAI")
    }

    console.log(`📝 [NOTES API] Processing OpenAI response...`)
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
      console.log(`  - Quiz questions: ${notesData.quiz?.length || 0}`)
    } catch (parseError) {
      console.error(`❌ [NOTES API] Failed to parse JSON response:`, parseError)
      console.log(`📄 [NOTES API] Raw content:`, content)
      throw new Error("Failed to parse OpenAI response as JSON")
    }

    // 4) Analyze extracted diagrams if any were found
    let analyzedDiagrams = notesData.diagrams || []
    if (extractedImages.length > 0) {
      console.log(`\n🖼️ [NOTES API] Analyzing ${extractedImages.length} extracted diagrams...`)
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
          console.log(`✅ [NOTES API] Analyzed ${analyzedDiagrams.length} diagrams`)
        } else {
          console.log(`⚠️ [NOTES API] Diagram analysis failed, using basic diagram info`)
          // Fallback: create basic diagram entries from extracted images
          analyzedDiagrams = extractedImages.map((img, idx) => ({
            source: "file",
            title: `Diagram ${idx + 1}`,
            caption: `Extracted from page ${img.page}`,
            page: img.page,
            image_data_b64: img.image_data_b64,
            width: img.width,
            height: img.height,
          }))
        }
      } catch (diagramError) {
        console.error(`❌ [NOTES API] Error analyzing diagrams:`, diagramError)
        // Fallback to basic diagram info
        analyzedDiagrams = extractedImages.map((img, idx) => ({
          source: "file",
          title: `Diagram ${idx + 1}`,
          caption: `Extracted from page ${img.page}`,
          page: img.page,
          image_data_b64: img.image_data_b64,
          width: img.width,
          height: img.height,
        }))
      }
    }

    // 5) Enrich with web images if needed (for diagrams without extracted images)
    console.log(`\n🖼️ [NOTES API] Enriching diagrams with web images if needed...`)
    const enrichedDiagrams = await enrichWithWebImages({ diagrams: analyzedDiagrams })
    const enrichedNotes = { ...notesData, diagrams: enrichedDiagrams.diagrams || enrichedDiagrams }
    console.log(`✅ [NOTES API] Diagram enrichment completed`)

    // 5) Generate and store embeddings for semantic search
    console.log(`\n🧠 [NOTES API] Generating embeddings for semantic search...`)
    try {
      const combinedText = fileContents.join('\n\n')
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      console.log(`  🌐 [NOTES API] Using base URL: ${baseUrl}`)
      console.log(`  🔧 [NOTES API] Environment check: VERCEL_URL=${process.env.VERCEL_URL}, NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL}`)
      const embeddingResponse = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: combinedText,
          fileName: fileNames.join(', '),
          fileType: 'study_notes',
          userId: 'temp-user' // In production, get from auth
        })
      })
      
      if (embeddingResponse.ok) {
        const embeddingResult = await embeddingResponse.json()
        console.log(`✅ [NOTES API] Embeddings generated successfully`)
        console.log(`  - Chunks processed: ${embeddingResult.chunksProcessed}`)
        console.log(`  - Subject tags: ${embeddingResult.metadata?.subjectTags?.join(', ') || 'None'}`)
        console.log(`  - Course topics: ${embeddingResult.metadata?.courseTopics?.join(', ') || 'None'}`)
        console.log(`  - Difficulty: ${embeddingResult.metadata?.difficultyLevel || 'Unknown'}`)
      } else {
        console.log(`⚠️ [NOTES API] Failed to generate embeddings: ${embeddingResponse.status}`)
      }
    } catch (embeddingError) {
      console.error(`❌ [NOTES API] Error generating embeddings:`, embeddingError)
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

    return NextResponse.json({ 
      success: true, 
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
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate notes" 
      },
      { status: 500 }
    )
  }
}

// Helper function to extract images from PDF
async function extractImagesFromPDF(buffer: Buffer, filename: string): Promise<{ image_data_b64: string; page: number; width?: number; height?: number }[]> {
  try {
    return await extractPDFImages(buffer, filename)
  } catch (error) {
    console.error(`❌ [NOTES API] Error in extractImagesFromPDF:`, error)
    return []
  }
}

// Helper function to enrich notes with web images
async function enrichWithWebImages(notes: { diagrams: { source: string; keywords?: string[]; image_url?: string; credit?: string }[] }) {
  console.log(`  🔍 [IMAGE ENRICHMENT] Processing ${notes.diagrams.length} diagrams...`)
  const enrichedDiagrams = []
  
  for (let i = 0; i < notes.diagrams.length; i++) {
    const diagram = notes.diagrams[i]
    console.log(`    📊 [IMAGE ENRICHMENT] Processing diagram ${i + 1}/${notes.diagrams.length}: ${(diagram as any).title || 'Untitled'}`)
    console.log(`      - Source: ${diagram.source}`)
    console.log(`      - Keywords: ${diagram.keywords?.join(', ') || 'None'}`)
    
    if (diagram.source === "web" && diagram.keywords) {
      try {
        console.log(`      🌐 [IMAGE ENRICHMENT] Fetching web image for: ${diagram.keywords.join(' ')}`)
        // Use Unsplash API for high-quality images
        // Make search more specific by adding educational/academic terms
        const searchQuery = `${diagram.keywords.join(" ")} educational diagram academic`
        console.log(`      🔍 [IMAGE ENRICHMENT] Enhanced search query: ${searchQuery}`)
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            const image = data.results[0]
            diagram.image_url = image.urls.regular
            diagram.credit = `Unsplash: ${image.user.name}`
            console.log(`      ✅ [IMAGE ENRICHMENT] Found image: ${image.urls.regular}`)
          } else {
            console.log(`      ⚠️ [IMAGE ENRICHMENT] No images found for: ${searchQuery}`)
          }
        } else {
          console.log(`      ❌ [IMAGE ENRICHMENT] API error: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        console.error(`      ❌ [IMAGE ENRICHMENT] Error fetching web image:`, error)
      }
    } else {
      console.log(`      ℹ️ [IMAGE ENRICHMENT] Skipping (not web source or no keywords)`)
    }
    
    enrichedDiagrams.push(diagram)
  }
  
  console.log(`  ✅ [IMAGE ENRICHMENT] Completed processing ${enrichedDiagrams.length} diagrams`)
  return {
    ...notes,
    diagrams: enrichedDiagrams
  }
}

