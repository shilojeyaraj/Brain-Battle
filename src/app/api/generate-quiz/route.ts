import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { checkQuizQuestionLimit } from '@/lib/subscription/limits'
import { generateQuizSchema } from '@/lib/validation/schemas'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from session cookie, not request body
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Check if this is a JSON request (multiplayer) or form data (singleplayer)
    const contentType = request.headers.get('content-type')
    let topic, difficulty, totalQuestions, sessionId, instructions, notes, studyContextStr
    let files: File[] = []
    let studyContext = null

    if (contentType?.includes('application/json')) {
      // Could be multiplayer OR singleplayer with notes
      const body = await request.json()
      topic = body.topic
      difficulty = body.difficulty
      totalQuestions = body.totalQuestions
      sessionId = body.sessionId
      // userId is now from session, not body
      notes = body.studyNotes ? JSON.stringify(body.studyNotes) : body.notes
      studyContextStr = body.studyContext ? JSON.stringify(body.studyContext) : null
      files = []
      
      // If studyContext is provided, parse it
      if (studyContextStr) {
        try {
          studyContext = typeof studyContextStr === 'string' ? JSON.parse(studyContextStr) : studyContextStr
        } catch (e) {
          console.log("⚠️ [QUIZ API] Failed to parse study context:", e)
        }
      }
    } else {
      // Singleplayer request (form data)
      const form = await request.formData()
      files = form.getAll("files") as File[]
      topic = form.get("topic") as string
      difficulty = form.get("difficulty") as string
      const totalQuestionsStr = form.get("totalQuestions") as string
      totalQuestions = totalQuestionsStr ? parseInt(totalQuestionsStr) : undefined
      // userId is now from session, not form data
      instructions = form.get("instructions") as string
      notes = form.get("notes") as string
      studyContextStr = form.get("studyContext") as string
      const questionTypesStr = form.get("questionTypes") as string
      let questionTypes = null
      if (questionTypesStr) {
        try {
          questionTypes = JSON.parse(questionTypesStr)
        } catch (e) {
          console.log("⚠️ [QUIZ API] Failed to parse question types:", e)
        }
      }
      
      if (studyContextStr) {
        try {
          studyContext = JSON.parse(studyContextStr)
        } catch (e) {
          console.log("⚠️ [QUIZ API] Failed to parse study context:", e)
        }
      }
    }
    
    let complexityAnalysis = null
    if (notes) {
      try {
        const parsedNotes = JSON.parse(notes)
        complexityAnalysis = parsedNotes.complexity_analysis
        console.log("📊 [QUIZ API] Using complexity analysis from notes:", complexityAnalysis)
      } catch (e) {
        console.log("⚠️ [QUIZ API] Failed to parse notes for complexity analysis:", e)
      }
    }

    // SECURITY: Validate and sanitize inputs
    try {
      // Validate difficulty
      if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
        return NextResponse.json(
          { success: false, error: 'Invalid difficulty. Must be easy, medium, or hard.' },
          { status: 400 }
        )
      }

      // Validate totalQuestions if provided
      if (totalQuestions !== undefined) {
        if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 50) {
          return NextResponse.json(
            { success: false, error: 'Invalid question count. Must be between 1 and 50.' },
            { status: 400 }
          )
        }
      }

      // Sanitize topic (max 500 chars, trim)
      if (topic) {
        topic = topic.trim().slice(0, 500)
      }
    } catch (validationError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    // Topic is optional - if not provided, will be determined from file content
    if (!topic || !topic.trim()) {
      console.log("📄 [QUIZ API] No topic provided, will determine from file content")
    }

    // Get user's subscription limits to determine default question count
    let userQuestionLimit = 8 // Default to free tier limit (safer default)
    if (userId) {
      try {
        const { getUserLimits } = await import('@/lib/subscription/limits')
        const limits = await getUserLimits(userId)
        userQuestionLimit = limits.maxQuestionsPerQuiz === Infinity ? 10 : limits.maxQuestionsPerQuiz
      } catch (error) {
        console.warn('⚠️ [QUIZ API] Failed to get user limits, using default:', error)
        // Keep default of 8 (free tier limit)
      }
    }

    // If totalQuestions not provided, use user's limit (or 8 as safe fallback)
    if (!totalQuestions) {
      totalQuestions = userQuestionLimit
      console.log(`📊 [QUIZ API] No totalQuestions specified, using user limit: ${totalQuestions}`)
    }

    // Check subscription limits for quiz questions
    if (userId && totalQuestions) {
      const questionLimit = await checkQuizQuestionLimit(userId, totalQuestions)
      if (!questionLimit.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Free users are limited to ${questionLimit.limit} questions per quiz. Upgrade to Pro for unlimited questions and advanced features!`,
            requiresPro: questionLimit.requiresPro,
            limit: questionLimit.limit,
            requested: totalQuestions
          },
          { status: 403 }
        )
      }
    }

    // Semantic search is optional and only useful if searching previously uploaded documents
    // Since we're processing new documents from files, we'll skip semantic search
    // This avoids connection errors and focuses on the uploaded file content
    console.log("🔍 [QUIZ API] Skipping semantic search (using uploaded file content)")
    let relevantChunks: any[] = []

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
      contextInstructions += "\nPlease tailor the quiz questions to these preferences while still basing everything on the document content.\n"
    }

    // Extract text from uploaded files if available, OR use notes content
    let fileContent = ""
    if (files && files.length > 0) {
      console.log(`📄 [QUIZ API] Processing ${files.length} uploaded files for quiz generation...`)
      try {
        const fileTexts = await Promise.all(
          (files as File[]).map(async (file: File) => {
            const buffer = Buffer.from(await file.arrayBuffer())
            if (file.type === "text/plain") {
              return `=== ${file.name} ===\n${buffer.toString('utf-8')}\n`
            } else if (file.type === "application/pdf") {
              // Use dynamic import for ESM module (required by Next.js)
              const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
              const pdfjsLib = pdfjsModule.default || pdfjsModule
              
              // Load the PDF document with server-side optimized settings
              const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(buffer),
                useSystemFonts: true,
                verbosity: 0,
                isEvalSupported: false, // Disable eval for server-side
              })
              
              const pdfDocument = await loadingTask.promise
              
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
              
              const text = textParts.join('\n\n')
              return `=== ${file.name} ===\n${text}\n`
            }
            return ""
          })
        )
        fileContent = fileTexts.filter(Boolean).join('\n\n')
        console.log(`✅ [QUIZ API] Extracted ${fileContent.length} characters from uploaded files`)
      } catch (error) {
        console.error(`❌ [QUIZ API] Error extracting file content:`, error)
      }
    } else if (notes) {
      // If no files but notes are provided, extract content from notes
      try {
        const parsedNotes = typeof notes === 'string' ? JSON.parse(notes) : notes
        console.log(`📝 [QUIZ API] Using study notes content for quiz generation...`)
        
        // Extract all text content from notes structure - comprehensive extraction
        const noteSections: string[] = []
        
        if (parsedNotes.title) noteSections.push(`Title: ${parsedNotes.title}`)
        
        if (parsedNotes.outline && Array.isArray(parsedNotes.outline)) {
          noteSections.push(`Outline:\n${parsedNotes.outline.join('\n')}`)
        }
        
        if (parsedNotes.key_terms && Array.isArray(parsedNotes.key_terms)) {
          noteSections.push(`Key Terms:\n${parsedNotes.key_terms.map((kt: any) => 
            typeof kt === 'string' ? kt : `${kt.term || kt}: ${kt.definition || ''}`
          ).join('\n')}`)
        }
        
        if (parsedNotes.concepts && Array.isArray(parsedNotes.concepts)) {
          noteSections.push(`Concepts:\n${parsedNotes.concepts.map((c: any) => {
            if (typeof c === 'string') return c
            const heading = c.heading || c.title || c.name || ''
            const bullets = c.bullets ? (Array.isArray(c.bullets) ? c.bullets.join('\n  • ') : c.bullets) : ''
            const description = c.description || c.content || ''
            const examples = c.examples ? `\nExamples: ${Array.isArray(c.examples) ? c.examples.join(', ') : c.examples}` : ''
            const connections = c.connections ? `\nConnections: ${Array.isArray(c.connections) ? c.connections.join(', ') : c.connections}` : ''
            const steps = c.steps ? `\nSteps: ${Array.isArray(c.steps) ? c.steps.join('\n') : c.steps}` : ''
            const content = bullets ? `  • ${bullets}` : description
            return `${heading}\n${content}${examples}${connections}${steps}`
          }).join('\n\n')}`)
        }
        
        if (parsedNotes.formulas && Array.isArray(parsedNotes.formulas)) {
          noteSections.push(`Formulas:\n${parsedNotes.formulas.map((f: any) => 
            `${f.name || ''}: ${f.formula || ''} - ${f.description || ''}${f.variables ? `\nVariables: ${JSON.stringify(f.variables)}` : ''}${f.example ? `\nExample: ${f.example}` : ''}`
          ).join('\n\n')}`)
        }
        
        // Extract practice questions from notes (if any) - these show what concepts are important
        if (parsedNotes.practice_questions && Array.isArray(parsedNotes.practice_questions)) {
          noteSections.push(`Practice Questions from Notes:\n${parsedNotes.practice_questions.map((q: any, idx: number) => {
            if (typeof q === 'string') return `${idx + 1}. ${q}`
            const question = q.question || q.prompt || ''
            const answer = q.answer || q.correct_answer || ''
            const explanation = q.explanation || ''
            const topic = q.topic ? ` (Topic: ${q.topic})` : ''
            return `${idx + 1}. ${question}\n   Answer: ${answer}\n   Explanation: ${explanation}${topic}`
          }).join('\n\n')}`)
        }
        
        // Also check for 'quiz' field (legacy support)
        if (parsedNotes.quiz && Array.isArray(parsedNotes.quiz)) {
          noteSections.push(`Additional Questions from Notes:\n${parsedNotes.quiz.map((q: any, idx: number) => {
            if (typeof q === 'string') return `${idx + 1}. ${q}`
            return `${idx + 1}. ${q.question || q.prompt || ''}\n   Answer: ${q.answer || q.correct_answer || ''}\n   Explanation: ${q.explanation || ''}`
          }).join('\n\n')}`)
        }
        
        // Extract diagrams information
        if (parsedNotes.diagrams && Array.isArray(parsedNotes.diagrams)) {
          noteSections.push(`Diagrams and Figures:\n${parsedNotes.diagrams.map((d: any) => 
            `${d.title || 'Diagram'}: ${d.caption || d.description || ''}${d.page ? ` (Page ${d.page})` : ''}`
          ).join('\n\n')}`)
        }
        
        // Extract examples if they exist separately
        if (parsedNotes.examples && Array.isArray(parsedNotes.examples)) {
          noteSections.push(`Examples:\n${parsedNotes.examples.map((e: any, idx: number) => 
            typeof e === 'string' ? `${idx + 1}. ${e}` : `${idx + 1}. ${e.description || e.content || e}`
          ).join('\n\n')}`)
        }
        
        fileContent = noteSections.join('\n\n')
        console.log(`✅ [QUIZ API] Extracted ${fileContent.length} characters from study notes`)
        console.log(`📊 [QUIZ API] Content sections: ${noteSections.length} sections extracted`)
      } catch (error) {
        console.error(`❌ [QUIZ API] Error extracting content from notes:`, error)
      }
    }

    // Validate that we have content to generate questions from
    if (!fileContent || fileContent.trim().length < 50) {
      console.error(`❌ [QUIZ API] No content available for quiz generation. File content length: ${fileContent?.length || 0}`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'No document content available. Please ensure files are uploaded or study notes are provided.' 
        },
        { status: 400 }
      )
    }

    // Create a comprehensive prompt for quiz generation
    const numQuestions = totalQuestions || 5
    const prompt = `
${topic && topic.trim() 
  ? `Generate ${numQuestions} quiz questions about "${topic}" with ${difficulty} difficulty level.${contextInstructions}`
  : `Generate ${numQuestions} quiz questions based on the content from the uploaded documents. Analyze the document content to determine the subject matter and create questions accordingly. Use ${difficulty} difficulty level.${contextInstructions}`
}

${complexityAnalysis ? `
COMPLEXITY ANALYSIS (use this to match question difficulty to content level):
- Education Level: ${complexityAnalysis.education_level || 'Not specified'}
- Vocabulary Level: ${complexityAnalysis.vocabulary_level || 'Not specified'}
- Concept Sophistication: ${complexityAnalysis.concept_sophistication || 'Not specified'}
- Reasoning Level Required: ${complexityAnalysis.reasoning_level || 'Not specified'}
- Prerequisite Knowledge: ${complexityAnalysis.prerequisite_knowledge?.join(', ') || 'None specified'}

IMPORTANT: Match your question complexity to the detected education level and reasoning requirements. Use vocabulary and concepts appropriate for the target audience.
` : ''}

${fileContent ? `
=== UPLOADED DOCUMENT CONTENT ===
${fileContent}

CRITICAL: You MUST base ALL questions on this uploaded document content. Every question must reference specific facts, examples, formulas, processes, or concepts from the documents above.
` : ''}

${relevantChunks.length === 0 ? `
${fileContent ? '' : `⚠️ WARNING: No specific document content was found for this topic. You MUST NOT create generic questions. If you cannot create questions based on actual document content, indicate this clearly.`}
` : `
=== SEMANTIC SEARCH RESULTS (Additional Context) ===
CRITICAL REQUIREMENT: You MUST base ALL questions on the specific document content provided below. Do not create generic questions - every question must test knowledge of the actual content in the documents.
`}

${relevantChunks.length > 0 ? `
SPECIFIC DOCUMENT CONTENT TO USE (from semantic search):
${relevantChunks.map((chunk: any, index: number) => `
=== DOCUMENT ${index + 1}: ${chunk.file_name} ===
Similarity: ${chunk.similarity_score?.toFixed(3)} | Subjects: ${chunk.subject_tags?.join(', ') || 'N/A'} | Topics: ${chunk.course_topics?.join(', ') || 'N/A'}

CONTENT:
${chunk.chunk_text}

`).join('\n')}

` : ''}

IMPORTANT: Base all questions on the specific document content provided above.

For each question, provide:
1. A clear, well-written question
2. Question type: "multiple_choice" or "open_ended"
3. For multiple choice: 4 options (A, B, C, D) and correct answer index (0-3)
4. For open-ended: expected answer(s) and answer format hints
5. A detailed explanation
6. If the question references a diagram, figure, chart, or image from the document, include an "image_reference" field indicating which image it relates to

IMPORTANT FOR IMAGES AND DIAGRAMS:
- If the document content mentions diagrams, figures, charts, or images, create questions about them
- Questions should test understanding of visual content when relevant
- Include questions that ask students to interpret or analyze visual elements
- Reference specific images by their page number or description when available

Format the response as JSON with this structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Question based on actual document content]",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "[Explanation referencing specific document content]",
      "source_document": "[Document name]",
      "requires_image": false
    }
  ]
}

⚠️ CRITICAL: The examples above are just structure examples. DO NOT use photosynthesis, circle area, or any generic topics. ALL questions MUST be about the actual document content provided.

MANDATORY REQUIREMENTS:
- EVERY question MUST be based on the specific document content provided above
- Do NOT create generic questions about "${topic}" - use the actual content from the documents
- Test knowledge of specific facts, figures, processes, or concepts mentioned in the documents
- Questions should reference specific details, examples, or data from the document content
- Create THOROUGH questions that test deep understanding, not just surface-level recall
- Mix of question types: 2-3 multiple choice, 2-3 open-ended
- For open-ended: include calculations, word problems, or explanations based on document content
- For multiple choice: create plausible incorrect options related to the document content
- Include detailed explanations that reference the specific document content
- Questions should test comprehension, application, and analysis - not just memorization
- Use specific examples, formulas, processes, and data points from the content
- Create questions that require students to connect concepts and apply knowledge

Question type guidelines:
- Multiple choice: Test specific facts, definitions, or concepts from the documents
- Open-ended: Perfect for calculations, word problems, or explanations based on document examples

Examples of document-specific questions:
- If document mentions "The experiment showed a 15% increase in efficiency" → Ask about the specific percentage
- If document contains a formula → Ask to calculate using that specific formula
- If document describes a process → Ask about specific steps in that process
- If document mentions specific examples → Ask questions about those examples

For each question, also include:
- A "source_document" field indicating which document the question is based on
- An "image_reference" field (optional) if the question relates to a diagram, figure, or image from the document
- An "requires_image" boolean field (true/false) indicating if the question needs an image to be answered properly

IMAGES AND VISUAL CONTENT:
- If documents contain diagrams, figures, charts, or images, create questions that reference them
- Questions about visual content should clearly indicate they require viewing an image
- Set "requires_image" to true for questions that need visual context
- Use "image_reference" to indicate which image the question relates to (e.g., "Figure 1", "Diagram on page 5", "Chart showing X")

Generate exactly ${numQuestions} questions that test knowledge of the specific document content provided.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert quiz generator. Your ONLY job is to create questions based on the EXACT document content provided. 

STRICT RULES:
1. NEVER create generic questions about a topic - only use what's in the documents
2. If the document is about sorting algorithms, create questions about sorting algorithms from the document
3. If the document is about biology, create questions about biology from the document
4. Every question MUST reference specific facts, examples, formulas, or processes from the provided documents
5. If you cannot find enough content in the documents to create questions, indicate this clearly
6. DO NOT invent or assume content that isn't in the documents
7. Always return valid JSON format`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_object"
      },
      temperature: 0.3, // Lower temperature for more grounded, document-based output
      max_tokens: 3000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    // Parse the JSON response
    // Strip markdown code blocks if present (fallback for cases where OpenAI still wraps it)
    let cleanedResponse = response.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    let quizData
    try {
      quizData = JSON.parse(cleanedResponse)
    } catch (error) {
      console.error("❌ [QUIZ API] Failed to parse OpenAI response as JSON:", error)
      console.log("📄 [QUIZ API] Raw response:", response)
      console.log("📄 [QUIZ API] Cleaned response:", cleanedResponse)
      throw new Error("Failed to parse quiz data from OpenAI")
    }
    
    // Validate the response structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid response format from OpenAI")
    }

    // Ensure each question has the required fields
    const validatedQuestions = quizData.questions.map((q: any, index: number) => ({
      id: index + 1,
      type: q.type || "multiple_choice",
      question: q.question || q.q || "Question not available",
      options: q.type === "open_ended" ? null : (q.options || [q.a || "Option A", "Option B", "Option C", "Option D"]),
      correct: q.type === "open_ended" ? null : (typeof q.correct === 'number' ? q.correct : 0),
      expected_answers: q.type === "open_ended" ? (q.expected_answers || []) : null,
      answer_format: q.type === "open_ended" ? (q.answer_format || "text") : null,
      hints: q.type === "open_ended" ? (q.hints || []) : null,
      explanation: q.explanation || "Explanation not available",
      source_document: q.source_document || "Document content",
      image_reference: q.image_reference || null,
      requires_image: q.requires_image || false,
      image_data_b64: q.image_data_b64 || null // Base64 image data if available
    }))

    // If this is a multiplayer session, store questions in database
    if (sessionId) {
      const supabase = await createClient()
      
      try {
        // Insert questions into quiz_questions table
        const questionsToInsert = validatedQuestions.map((q: any, index: number) => ({
          session_id: sessionId,
          idx: index,
          type: q.type === "multiple_choice" ? "mcq" : "short",
          prompt: q.question,
          options: q.options || [],
          answer: q.type === "multiple_choice" ? (q.options?.[q.correct] || "") : (q.expected_answers?.[0] || ""),
          meta: {
            explanation: q.explanation,
            source_document: q.source_document,
            hints: q.hints,
            answer_format: q.answer_format
          }
        }))

        const { error: questionsError } = await supabase
          .from('quiz_questions')
          .insert(questionsToInsert)

        if (questionsError) {
          console.error('❌ [QUIZ API] Error inserting questions:', questionsError)
          throw new Error('Failed to store questions in database')
        }

        console.log('✅ [QUIZ API] Questions stored in database for session:', sessionId)
      } catch (error) {
        console.error('❌ [QUIZ API] Error storing questions:', error)
        throw error
      }
    }

    return NextResponse.json({
      success: true,
      questions: validatedQuestions
    })

  } catch (error) {
    console.error("Error generating quiz:", error)
      // SECURITY: Sanitize error message before sending to client
      const sanitized = sanitizeError(error, 'Failed to generate quiz questions')
      return NextResponse.json(
        { 
          success: false, 
          ...createSafeErrorResponse(error, 'Failed to generate quiz questions')
        },
        { status: sanitized.statusCode }
      )
  }
}
