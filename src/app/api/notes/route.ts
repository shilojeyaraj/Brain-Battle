import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { notesSchema } from "@/lib/schemas/notes-schema"
import { createClient } from "@/lib/supabase/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  console.log("🚀 [NOTES API] Starting notes generation request...")
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
    const extractedImages: { image_data_b64: string; page: number }[] = []
    const fileNames: string[] = []
    
    console.log(`📁 [NOTES API] Processing ${files.length} files for study notes generation...`)
    
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
            console.log(`  🔍 [NOTES API] Importing pdf-parse library...`)
            const pdfParseModule = await import("pdf-parse")
            console.log(`  📖 [NOTES API] Parsing PDF content...`)
            
            // Use pdf-parse function directly
            const pdfData = await (pdfParseModule as any).default(buffer)
            textContent = pdfData.text
            console.log(`  ✅ [NOTES API] Successfully extracted ${textContent.length} characters from PDF`)
            console.log(`  📊 [NOTES API] PDF info: ${pdfData.numpages} pages, ${pdfData.info?.Title || 'No title'}`)
            
            // Log first 500 characters to verify content extraction
            console.log(`  📄 [NOTES API] Content preview: ${textContent.substring(0, 500)}...`)
          } catch (pdfError) {
            console.error(`  ❌ [NOTES API] Error parsing PDF ${file.name}:`, pdfError)
            // Fallback: provide context based on filename and topic
            const filename = file.name.toLowerCase()
            let contextHint = ""
            if (filename.includes("chapter") || filename.includes("ch.")) {
              contextHint = "This appears to be a chapter from a textbook or course material."
            } else if (filename.includes("slides") || filename.includes("presentation")) {
              contextHint = "This appears to be lecture slides or presentation material."
            } else if (filename.includes("notes") || filename.includes("study")) {
              contextHint = "This appears to be study notes or educational material."
            }
            textContent = `[PDF File: ${file.name} - ${file.size} bytes - ${contextHint} Content extraction failed, but this document likely contains educational material about the requested topic: "${topic}". Please generate study materials based on the topic and difficulty level requested, focusing on the subject matter that would typically be covered in such educational materials.]`
          }
        } else if (file.type?.startsWith('text/')) {
          console.log(`  📝 [NOTES API] Processing as text file (${file.type})`)
          textContent = buffer.toString('utf-8')
          console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from text file`)
        } else {
          console.log(`  ⚠️ [NOTES API] Unsupported file type: ${file.type}`)
          textContent = `[File: ${file.name} - Type: ${file.type} - Size: ${file.size} bytes]`
        }
        
        if (textContent.trim()) {
          fileContents.push(`=== ${file.name} ===\n${textContent}\n`)
          console.log(`  ✅ [NOTES API] Added content to file contents (${textContent.length} chars)`)
        } else {
          console.log(`  ⚠️ [NOTES API] No text content extracted from ${file.name}`)
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
        fileContents.push(`[Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`)
      }
    }
    
    console.log(`\n📊 [NOTES API] File processing summary:`)
    console.log(`  - Files processed: ${fileNames.length}`)
    console.log(`  - File contents extracted: ${fileContents.length}`)
    console.log(`  - Images extracted: ${extractedImages.length}`)
    console.log(`  - Total content length: ${fileContents.join('').length} characters`)

    // 3) Use semantic search to understand the content better
    console.log("🔍 [NOTES API] Performing semantic search to understand content...")
    let relevantChunks: any[] = []
    try {
      const searchQuery = instructions || topic || fileContents.join(' ').substring(0, 500)
      const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/semantic-search?q=${encodeURIComponent(searchQuery)}&limit=10&threshold=0.6`)
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        relevantChunks = searchData.chunks || []
        console.log(`  ✅ [NOTES API] Found ${relevantChunks.length} relevant chunks from semantic search`)
      } else {
        console.log("  ⚠️ [NOTES API] Semantic search failed, proceeding with document content only")
      }
    } catch (error) {
      console.error("  ❌ [NOTES API] Error performing semantic search:", error)
    }

    // 4) Analyze content complexity and education level
    console.log("🔍 [NOTES API] Analyzing content complexity and education level...")
    
    // 5) Generate study notes using OpenAI with enhanced schema
    const systemPrompt = `You are an expert study note generator and educational content creator. Your task is to create comprehensive, high-quality study materials based on the ACTUAL CONTENT provided in the documents.

    CRITICAL REQUIREMENTS:
    1. CONTENT-SPECIFIC ANALYSIS:
       - You MUST base ALL content on the actual document text provided
       - Extract specific concepts, examples, and details from the documents
       - Use the exact terminology and definitions found in the documents
       - Reference specific sections, chapters, or topics mentioned in the documents
       - Do NOT generate generic content - everything must be specific to the provided materials
       - When no specific study instructions are provided, analyze the documents to determine the main subject, topics, and learning objectives

    2. DOCUMENT-SPECIFIC QUESTION GENERATION:
       - Create questions that test understanding of the ACTUAL content in the documents
       - Include questions that reference specific examples, data, or concepts from the documents
       - When documents contain diagrams, charts, or images, reference them in questions
       - Extract specific facts, figures, or details from the documents for factual questions
       - Create application questions based on the specific examples given in the documents

    3. CONTENT COMPLEXITY ANALYSIS:
       - Examine the actual vocabulary and technical terms used in the documents
       - Identify the specific prerequisite knowledge mentioned or implied
       - Determine education level based on the actual content complexity
       - Match question difficulty to the actual content level in the documents

    4. RESOURCE GENERATION:
       - Find resources that directly relate to the specific topics covered in the documents
       - Include resources that explain the same concepts using similar terminology
       - Prioritize resources that cover the same examples or case studies mentioned
       - Ensure resources match the specific subject matter and level of the documents

    5. SCHEMA COMPLIANCE:
       - Use the exact JSON schema provided - no deviations
       - All content must be directly derived from the provided document content
       - Include specific page references or section mentions when available
       - Extract actual key terms and definitions from the documents

    You must return a valid JSON object matching this exact schema:
    ${JSON.stringify(notesSchema, null, 2)}

    REMEMBER: Every piece of content you generate must be directly based on the actual document content provided. Do not generate generic educational content.`

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

    CRITICAL: You MUST extract and use the ACTUAL content from these documents. Do not generate generic content.

    DOCUMENT CONTENT (EXTRACT THE SPECIFIC INFORMATION FROM THESE):
    ${fileContents.map((content, index) => `--- DOCUMENT ${index + 1} (${fileNames[index] || `File ${index + 1}`}) ---\n${content}\n`).join('\n')}

    ${relevantChunks.length > 0 ? `\nSEMANTIC SEARCH RESULTS (for additional context):
    ${relevantChunks.map((chunk, index) => `Chunk ${index + 1}: ${chunk.content}`).join('\n\n')}\n` : ''}

    ${extractedImages.length > 0 ? `\nEXTRACTED IMAGES: ${extractedImages.length} images were extracted from the documents.\n` : ''}${contextInstructions}

    CONTENT EXTRACTION REQUIREMENTS:
    1. EXTRACT SPECIFIC INFORMATION:
       - Pull out the exact key terms, definitions, and concepts from the documents
       - Extract specific examples, case studies, and data mentioned in the documents
       - Identify the actual structure and organization of the content
       - Note any specific formulas, equations, or technical details provided
       - Extract any specific learning objectives or goals mentioned
       - If no study instructions are provided, analyze the documents to determine the main subject area, key topics, and educational level

    2. DOCUMENT-SPECIFIC QUESTION CREATION:
       - Create questions that test understanding of the ACTUAL content in these documents
       - Include questions about specific examples, data, or concepts mentioned
       - Reference specific sections, chapters, or topics from the documents
       - Extract specific facts, figures, or details for factual questions
       - Create application questions based on the specific examples given

    3. CONTENT-SPECIFIC RESOURCES:
       - Find resources that directly relate to the specific topics covered in these documents
       - Include resources that explain the same concepts using similar terminology
       - Prioritize resources that cover the same examples or case studies mentioned
       - Ensure resources match the specific subject matter and level of these documents

    4. ACCURATE COMPLEXITY ANALYSIS:
       - Base education level on the actual vocabulary and concepts used in these documents
       - Identify prerequisite knowledge based on what's actually mentioned or implied
       - Match difficulty level to the actual content complexity in these documents

    5. DOCUMENT-SPECIFIC STUDY MATERIALS:
       - Create an outline based on the actual structure of the documents
       - Extract key terms and definitions as they appear in the documents
       - Use the specific examples and explanations provided in the documents
       - Create study tips based on the actual content and learning objectives
       - Identify misconceptions based on the specific subject matter covered

    6. AUTOMATIC DOCUMENT ANALYSIS (when no instructions provided):
       - Analyze the document titles, headers, and content to determine the main subject
       - Identify the educational level based on vocabulary and concept complexity
       - Extract the key learning objectives from the document structure
       - Determine the appropriate difficulty level based on content complexity
       - Create a meaningful title that reflects the actual document content

    REMEMBER: Every piece of content must be directly derived from the actual document content provided above. Extract specific information, examples, and details from these documents rather than generating generic educational content.`

    console.log(`\n🤖 [NOTES API] Preparing OpenAI API call...`)
    console.log(`  - Model: gpt-4o`)
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
      }
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

    // 4) Enrich with web images if needed
    console.log(`\n🖼️ [NOTES API] Enriching with web images...`)
    const enrichedDiagrams = await enrichWithWebImages(notesData)
    const enrichedNotes = { ...notesData, diagrams: enrichedDiagrams }
    console.log(`✅ [NOTES API] Image enrichment completed`)

    // 5) Generate and store embeddings for semantic search
    console.log(`\n🧠 [NOTES API] Generating embeddings for semantic search...`)
    try {
      const combinedText = fileContents.join('\n\n')
      const embeddingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/embeddings`, {
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

// Helper function to extract images from PDF (simplified version)
async function extractImagesFromPDF(buffer: Buffer, filename: string): Promise<{ image_data_b64: string; page: number }[]> {
  try {
    console.log(`🖼️ [IMAGE EXTRACTION] Attempting to extract images from PDF: ${filename}`)
    
    // For now, we'll return an empty array and rely on web image enrichment
    // In the future, we could use pdf2pic or similar libraries to extract images
    console.log(`  ⚠️ [IMAGE EXTRACTION] Image extraction not yet implemented, using web enrichment instead`)
    return []
  } catch (error) {
    console.error(`  ❌ [IMAGE EXTRACTION] Error extracting images from ${filename}:`, error)
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
