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
            const pdfParse = await import("pdf-parse")
            console.log(`  📖 [NOTES API] Parsing PDF content...`)
            
            // Try multiple import methods for pdf-parse
            let pdfFunction
            if (typeof pdfParse.default === 'function') {
              pdfFunction = pdfParse.default
            } else if (typeof pdfParse === 'function') {
              pdfFunction = pdfParse
            } else {
              throw new Error('pdf-parse function not found')
            }
            
            const pdfData = await pdfFunction(buffer)
            textContent = pdfData.text
            console.log(`  ✅ [NOTES API] Successfully extracted ${textContent.length} characters from PDF`)
            console.log(`  📊 [NOTES API] PDF info: ${pdfData.numpages} pages, ${pdfData.info?.Title || 'No title'}`)
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

    // 3) Generate study notes using OpenAI Responses API
    const systemPrompt = `You are an expert study note generator. You MUST analyze the provided document content and create study materials based ONLY on what's actually in the documents.

CRITICAL REQUIREMENTS:
1. Base ALL content on the actual document text provided
2. Extract key concepts, terms, and information directly from the documents
3. Create quiz questions that test understanding of the ACTUAL content
4. For diagrams, only suggest images that are relevant to the document content
5. If the document mentions specific topics, focus on those topics

Return a JSON object with this structure:

{
  "title": "Main topic from the document",
  "outline": ["5-10 main points extracted from the document"],
  "key_terms": ["6-10 important terms found in the document"],
  "concepts": [
    {
      "heading": "Concept from the document",
      "bullets": ["explanation based on document content"]
    }
  ],
  "diagrams": [
    {
      "source": "web",
      "title": "Relevant diagram title", 
      "caption": "Description of what this diagram should show based on document content",
      "keywords": ["specific", "search", "terms", "from", "document"]
    }
  ],
  "quiz": [
    {
      "question": "Question about specific content from the document",
      "options": [
        "Correct answer based on document content",
        "Realistic but incorrect option 1",
        "Realistic but incorrect option 2", 
        "Realistic but incorrect option 3"
      ],
      "correct": 0,
      "explanation": "Detailed explanation of why the correct answer is right, based on document content"
    }
  ]
}

IMPORTANT: Only create content that is directly related to what's in the provided documents. Do not add random or generic content.`

    const userPrompt = `Generate comprehensive study notes for the topic: "${topic}" (difficulty: ${difficulty})

IMPORTANT: You MUST base ALL your content on the actual document text provided below. Do not add generic or random content.

DOCUMENT CONTENTS:
${fileContents.join('\n\n')}

${extractedImages.length > 0 ? `\nEXTRACTED IMAGES: ${extractedImages.length} images were extracted from the documents.\n` : ''}

REQUIREMENTS:
1. Extract a clear outline (5-10 main points) directly from the document content
2. Identify key terms and definitions (6-10) that are actually mentioned in the documents
3. Create detailed concept explanations (3-6 sections) based on the document content
4. Suggest relevant diagrams (3-8 figures) that would help explain concepts from the documents
5. Generate practice questions (5-8 flashcard pairs) that test understanding of the ACTUAL document content

For diagrams:
- Only suggest diagrams that are relevant to the document content
- Use specific search keywords that relate to the actual topics in the documents
- Focus on concepts that are mentioned in the documents

For quiz questions:
- Create multiple choice questions that test knowledge of the specific content in the documents
- Base the correct answer on the information provided in the documents
- Create 3 realistic but incorrect options that are plausible but wrong
- Make incorrect options related to the topic but contain common misconceptions or slightly different concepts
- Include questions about key concepts, terms, and processes mentioned in the documents
- Provide detailed explanations for why the correct answer is right

CRITICAL: Every piece of content you generate must be directly related to what's in the provided documents.`

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
    const enrichedNotes = await enrichWithWebImages(notesData)
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
  // This is a placeholder - in production, you'd use PyMuPDF or similar
  // For now, we'll return an empty array and rely on web image enrichment
  console.log(`Would extract images from PDF: ${filename}`)
  return []
}

// Helper function to enrich notes with web images
async function enrichWithWebImages(notes: { diagrams: { source: string; keywords?: string[]; image_url?: string; credit?: string }[] }) {
  console.log(`  🔍 [IMAGE ENRICHMENT] Processing ${notes.diagrams.length} diagrams...`)
  const enrichedDiagrams = []
  
  for (let i = 0; i < notes.diagrams.length; i++) {
    const diagram = notes.diagrams[i]
    console.log(`    📊 [IMAGE ENRICHMENT] Processing diagram ${i + 1}/${notes.diagrams.length}: ${diagram.title}`)
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
