"use server"

import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateQuizQuestions(
  topic: string,
  difficulty: "easy" | "medium" | "hard",
  fileContent?: string
) {
  try {
    // Create a prompt for AI question generation
    const prompt = `
Generate 5 multiple choice quiz questions about "${topic}" with ${difficulty} difficulty level.

${fileContent ? `Use the following content as reference:\n\n${fileContent}\n\n` : ''}

For each question, provide:
1. The question text
2. 4 multiple choice options (A, B, C, D)
3. The correct answer (A, B, C, or D)
4. A brief explanation

Format the response as JSON:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Explanation of the correct answer"
    }
  ]
}

Make sure the questions are:
- Relevant to the topic
- Appropriate for ${difficulty} difficulty
- Clear and unambiguous
- Educational and informative
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert quiz generator. Create educational multiple choice questions that test understanding and knowledge."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
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
      console.error("❌ [QUIZ GENERATION] Failed to parse OpenAI response as JSON:", error)
      console.log("📄 [QUIZ GENERATION] Raw response:", response)
      throw new Error("Failed to parse quiz data from OpenAI")
    }
    
    // Validate the response structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid response format from OpenAI")
    }

    return {
      success: true,
      questions: quizData.questions
    }

  } catch (error) {
    console.error("Error generating quiz questions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate questions"
    }
  }
}

export async function uploadFile(file: File, userId: string) {
  try {
    const supabase = await createClient()
    
    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    return {
      success: true,
      filePath: data.path,
      fileName: file.name
    }

  } catch (error) {
    console.error("Error uploading file:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed"
    }
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  try {
    if (file.type === 'text/plain') {
      return await file.text()
    }
    
    if (file.type === 'application/pdf') {
      // For PDFs, we'll use the new API endpoint that handles file processing
      const formData = new FormData()
      formData.append('files', file)
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      if (result.success) {
        // Return a summary of the content for quiz generation
        return `Document content: ${result.notes.title}\n\nOutline: ${result.notes.outline.join('\n')}\n\nKey terms: ${result.notes.key_terms.join(', ')}`
      }
    }
    
    // For other file types, return a placeholder
    return `Content from ${file.name} - This would be extracted text in a full implementation`
    
  } catch (error) {
    console.error("Error extracting text:", error)
    return ""
  }
}
