import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Function to chunk text into smaller pieces for embedding
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  let start = 0
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentence = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastSentence, lastNewline)
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }
    
    chunks.push(chunk.trim())
    start = Math.max(start + chunk.length - overlap, start + 1)
  }
  
  return chunks.filter(chunk => chunk.length > 50) // Filter out very small chunks
}

// Function to generate embeddings for text chunks
async function generateEmbeddings(textChunks: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // More cost-effective than ada-002
      input: textChunks,
    })
    
    return response.data.map(item => item.embedding)
  } catch (error) {
    console.error('Error generating embeddings:', error)
    throw new Error('Failed to generate embeddings')
  }
}

// Function to analyze text and extract metadata
async function analyzeTextContent(text: string): Promise<{
  subjectTags: string[]
  courseTopics: string[]
  difficultyLevel: string
}> {
  try {
    const prompt = `
Analyze the following text and extract:
1. Subject tags (e.g., "mathematics", "biology", "history", "physics")
2. Course topics (e.g., "calculus", "photosynthesis", "world war ii", "thermodynamics")
3. Difficulty level ("beginner", "intermediate", "advanced")

Text: ${text.slice(0, 2000)}...

Return as JSON:
{
  "subjectTags": ["tag1", "tag2"],
  "courseTopics": ["topic1", "topic2"],
  "difficultyLevel": "intermediate"
}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing educational content. Extract relevant metadata from academic text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    const analysis = JSON.parse(response)
    return {
      subjectTags: analysis.subjectTags || [],
      courseTopics: analysis.courseTopics || [],
      difficultyLevel: analysis.difficultyLevel || "intermediate"
    }
  } catch (error) {
    console.error('Error analyzing text:', error)
    return {
      subjectTags: [],
      courseTopics: [],
      difficultyLevel: "intermediate"
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, fileName, fileType, userId } = await request.json()

    if (!text || !fileName || !fileType || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Chunk the text
    const textChunks = chunkText(text)
    
    if (textChunks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid text chunks found' },
        { status: 400 }
      )
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(textChunks)
    
    // Analyze the first chunk to get metadata
    const metadata = await analyzeTextContent(textChunks[0])

    // Store embeddings in database
    const supabase = await createClient()
    
    const embeddingRecords = textChunks.map((chunk, index) => ({
      user_id: userId,
      file_name: fileName,
      file_type: fileType,
      chunk_index: index,
      chunk_text: chunk,
      chunk_metadata: {
        chunk_length: chunk.length,
        total_chunks: textChunks.length,
        ...metadata
      },
      embedding: embeddings[index],
      subject_tags: metadata.subjectTags,
      course_topics: metadata.courseTopics,
      difficulty_level: metadata.difficultyLevel
    }))

    const { data, error } = await supabase
      .from('document_embeddings')
      .insert(embeddingRecords)

    if (error) {
      console.error('Error storing embeddings:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to store embeddings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chunksProcessed: textChunks.length,
      metadata: metadata,
      message: 'Embeddings generated and stored successfully'
    })

  } catch (error) {
    console.error('Error in embeddings API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint for semantic search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const threshold = parseFloat(searchParams.get('threshold') || '0.7')

    if (!query || !userId) {
      return NextResponse.json(
        { success: false, error: 'Query and userId are required' },
        { status: 400 }
      )
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbeddings([query])
    
    // Search for similar documents
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('search_documents_by_similarity', {
      query_embedding: queryEmbedding[0],
      user_id_param: userId,
      similarity_threshold: threshold,
      max_results: limit
    })

    if (error) {
      console.error('Error searching embeddings:', error)
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results: data,
      query: query
    })

  } catch (error) {
    console.error('Error in embeddings search:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
