import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { checkQuizQuestionLimit } from '@/lib/subscription/limits'
import { generateQuizSchema } from '@/lib/validation/schemas'
import { sanitizeError, createSafeErrorResponse } from '@/lib/utils/error-sanitizer'
// Diagram generation temporarily disabled
// import { checkQuizDiagramLimit, decrementQuizDiagramQuota } from '@/lib/subscription/diagram-limits'
// import { generateQuizQuestionDiagram } from '@/lib/nanobanana/client'
import { z } from 'zod'
import {
  getPreviousQuestions,
  getWrongAnswers,
  isQuestionDuplicate,
  storeQuestionHistory,
  generateTopicHash
} from '@/lib/quiz/question-deduplication'
import { ensureUserExists } from '@/lib/utils/ensure-user-exists'
import { createAIClient } from '@/lib/ai/client-factory'
import type { AIChatMessage, AIChatCompletionResponse } from '@/lib/ai/types'
import { initializeBrowserPolyfills } from '@/lib/polyfills/browser-apis'

// CRITICAL: Configure global pdfjs worker options BEFORE any PDF parsing code runs
// This must be at module level (top of file) so it runs before pdf-parse imports pdfjs-dist
// pdf-parse internally uses pdfjs-dist, and pdfjs-dist checks for workers during import
// Use empty string to force fake worker mode (no worker file needed, works in serverless)
if (typeof globalThis !== 'undefined') {
  const globalObj: any = globalThis as any
  if (!globalObj.GlobalWorkerOptions) {
    globalObj.GlobalWorkerOptions = {}
  }
  // Empty string = fake worker (no actual worker file, runs in main thread)
  // This is the ONLY way that works in Node.js ESM loader (doesn't support https: protocol)
  globalObj.GlobalWorkerOptions.workerSrc = ''
  globalObj.GlobalWorkerOptions.disableWorker = true
}

export async function POST(request: NextRequest) {
  // CRITICAL: Initialize browser API polyfills BEFORE any PDF parsing
  // This must happen before pdf-parse or pdfjs-dist are imported/used
  initializeBrowserPolyfills()

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

    // Ensure user exists in users table (handles cases where session exists but user doesn't)
    const userExists = await ensureUserExists(userId)
    if (!userExists) {
      console.error(`❌ [QUIZ API] Failed to ensure user exists: ${userId}`)
      // Continue anyway - quiz generation shouldn't fail just because user creation failed
      // The error will be caught when trying to store question history
    }

    // SECURITY: Admin mode removed - was vulnerable to header spoofing
    // If admin features are needed, use environment variables or server-side config
    const isAdminMode = false
    
    // Check if this is a JSON request (multiplayer) or form data (singleplayer)
    const contentType = request.headers.get('content-type')
    let topic, difficulty, totalQuestions, sessionId, instructions, notes, studyContextStr
    let files: File[] = []
    let studyContext = null
    let contentFocus = 'both' // Default to both
    let includeDiagrams = true // Default to true
    let educationLevel = 'university' // Default to university
    let documentId: string | null = null // For tracking questions per document
    let isRedo = false // Flag for redo quiz (focus on wrong answers)

    if (contentType?.includes('application/json')) {
      // Could be multiplayer OR singleplayer with notes
      const body = await request.json()
      topic = body.topic
      difficulty = body.difficulty
      totalQuestions = body.totalQuestions
      sessionId = body.sessionId
      contentFocus = body.contentFocus || 'both'
      includeDiagrams = body.includeDiagrams !== false // Default to true if not specified
      educationLevel = body.educationLevel || 'university'
      documentId = body.documentId || null
      isRedo = body.isRedo === true
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
      educationLevel = (form.get("educationLevel") as string) || 'university'
      const totalQuestionsStr = form.get("totalQuestions") as string
      totalQuestions = totalQuestionsStr ? parseInt(totalQuestionsStr) : undefined
      const documentIdStr = form.get("documentId") as string
      documentId = documentIdStr || null
      const isRedoStr = form.get("isRedo") as string
      isRedo = isRedoStr === 'true'
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
      const contentFocus = form.get("contentFocus") as string || 'both'
      const includeDiagramsStr = form.get("includeDiagrams") as string
      const includeDiagrams = includeDiagramsStr !== 'false' // Default to true if not specified
      
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
    let userQuestionLimit = 10 // Default to free tier limit (safer default)
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

        // If totalQuestions not provided, use user's limit (or 10 as safe fallback)
    if (!totalQuestions) {
      totalQuestions = userQuestionLimit
      console.log(`📊 [QUIZ API] No totalQuestions specified, using user limit: ${totalQuestions}`)
    }

    // Check subscription limits for quiz generation (monthly limit)
    if (userId) {
      const { checkQuizLimit } = await import('@/lib/subscription/limits')
      const quizLimit = await checkQuizLimit(userId)
      
      if (!quizLimit.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: `You've reached your monthly limit of ${quizLimit.limit} quizzes. Upgrade to Pro for ${quizLimit.limit === 15 ? 50 : 'more'} quizzes per month and advanced features!`,
            requiresPro: true,
            count: quizLimit.count,
            limit: quizLimit.limit,
            remaining: quizLimit.remaining
          },
          { status: 403 }
        )
      }
    }

    // Check subscription limits for quiz questions per quiz
    if (userId && totalQuestions) {
      const questionLimit = await checkQuizQuestionLimit(userId, totalQuestions)
      if (!questionLimit.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: `You're limited to ${questionLimit.limit} questions per quiz. ${questionLimit.requiresPro ? 'Upgrade to Pro for up to 20 questions per quiz!' : ''}`,
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
    // Trim context instructions to keep prompt lean
    const MAX_CONTEXT_CHARS = 800
    if (contextInstructions.length > MAX_CONTEXT_CHARS) {
      console.warn(`⚠️ [QUIZ API] Trimming context instructions from ${contextInstructions.length} to ${MAX_CONTEXT_CHARS} chars`)
      contextInstructions = `${contextInstructions.slice(0, MAX_CONTEXT_CHARS)}\n...[context trimmed]`
    }

    // Extract text from uploaded files if available, OR use notes content
    // OPTIMIZATION: Prefer notes over file extraction if notes are available (faster, already processed)
    let fileContent = ""
    if (notes) {
      // If notes are provided, use them instead of re-extracting files (optimization)
      try {
        const parsedNotes = typeof notes === 'string' ? JSON.parse(notes) : notes
        console.log(`📝 [QUIZ API] Using study notes content for quiz generation (optimized - skipping file extraction)...`)
        
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
            return `${heading}\n  • ${bullets || description}${examples}`
          }).join('\n\n')}`)
        }
        
        if (parsedNotes.formulas && Array.isArray(parsedNotes.formulas)) {
          noteSections.push(`Formulas:\n${parsedNotes.formulas.map((f: any) => 
            typeof f === 'string' ? f : `${f.name || f.formula || ''}: ${f.formula || f.description || ''}`
          ).join('\n')}`)
        }
        
        fileContent = noteSections.join('\n\n')
        console.log(`✅ [QUIZ API] Extracted ${fileContent.length} characters from study notes`)
      } catch (error) {
        console.error(`❌ [QUIZ API] Error extracting content from notes:`, error)
        // Fall back to file extraction if notes parsing fails
        fileContent = ""
      }
    }
    
    // Trim overly long content to keep prompt size manageable for the model
    const MAX_CONTENT_CHARS = 6000
    if (fileContent && fileContent.length > MAX_CONTENT_CHARS) {
      console.warn(`⚠️ [QUIZ API] Truncating notes content from ${fileContent.length} to ${MAX_CONTENT_CHARS} characters to reduce token cost and avoid truncation.`)
      fileContent = `${fileContent.slice(0, MAX_CONTENT_CHARS)}\n...[truncated for length]`
    }
    
    // Only extract from files if we don't have notes content
    if (!fileContent && files && files.length > 0) {
      console.log(`📄 [QUIZ API] Processing ${files.length} uploaded files for quiz generation...`)
      try {
        const { extractTextFromDocument } = await import('@/lib/document-text-extractor')
        
        const fileTexts = await Promise.all(
          (files as File[]).map(async (file: File) => {
            const buffer = Buffer.from(await file.arrayBuffer())
            if (file.type === "text/plain") {
              return `=== ${file.name} ===\n${buffer.toString('utf-8')}\n`
            } else if (file.type === "application/pdf") {
              try {
                // Use pdf-parse - simple API, works on Vercel without any worker configuration
                const { extractPDFText } = await import('@/lib/pdf-parser')
                const pdfData = await extractPDFText(buffer)
                
                const text = pdfData.text || ''
                return `=== ${file.name} ===\n${text}\n`
              } catch (pdfError) {
                console.error(`Failed to parse PDF ${file.name}:`, pdfError)
                return ""
              }
            } else if (
              file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.type === 'application/msword' ||
              file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
              file.type === 'application/vnd.ms-powerpoint'
            ) {
              // Word or PowerPoint document
              try {
                const text = await extractTextFromDocument(file, buffer)
                return `=== ${file.name} ===\n${text}\n`
              } catch (docError) {
                console.error(`Failed to extract text from ${file.name}:`, docError)
                return ""
              }
            }
            return ""
          })
        )
        fileContent = fileTexts.filter(Boolean).join('\n\n')
        console.log(`✅ [QUIZ API] Extracted ${fileContent.length} characters from uploaded files`)
      } catch (error) {
        console.error(`❌ [QUIZ API] Error extracting file content:`, error)
      }
    }
    
    // Notes extraction is now handled at the top (before file extraction) for optimization
    // This block is kept for backward compatibility but should not be reached if notes were provided
    if (!fileContent && notes && !files?.length) {
      // Fallback: If no file content and notes are provided, extract content from notes
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
      console.error("❌ [QUIZ API] Insufficient content to generate questions")
      console.error("   fileContent length:", fileContent?.length || 0)
      console.error("   Has files:", !!files?.length)
      console.error("   Has notes:", !!notes)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient content to generate questions. Please provide documents or notes with at least 50 characters of content.' 
        },
        { status: 400 }
      )
    }
    
    // Log content summary for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`📄 [QUIZ API] Content summary: ${fileContent.length} characters`)
      console.log(`   First 200 chars: ${fileContent.substring(0, 200)}...`)
    }

    // Create a comprehensive prompt for quiz generation
    let numQuestions = totalQuestions || 5
    
    // Fast-path clamp: for long content, cap questions to reduce latency
    const LONG_CONTENT_THRESHOLD = 9000
    const MAX_QUESTIONS_FOR_LONG_CONTENT = 6
    if (fileContent.length > LONG_CONTENT_THRESHOLD && numQuestions > MAX_QUESTIONS_FOR_LONG_CONTENT) {
      console.warn(`⚠️ [QUIZ API] Long content (${fileContent.length} chars). Capping questions from ${numQuestions} to ${MAX_QUESTIONS_FOR_LONG_CONTENT} to improve latency.`)
      numQuestions = MAX_QUESTIONS_FOR_LONG_CONTENT
    }
    
    // Get previous questions and wrong answers for deduplication and redo focus
    let previousQuestions: any[] = []
    let wrongAnswers: any[] = []
    let topicHash: string | null = null
    
    if (userId && !isAdminMode) {
      try {
        // Generate topic hash if no document_id
        if (!documentId && topic) {
          topicHash = generateTopicHash(topic, difficulty, educationLevel, contentFocus)
        }
        
        // Get previous questions to exclude
        previousQuestions = await getPreviousQuestions(userId, documentId, topicHash)
        console.log(`📋 [QUIZ API] Found ${previousQuestions.length} previous questions to exclude`)
        
        // If redo, get wrong answers to focus on
        if (isRedo) {
          wrongAnswers = await getWrongAnswers(userId, documentId, topicHash)
          console.log(`🔄 [QUIZ API] Redo mode: Found ${wrongAnswers.length} wrong answers to focus on`)
        }
      } catch (error) {
        console.error('❌ [QUIZ API] Error fetching previous questions:', error)
        // Continue without deduplication if there's an error
      }
    }
    
    // Adjust difficulty based on education level
    const getEducationLevelDescription = (level: string) => {
      switch (level) {
        case 'elementary':
          return 'ELEMENTARY SCHOOL level (ages 6-12). Use simple vocabulary, basic concepts, and straightforward questions. Focus on fundamental understanding and recall.'
        case 'high_school':
          return 'HIGH SCHOOL level (ages 13-18). Use appropriate vocabulary for teenagers, intermediate concepts, and questions that test both understanding and application.'
        case 'university':
          return 'UNIVERSITY/UNDERGRADUATE level (ages 18-22). Use advanced vocabulary, complex concepts, and questions that require critical thinking, analysis, and synthesis.'
        case 'graduate':
          return 'GRADUATE SCHOOL level (advanced). Use sophisticated vocabulary, highly complex concepts, and questions that require deep analysis, evaluation, and original thinking.'
        default:
          return 'UNIVERSITY level'
      }
    }
    
    const educationLevelDescription = getEducationLevelDescription(educationLevel)
    
    // Build exclusion and focus instructions
    let exclusionInstructions = ''
    if (previousQuestions.length > 0) {
      exclusionInstructions = `

⚠️ CRITICAL: DO NOT CREATE QUESTIONS THAT ARE SIMILAR TO THESE PREVIOUS QUESTIONS:
${previousQuestions.slice(0, 20).map((q, i) => `${i + 1}. ${q.question_text}`).join('\n')}

You MUST create completely NEW and DIFFERENT questions. Do not rephrase or slightly modify these questions - create entirely new questions about different aspects of the content.
`
    }
    
    let redoFocusInstructions = ''
    if (isRedo && wrongAnswers.length > 0) {
      const topWrongTopics = wrongAnswers.slice(0, 5).map(wa => wa.source_document || 'content').filter(Boolean)
      redoFocusInstructions = `

🔄 REDO QUIZ MODE - FOCUS ON AREAS WHERE USER STRUGGLED:
The user previously got these questions wrong (indicating they need more practice on these topics):
${wrongAnswers.slice(0, 5).map((wa, i) => `${i + 1}. ${wa.question_text.substring(0, 100)}...`).join('\n')}

PRIORITY: Create questions that test understanding of the SAME CONCEPTS/TOPICS that the user struggled with, but with DIFFERENT questions. Focus on:
${topWrongTopics.length > 0 ? `- Topics: ${[...new Set(topWrongTopics)].join(', ')}` : '- The same concepts from the document'}
- Similar difficulty level but different question formulation
- Testing the same knowledge areas where the user needs improvement
`
    }
    
    const prompt = `
${isRedo ? '🔄 REDO QUIZ: ' : ''}${topic && topic.trim() 
  ? `Generate ${numQuestions} quiz questions about "${topic}" with ${difficulty} difficulty level, appropriate for ${educationLevelDescription}.${contextInstructions}`
  : `Generate ${numQuestions} quiz questions based on the content from the uploaded documents. Analyze the document content to determine the subject matter and create questions accordingly. Use ${difficulty} difficulty level, appropriate for ${educationLevelDescription}.${contextInstructions}`
}
${exclusionInstructions}
${redoFocusInstructions}

${complexityAnalysis ? `
COMPLEXITY ANALYSIS (use this to match question difficulty to content level):
- Education Level: ${complexityAnalysis.education_level || 'Not specified'}
- Vocabulary Level: ${complexityAnalysis.vocabulary_level || 'Not specified'}
- Concept Sophistication: ${complexityAnalysis.concept_sophistication || 'Not specified'}
- Reasoning Level Required: ${complexityAnalysis.reasoning_level || 'Not specified'}
- Prerequisite Knowledge: ${complexityAnalysis.prerequisite_knowledge?.join(', ') || 'None specified'}

IMPORTANT: Match your question complexity to the detected education level and reasoning requirements. Use vocabulary and concepts appropriate for the target audience.
` : `
EDUCATION LEVEL REQUIREMENT:
- Target Level: ${educationLevelDescription}
- CRITICAL: All questions MUST be appropriate for this education level
- Adjust vocabulary, concept complexity, and reasoning requirements accordingly
- For ${educationLevel === 'elementary' ? 'elementary' : educationLevel === 'high_school' ? 'high school' : educationLevel === 'university' ? 'university' : 'graduate'} level, questions should ${educationLevel === 'elementary' ? 'be simple and straightforward' : educationLevel === 'high_school' ? 'test intermediate understanding' : educationLevel === 'university' ? 'require critical thinking and analysis' : 'require advanced analysis and evaluation'}
`}

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

CRITICAL: You MUST return valid JSON. The response MUST be a valid JSON object with this EXACT structure:
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

⚠️ IMPORTANT JSON FORMATTING RULES:
- The "questions" field MUST be an array (use square brackets [])
- Do NOT put quotes around the array: use "questions": [{...}] NOT "questions": ":[{"
- Each question object must be properly closed with }
- The entire response must be valid JSON that can be parsed with JSON.parse()
- Do NOT include any text before or after the JSON object
- Do NOT wrap the JSON in markdown code blocks

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

Content Focus Guidelines (CRITICAL - follow this exactly):
${contentFocus === 'application' ? `
- FOCUS ON APPLICATION: Create questions that test USE CASES, FORMULAS, and PROBLEM-SOLVING
- Emphasize practical application of concepts (e.g., "Calculate...", "Solve...", "Apply the formula...", "Use the method to...")
- Include questions that require using formulas, solving problems, or applying concepts to real scenarios
- Test ability to USE knowledge, not just recall definitions
- Examples: "Calculate the stress using the formula...", "Apply Hooke's law to determine...", "Solve for the unknown variable..."
- AVOID pure definition or explanation questions - focus on application and problem-solving
` : contentFocus === 'concept' ? `
- FOCUS ON CONCEPTS: Create questions that test DEFINITIONS, EXPLANATIONS, and UNDERSTANDING
- Emphasize conceptual understanding (e.g., "What is...", "Explain...", "Define...", "Describe...")
- Include questions that require explaining concepts, defining terms, or understanding relationships
- Test ability to UNDERSTAND and EXPLAIN knowledge, not just apply formulas
- Examples: "What is the definition of stress?", "Explain the difference between...", "Describe how... works"
- AVOID calculation or problem-solving questions - focus on definitions and conceptual understanding
` : `
- FOCUS ON BOTH: Create a balanced mix of APPLICATION and CONCEPT questions
- Include both problem-solving/application questions (formulas, calculations, use cases) AND conceptual questions (definitions, explanations, understanding)
- Mix questions that test practical application with questions that test conceptual understanding
- Balance between "Calculate..." and "Explain..." type questions
- Ensure variety: some questions require formulas/calculations, others require explanations/definitions
`}

Examples of document-specific questions:
- If document mentions "The experiment showed a 15% increase in efficiency" → Ask about the specific percentage
- If document contains a formula → Ask to calculate using that specific formula
- If document describes a process → Ask about specific steps in that process
- If document mentions specific examples → Ask questions about those examples

For each question, also include:
- A "source_document" field indicating which document the question is based on
- An "image_reference" field (optional) if the question relates to a diagram, figure, or image from the document
- An "requires_image" boolean field (true/false) indicating if the question needs an image to be answered properly

${includeDiagrams ? `
IMAGES AND VISUAL CONTENT - CRITICAL REQUIREMENTS:
- If documents contain diagrams, figures, charts, or images, create questions that DIRECTLY relate to and test understanding of those visuals
- Questions with "requires_image: true" MUST be about the diagram/chart/figure itself - the question should be impossible or very difficult to answer without seeing the visual
- The question text MUST reference specific elements from the diagram (e.g., "Based on the diagram showing...", "Looking at the chart, what is...", "In the figure above, identify...")
- DO NOT set "requires_image: true" for questions that can be answered from text alone
- DO NOT create generic questions and then add "requires_image: true" - the question MUST be specifically about the visual content
- Examples of GOOD diagram questions:
  * "Based on the force diagram shown, what is the net force acting on the object?"
  * "Looking at the circuit diagram, which component has the highest voltage?"
  * "In the graph showing velocity over time, what is the acceleration at t=5s?"
- Examples of BAD diagram questions (DO NOT DO THIS):
  * "What is Newton's first law?" (can be answered without diagram)
  * "Calculate the area of a circle" (not about a diagram)
  * Generic question with "requires_image: true" added randomly
- Set "requires_image" to true ONLY for questions that test visual interpretation, diagram analysis, or require seeing a specific chart/graph/figure
- Use "image_reference" to indicate which image the question relates to (e.g., "Figure 1", "Diagram on page 5", "Chart showing X")
` : `
IMAGES AND VISUAL CONTENT - DISABLED:
- DO NOT create questions with "requires_image: true"
- DO NOT reference diagrams, figures, charts, or images in questions
- All questions must be answerable from text content only
- Set "requires_image" to false for ALL questions
`}

CRITICAL REQUIREMENT: You MUST generate exactly ${numQuestions} questions. The questions array MUST contain ${numQuestions} question objects. DO NOT return an empty array. If you cannot create questions from the content, you MUST still create questions based on what is available, even if you need to infer or extrapolate from the provided content.

Generate exactly ${numQuestions} questions that test knowledge of the specific document content provided. The response MUST have a "questions" array with exactly ${numQuestions} question objects. An empty array is NOT acceptable.
`

    // Use Moonshot for quiz generation
    const aiProvider = 'moonshot' as const
    
    const messages: AIChatMessage[] = [
      {
        role: "system",
        content: `You are an expert quiz generator. Your ONLY job is to create questions based on the EXACT document content provided. 

CRITICAL REQUIREMENTS:
1. You MUST ALWAYS generate the requested number of questions - NEVER return an empty questions array
2. NEVER create generic questions about a topic - only use what's in the documents
3. If the document is about sorting algorithms, create questions about sorting algorithms from the document
4. If the document is about biology, create questions about biology from the document
5. Every question MUST reference specific facts, examples, formulas, or processes from the provided documents
6. If content is limited, create questions based on what IS available - even if you need to ask about definitions, concepts, or basic information from the documents
7. DO NOT invent or assume content that isn't in the documents, but DO create questions from whatever content IS provided
8. Always return valid JSON format with a "questions" array containing the exact number of questions requested
9. An empty questions array is NEVER acceptable - you must generate questions even if the content is minimal`
      },
      {
        role: "user",
        content: prompt
      }
    ]

    let responseStr: string = ''
    let modelUsed: string
    const provider: 'moonshot' = 'moonshot'

    // Use Moonshot for quiz generation
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🤖 [QUIZ API] Using Moonshot (Kimi K2) for quiz generation`)
      console.log(`   Checking MOONSHOT_API_KEY: ${process.env.MOONSHOT_API_KEY ? 'SET (length: ' + process.env.MOONSHOT_API_KEY.length + ')' : 'NOT SET'}`)
    }
    
    const aiClient = createAIClient('moonshot')
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ✅ [QUIZ API] Moonshot client created successfully`)
    }
    
    // Add timeout wrapper to prevent hanging (3 minutes max)
    console.log(`⏱️ [QUIZ API] Starting AI call with 3-minute timeout...`)
    const startTime = Date.now()
    
    // Model fallback list: prefer env, then stable known variants
    // Prefer explicit OpenRouter Moonshot IDs; allow env override first
    const modelFallbacks = [
      process.env.MOONSHOT_MODEL,
      'moonshotai/kimi-k2',
      'moonshotai/kimi-1.5',
      'moonshotai/kimi',
      'moonshotai/moonshot-v1-8k'
    ].filter(Boolean) as string[]
    
    let aiResponse: AIChatCompletionResponse | undefined
    let modelUsedLocal = ''
    let lastError: any
    
    for (const modelName of modelFallbacks) {
      try {
        console.log(`🤖 [QUIZ API] Trying model: ${modelName}`)
        const aiCallPromise = aiClient.chatCompletions(messages, {
          model: modelName,
          temperature: 0.25,
          responseFormat: 'json_object',
          maxTokens: 9000, // keep lean
        })
        
        // Add 3 minute timeout to prevent hanging (allows up to ~10 questions)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            reject(new Error(`AI API call timed out after ${elapsed} seconds for model ${modelName}.`))
          }, 180000) // 3 minutes
        })
        
        aiResponse = await Promise.race([aiCallPromise, timeoutPromise])
        modelUsedLocal = modelName
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`✅ [QUIZ API] AI call completed in ${elapsed} seconds with model ${modelName}`)
        break
      } catch (error: any) {
        lastError = error
        console.error(`❌ [QUIZ API] Model ${modelName} failed:`, error?.message || error)
        continue
      }
    }
    
    if (!aiResponse) {
      throw new Error(`All Moonshot models failed. Last error: ${lastError?.message || lastError}`)
    }
    
    let response: string
    if (typeof aiResponse === 'string') {
        responseStr = aiResponse
    } else {
      const rawContent = (aiResponse as any)?.content
      const firstEntry = Array.isArray(rawContent) ? rawContent[0] : undefined
      const textVal =
        firstEntry?.text ??
        firstEntry?.content?.[0]?.text?.value ??
        firstEntry?.content?.[0]?.text
      if (typeof textVal === 'string') {
          responseStr = textVal.trim()
      } else {
          responseStr = JSON.stringify(aiResponse)
      }
    }
    modelUsed = modelUsedLocal
    
    // Parse the JSON response
    // Strip markdown code blocks if present (fallback for cases where AI still wraps it)
    const parseAiResponse = (rawResponse: string) => {
      let cleanedResponse = rawResponse.trim()
      
      // Remove markdown code block wrapper (handle both complete and incomplete blocks)
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '')
        cleanedResponse = cleanedResponse.replace(/\n?\s*```\s*$/, '')
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '')
        cleanedResponse = cleanedResponse.replace(/\n?\s*```\s*$/, '')
      }
      
      cleanedResponse = cleanedResponse.trim()
      
      // Fix common JSON malformations BEFORE parsing
      cleanedResponse = cleanedResponse.replace(/"questions"\s*:\s*":\[{/g, '"questions": [{')
      cleanedResponse = cleanedResponse.replace(/"questions"\s*:\s*":\s*\[{/g, '"questions": [{')
      cleanedResponse = cleanedResponse.replace(/"questions"\s*:\s*:\[{/g, '"questions": [{')
      cleanedResponse = cleanedResponse.replace(/"questions"\s*:\s*"\[{/g, '"questions": [{')
      cleanedResponse = cleanedResponse.replace(/"questions"\s*":\s*\[{/g, '"questions": [{')
      // Fix: remove orphaned numeric entries like {":1,...} and map keyless question types to "type"
      cleanedResponse = cleanedResponse
        .replace(/\{\s*":\s*\d+\s*,/g, '{')
        .replace(/,\s*":\s*\d+\s*,/g, ',')
        .replace(/\{\s*":\s*"(multiple_choice|open_ended)"\s*,/g, '{"type":"$1",')
        .replace(/,\s*":\s*"(multiple_choice|open_ended)"\s*/g, ',"type":"$1"')
      // Fix: trailing commas before closing braces/brackets and stray ," }]}
      cleanedResponse = cleanedResponse
        .replace(/,\s*(\}|\])/g, '$1')
        .replace(/,"\s*\}\s*\]\s*\}/g, ' }]}') // remove stray comma before closing array/object
        .replace(/\}\s*,\s*\]/g, '}]') // handle },] -> }]
        .replace(/\]\s*,\s*\}/g, ']}') // handle ],} -> ]}
        .replace(/,\s*}\s*$/g, '}') // trailing comma before final }
      
      // Trim to the outermost JSON object to avoid trailing garbage
      const firstBrace = cleanedResponse.indexOf('{')
      const lastBrace = cleanedResponse.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleanedResponse = cleanedResponse.slice(firstBrace, lastBrace + 1)
      }
      // Fix: AI sometimes injects orphaned keyless entries like {",": "1", "type": ...}
      cleanedResponse = cleanedResponse.replace(/\[\s*\{\s*",\s*":\s*"?\d+"?\s*,/g, '[{')
      cleanedResponse = cleanedResponse.replace(/\{\s*",\s*":\s*"?\d+"?\s*,/g, '{')
      cleanedResponse = cleanedResponse.replace(/,\s*",\s*":\s*"?\d+"?\s*,?/g, ',')
      
      const brokenArrayPattern = /"questions"\s*:\s*\[\{\s*",\s*"type"/
      if (brokenArrayPattern.test(cleanedResponse)) {
        cleanedResponse = cleanedResponse.replace(/"questions"\s*:\s*\[\{\s*",\s*"type"/g, '"questions": [{"type"')
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log("🔧 [QUIZ API] Cleaned response (first 500 chars):", cleanedResponse.substring(0, 500))
      }
      
      const responseLength = cleanedResponse.length
      const lastChar = cleanedResponse[responseLength - 1]
      const hasUnterminatedString = cleanedResponse.match(/"[^"]*$/m)
      
      if (hasUnterminatedString && lastChar !== '}') {
        console.warn("⚠️ [QUIZ API] Response appears truncated - last char:", lastChar)
        console.warn("   Response length:", responseLength, "characters")
        console.warn("   This may indicate maxTokens limit was reached")
      }
      
      let quizDataLocal: any
      try {
        quizDataLocal = JSON.parse(cleanedResponse)
        
        if (process.env.NODE_ENV === 'development') {
          console.log("✅ [QUIZ API] JSON parsed successfully")
          console.log("📋 [QUIZ API] Parsed quiz data structure:", {
            hasQuestions: !!quizDataLocal.questions,
            questionsIsArray: Array.isArray(quizDataLocal.questions),
            questionsLength: Array.isArray(quizDataLocal.questions) ? quizDataLocal.questions.length : 'N/A',
            topLevelKeys: Object.keys(quizDataLocal),
            sampleData: JSON.stringify(quizDataLocal).substring(0, 500)
          })
        }
        
        // Some providers wrap the JSON in a "content" field as a string. Unwrap if needed.
        if ((!quizDataLocal.questions || !Array.isArray(quizDataLocal.questions)) && typeof quizDataLocal.content === 'string') {
          try {
            const inner = JSON.parse(quizDataLocal.content)
            if (inner?.questions && Array.isArray(inner.questions)) {
              quizDataLocal = inner
              if (process.env.NODE_ENV === 'development') {
                console.log("🔄 [QUIZ API] Unwrapped questions from top-level content string")
              }
            }
          } catch (unwrapErr) {
            console.warn("⚠️ [QUIZ API] Failed to parse content wrapper as JSON:", unwrapErr instanceof Error ? unwrapErr.message : unwrapErr)
          }
        }
      } catch (error: any) {
        console.error("❌ [QUIZ API] Failed to parse AI response as JSON:", error)
        console.log("📄 [QUIZ API] Response length:", cleanedResponse.length, "characters")
        console.log("📄 [QUIZ API] First 100 chars:", cleanedResponse.substring(0, 100))
        console.log("📄 [QUIZ API] Last 200 chars:", cleanedResponse.slice(-200))
        
        try {
          console.log("🔧 [QUIZ API] Attempting to repair malformed JSON by extracting questions...")
          
          let repairableJson = cleanedResponse
            .replace(/"questions"\s*:\s*":\[{/g, '')
            .replace(/^\{,\s*/, '{')
            .trim()
          
          const questionObjects: any[] = []
          let braceDepth = 0
          let inString = false
          let escapeNext = false
          let currentObject = ''
          
          for (let i = 0; i < repairableJson.length; i++) {
            const char = repairableJson[i]
            
            if (escapeNext) {
              currentObject += char
              escapeNext = false
              continue
            }
            
            if (char === '\\') {
              escapeNext = true
              currentObject += char
              continue
            }
            
            if (char === '"') {
              inString = !inString
              currentObject += char
              continue
            }
            
            if (!inString) {
              if (char === '{') {
                if (braceDepth === 0) {
                  currentObject = '{'
                } else {
                  currentObject += char
                }
                braceDepth++
              } else if (char === '}') {
                currentObject += char
                braceDepth--
                if (braceDepth === 0 && currentObject.trim()) {
                  try {
                    const parsed = JSON.parse(currentObject)
                    if (parsed.type && parsed.question) {
                      questionObjects.push(parsed)
                    }
                  } catch (e) {
                    // skip
                  }
                  currentObject = ''
                }
              } else {
                if (braceDepth > 0) {
                  currentObject += char
                }
              }
            } else {
              currentObject += char
            }
          }
          
          if (questionObjects.length > 0) {
            console.log(`✅ [QUIZ API] Successfully extracted ${questionObjects.length} questions from malformed JSON`)
            quizDataLocal = { questions: questionObjects.map((q, idx) => ({ id: idx + 1, ...q })) }
          } else {
            const questionPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"type"\s*:\s*"[^"]+"[^{}]*(?:\{[^{}]*\}[^{}]*)*"question"\s*:\s*"[^"]+"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
            const matches = cleanedResponse.match(questionPattern) || []
            
            const extractedQuestions: any[] = []
            for (const match of matches) {
              try {
                const parsed = JSON.parse(match)
                if (parsed.type && parsed.question) {
                  extractedQuestions.push(parsed)
                }
              } catch {
                // skip
              }
            }
            
            if (extractedQuestions.length > 0) {
              console.log(`✅ [QUIZ API] Extracted ${extractedQuestions.length} questions using regex fallback`)
              quizDataLocal = { questions: extractedQuestions.map((q, idx) => ({ id: idx + 1, ...q })) }
            } else {
              throw new Error("Could not extract questions from malformed JSON")
            }
          }
        } catch (repairError) {
          if (error instanceof SyntaxError && (error.message.includes('Unterminated') || error.message.includes('Unexpected end'))) {
            console.error("⚠️ [QUIZ API] JSON appears to be truncated - likely hit maxTokens limit")
            console.error("   Current maxTokens: 12000")
            console.error("   Consider increasing maxTokens or reducing question complexity")
            throw new Error(`Response was truncated (likely hit token limit). JSON parsing failed at position ${error.message.match(/position (\d+)/)?.[1] || 'unknown'}. Try reducing the number of questions or question complexity.`)
          }
          
          console.log("📄 [QUIZ API] Full cleaned response (first 2000 chars):", cleanedResponse.substring(0, 2000))
          throw new Error(`Failed to parse quiz data from AI provider: ${error.message}`)
        }
      }
      
      return { quizData: quizDataLocal, cleanedResponse }
    }
    
    let didRetryEmpty = false
    let didRetryParse = false
    let parseResult: { quizData: any; cleanedResponse: string }
    let quizData: any
    let cleanedResponse: string = ''
    const tryParse = () => {
      parseResult = parseAiResponse(responseStr)
      quizData = parseResult.quizData
      cleanedResponse = parseResult.cleanedResponse
    }
    
    try {
      tryParse()
    } catch (err: any) {
      // If initial parse failed, attempt a minimal fallback call with simpler prompt
      if (!didRetryParse) {
        console.warn("⚠️ [QUIZ API] Parse failed; retrying with minimal prompt to force valid JSON...")
        didRetryParse = true
        const fallbackMessages: AIChatMessage[] = [
          {
            role: "system",
            content: `You MUST return valid JSON with a "questions" array. Only output JSON, no prose.`
          },
          {
            role: "user",
            content: `Create ${Math.min(numQuestions, 4)} multiple_choice questions strictly from the provided document. Respond exactly in JSON: { "questions": [ { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "...", "source_document": "Document content", "requires_image": false } ] }`
          }
        ]
        const fallbackResp = await aiClient.chatCompletions(fallbackMessages, {
          model: process.env.MOONSHOT_MODEL || 'kimi-k2',
          temperature: 0.15,
          responseFormat: 'json_object',
          maxTokens: 3000,
        })

        if (typeof fallbackResp === 'string') {
          responseStr = fallbackResp
        } else {
          const rawContent = (fallbackResp as any)?.content
          const firstEntry = Array.isArray(rawContent) ? rawContent[0] : undefined
          const textVal =
            firstEntry?.text ??
            firstEntry?.content?.[0]?.text?.value ??
            firstEntry?.content?.[0]?.text
          responseStr = typeof textVal === 'string' ? textVal.trim() : JSON.stringify(fallbackResp)
        }
        tryParse()
      } else {
        throw err
      }
    }
    
    const handleEmptyQuestionsRetry = async () => {
      console.warn("⚠️ [QUIZ API] Retrying AI call with fallback prompt because questions array was empty...")
      const fallbackMessages: AIChatMessage[] = [
        {
          role: "system",
          content: `You MUST return a non-empty "questions" array. Generate at least ${numQuestions} multiple_choice questions strictly from the provided document text. Do NOT return an empty array.`
        },
        {
          role: "user",
          content: `Create ${numQuestions} multiple_choice questions with 4 options each. Use only the provided document content. Return JSON: { "questions": [ { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "...", "source_document": "Document content", "requires_image": false } ] }`
        }
      ]
      
      const fallbackStart = Date.now()
      const retryResp = await aiClient.chatCompletions(fallbackMessages, {
        model: process.env.MOONSHOT_MODEL || 'kimi-k2',
        temperature: 0.1,
        responseFormat: 'json_object',
        maxTokens: 4000,
      })
      const fallbackElapsed = ((Date.now() - fallbackStart) / 1000).toFixed(1)
      console.log(`✅ [QUIZ API] Fallback AI call completed in ${fallbackElapsed} seconds`)
      
      let retryRaw: string
      if (typeof retryResp === 'string') {
        retryRaw = retryResp
      } else {
        const rawContent = (retryResp as any)?.content
        const firstEntry = Array.isArray(rawContent) ? rawContent[0] : undefined
        const textVal =
          firstEntry?.text ??
          firstEntry?.content?.[0]?.text?.value ??
          firstEntry?.content?.[0]?.text
        retryRaw = typeof textVal === 'string' ? textVal.trim() : JSON.stringify(retryResp)
      }
      
      const retryParsed = parseAiResponse(retryRaw)
      quizData = retryParsed.quizData
      cleanedResponse = retryParsed.cleanedResponse
    }
    
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error("❌ [QUIZ API] Invalid response structure:")
      console.error("   Expected: { questions: [...] }")
      console.error("   Received keys:", Object.keys(quizData))
      console.error("   quizData.questions type:", typeof quizData.questions)
      console.error("   quizData.questions value:", quizData.questions)
      console.error("   Full response (first 2000 chars):", JSON.stringify(quizData, null, 2).substring(0, 2000))
      console.error("   Cleaned response (first 1000 chars):", cleanedResponse.substring(0, 1000))
      throw new Error("Parsed AI response did not contain a questions array. Provider returned meta wrapper without questions.")
    } else if (quizData.questions.length === 0) {
      console.error("❌ [QUIZ API] AI returned empty questions array!")
      console.error("   Expected: At least 1 question")
      console.error("   Received: 0 questions")
      console.error("   This usually means:")
      console.error("   1. The prompt wasn't clear enough")
      console.error("   2. The document content wasn't sufficient")
      console.error("   3. The AI model failed to generate questions")
      console.error("   Raw response:", cleanedResponse.substring(0, 500))
      
      if (!didRetryEmpty) {
        didRetryEmpty = true
        await handleEmptyQuestionsRetry()
        
        if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          throw new Error(`AI failed twice to generate any questions. The response was valid JSON but contained an empty questions array.`)
        }
      } else {
        throw new Error(`AI failed to generate any questions. The response was valid JSON but contained an empty questions array. Please check that document content was provided and try again.`)
      }
    }

    // Ensure each question has the required fields
    let validatedQuestions = quizData.questions.map((q: any, index: number) => ({
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
    
    // Filter out duplicates if we have previous questions
    if (previousQuestions.length > 0 && userId && !isAdminMode) {
      const originalCount = validatedQuestions.length
      validatedQuestions = validatedQuestions.filter((q: any) => {
        const isDuplicate = isQuestionDuplicate(q.question, previousQuestions)
        if (isDuplicate) {
          console.log(`⚠️ [QUIZ API] Filtered out duplicate question: "${q.question.substring(0, 50)}..."`)
        }
        return !isDuplicate
      })
      
      if (validatedQuestions.length < originalCount) {
        console.log(`📋 [QUIZ API] Filtered ${originalCount - validatedQuestions.length} duplicate questions`)
        // If we filtered too many, we might need to generate more, but for now just proceed
      }
    }

    // Diagrams temporarily disabled: force all questions to text-only
    validatedQuestions = validatedQuestions.map((q: any) => ({
      ...q,
      requires_image: false,
      image_reference: null,
      image_data_b64: null,
      diagramQuota: undefined
    }))

    console.log(`ℹ️ [QUIZ API] Prepared ${validatedQuestions.length} validated questions for storage`)
    console.log('ℹ️ [QUIZ API] Question type breakdown:', validatedQuestions.reduce((acc: Record<string, number>, q: any) => {
      const t = q.type || 'unknown'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {}))

    // Ensure we have a session to attach stored questions (singleplayer or multiplayer)
    const supabase = await createClient()
    let sessionIdToUse = sessionId

    if (!sessionIdToUse) {
      try {
        console.log('ℹ️ [QUIZ API] No sessionId provided; creating singleplayer quiz_session...')
        const { data: newSession, error: sessionError } = await supabase
          .from('quiz_sessions')
          .insert({
            user_id: userId,
            session_name: topic ? `Singleplayer: ${topic}` : 'Singleplayer Quiz',
            total_questions: validatedQuestions.length,
            time_limit: 30,
            is_active: true,
            room_id: null,
            started_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (sessionError) {
          console.error('❌ [QUIZ API] Failed to create quiz session for question storage:', sessionError)
        } else if (newSession?.id) {
          sessionIdToUse = newSession.id
          console.log('✅ [QUIZ API] Created quiz session for singleplayer question storage:', sessionIdToUse)
        }
      } catch (sessionCreateError) {
        console.error('❌ [QUIZ API] Exception while creating quiz session:', sessionCreateError)
      }
    } else {
      console.log('ℹ️ [QUIZ API] Using existing session for question storage:', sessionIdToUse)
    }

    // Store questions in quiz_questions when a session is available
    if (sessionIdToUse) {
      try {
        console.log(`ℹ️ [QUIZ API] Inserting ${validatedQuestions.length} questions into quiz_questions for session ${sessionIdToUse}`)
        const questionsToInsert = validatedQuestions.map((q: any, index: number) => ({
          session_id: sessionIdToUse,
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

        console.log('✅ [QUIZ API] Questions stored in database for session:', sessionIdToUse)
      } catch (error) {
        console.error('❌ [QUIZ API] Error storing questions:', error)
        throw error
      }

      // Mirror into legacy/questions table for gameplay consumers that read from it
      try {
        const adminClient = createAdminClient()
        const questionsLegacy = validatedQuestions.map((q: any, index: number) => ({
          session_id: sessionIdToUse,
          question_text: q.question,
          question_type: q.type === "multiple_choice" ? "mcq" : "short",
          correct_answer: q.type === "multiple_choice" ? (q.options?.[q.correct] || "") : (q.expected_answers?.[0] || ""),
          options: q.options || [],
          explanation: q.explanation || '',
          difficulty: difficulty || 'medium',
          points: 10,
          time_limit: 30,
          order_index: index
        }))

        const { error: legacyError } = await adminClient
          .from('questions')
          .insert(questionsLegacy)

        if (legacyError) {
          console.error('⚠️ [QUIZ API] Failed to mirror questions into questions table:', legacyError)
        } else {
          console.log('✅ [QUIZ API] Mirrored questions into questions table for session:', sessionIdToUse)
        }
      } catch (mirrorErr) {
        console.error('⚠️ [QUIZ API] Exception while mirroring questions into questions table:', mirrorErr)
      }
    } else {
      console.warn('⚠️ [QUIZ API] No session available; skipping quiz_questions insert')
    }

    // Store questions in history for deduplication (for both singleplayer and multiplayer)
    if (userId && !isAdminMode && validatedQuestions.length > 0) {
      try {
        await storeQuestionHistory(
          userId,
          documentId,
          topicHash,
          validatedQuestions.map((q: any) => ({
            question: q.question,
            type: q.type,
            options: q.options,
            correct_answer: q.type === "multiple_choice" 
              ? (q.options?.[q.correct] || q.correct)
              : (q.expected_answers?.[0] || ""),
            explanation: q.explanation,
            source_document: q.source_document
          })),
          sessionIdToUse || undefined
        )
      } catch (error) {
        console.error('❌ [QUIZ API] Error storing question history:', error)
        // Don't fail the request if history storage fails
      }
    }

    return NextResponse.json({
      success: true,
      questions: validatedQuestions,
      sessionId: sessionIdToUse || sessionId || null,
      isRedo: isRedo,
      documentId: documentId
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
