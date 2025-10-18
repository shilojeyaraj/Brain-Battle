import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const files = form.getAll("files") as File[]
    const topic = form.get("topic") as string
    const difficulty = form.get("difficulty") as string
    const instructions = form.get("instructions") as string
    const notes = form.get("notes") as string
    const studyContextStr = form.get("studyContext") as string
    let studyContext = null
    if (studyContextStr) {
      try {
        studyContext = JSON.parse(studyContextStr)
      } catch (e) {
        console.log("⚠️ [QUIZ API] Failed to parse study context:", e)
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

    if (!topic || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Topic and difficulty are required' },
        { status: 400 }
      )
    }

    // Get relevant document chunks using semantic search
    let relevantChunks = []
    try {
      const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/semantic-search?q=${encodeURIComponent(topic)}&limit=8&threshold=0.6`)
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json()
        relevantChunks = searchResult.results || []
        console.log(`Found ${relevantChunks.length} relevant document chunks for topic: ${topic}`)
        
        // Log the actual content found for debugging
        relevantChunks.forEach((chunk: any, index: number) => {
          console.log(`Chunk ${index + 1}: ${chunk.file_name} (${chunk.similarity_score?.toFixed(3)} similarity)`)
          console.log(`Content preview: ${chunk.chunk_text.substring(0, 200)}...`)
        })
      }
    } catch (error) {
      console.error('Error performing semantic search:', error)
    }

    // If no relevant chunks found, try a broader search
    if (relevantChunks.length === 0) {
      try {
        console.log('No relevant chunks found, trying broader search...')
        const broadSearchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/semantic-search?q=${encodeURIComponent(topic)}&limit=5&threshold=0.4`)
        if (broadSearchResponse.ok) {
          const broadSearchResult = await broadSearchResponse.json()
          relevantChunks = broadSearchResult.results || []
          console.log(`Found ${relevantChunks.length} chunks with broader search`)
        }
      } catch (error) {
        console.error('Error performing broad semantic search:', error)
      }
    }

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

    // Create a comprehensive prompt for quiz generation
    const prompt = `
Generate 5 quiz questions about "${topic}" with ${difficulty} difficulty level.${contextInstructions}

${complexityAnalysis ? `
COMPLEXITY ANALYSIS (use this to match question difficulty to content level):
- Education Level: ${complexityAnalysis.education_level || 'Not specified'}
- Vocabulary Level: ${complexityAnalysis.vocabulary_level || 'Not specified'}
- Concept Sophistication: ${complexityAnalysis.concept_sophistication || 'Not specified'}
- Reasoning Level Required: ${complexityAnalysis.reasoning_level || 'Not specified'}
- Prerequisite Knowledge: ${complexityAnalysis.prerequisite_knowledge?.join(', ') || 'None specified'}

IMPORTANT: Match your question complexity to the detected education level and reasoning requirements. Use vocabulary and concepts appropriate for the target audience.
` : ''}

${relevantChunks.length === 0 ? `
⚠️ WARNING: No specific document content was found for this topic. You should still try to create questions that would be relevant to the topic, but note that they cannot be based on specific document content.
` : `
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

Format the response as JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is the main process by which plants convert sunlight into energy?",
      "options": [
        "Respiration",
        "Photosynthesis", 
        "Digestion",
        "Fermentation"
      ],
      "correct": 1,
      "explanation": "Photosynthesis is the process by which plants use sunlight, carbon dioxide, and water to produce glucose and oxygen."
    },
    {
      "id": 2,
      "type": "open_ended",
      "question": "Calculate the area of a circle with radius 5 cm. Show your work.",
      "expected_answers": ["78.54", "78.5", "25π", "25*3.14"],
      "answer_format": "number",
      "hints": ["Use the formula A = πr²", "Round to 2 decimal places"],
      "explanation": "The area of a circle is calculated using A = πr². With radius 5 cm: A = π × 5² = π × 25 = 78.54 cm²"
    }
  ]
}

MANDATORY REQUIREMENTS:
- EVERY question MUST be based on the specific document content provided above
- Do NOT create generic questions about "${topic}" - use the actual content from the documents
- Test knowledge of specific facts, figures, processes, or concepts mentioned in the documents
- Questions should reference specific details, examples, or data from the document content
- Mix of question types: 2-3 multiple choice, 2-3 open-ended
- For open-ended: include calculations, word problems, or explanations based on document content
- For multiple choice: create plausible incorrect options related to the document content
- Include detailed explanations that reference the specific document content

Question type guidelines:
- Multiple choice: Test specific facts, definitions, or concepts from the documents
- Open-ended: Perfect for calculations, word problems, or explanations based on document examples

Examples of document-specific questions:
- If document mentions "The experiment showed a 15% increase in efficiency" → Ask about the specific percentage
- If document contains a formula → Ask to calculate using that specific formula
- If document describes a process → Ask about specific steps in that process
- If document mentions specific examples → Ask questions about those examples

For each question, also include a "source_document" field indicating which document the question is based on.

Generate exactly 5 questions that test knowledge of the specific document content provided.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert quiz generator who creates questions based on specific document content. You MUST generate questions that test knowledge of the actual content provided in the documents, not generic questions about the topic. Always return valid JSON. Focus on specific facts, figures, processes, and examples mentioned in the document content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    // Parse the JSON response
    let quizData
    try {
      quizData = JSON.parse(response)
    } catch (error) {
      console.error("❌ [QUIZ API] Failed to parse OpenAI response as JSON:", error)
      console.log("📄 [QUIZ API] Raw response:", response)
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
      source_document: q.source_document || "Document content"
    }))

    return NextResponse.json({
      success: true,
      questions: validatedQuestions
    })

  } catch (error) {
    console.error("Error generating quiz:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate quiz questions" 
      },
      { status: 500 }
    )
  }
}
