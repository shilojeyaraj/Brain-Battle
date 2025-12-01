import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MoonshotClient } from '@/lib/ai/moonshot-client'

const moonshotClient = new MoonshotClient()

export async function POST(request: NextRequest) {
  try {
    const { query, userId, limit = 10, threshold = 0.7 } = await request.json()

    if (!query || !userId) {
      return NextResponse.json(
        { success: false, error: 'Query and userId are required' },
        { status: 400 }
      )
    }

    // Generate embedding for the search query
    const embeddings = await moonshotClient.createEmbeddings([query], "text-embedding-3-small")
    const queryEmbedding = embeddings[0]

    // Search for similar documents using pgvector
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('search_documents_by_similarity', {
      query_embedding: queryEmbedding,
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

    // Group results by document
    const documentGroups = new Map()
    data.forEach((result: any) => {
      const fileName = result.file_name
      if (!documentGroups.has(fileName)) {
        documentGroups.set(fileName, {
          file_name: fileName,
          chunks: [],
          max_similarity: 0,
          subject_tags: new Set(),
          course_topics: new Set(),
          difficulty_levels: new Set()
        })
      }
      
      const group = documentGroups.get(fileName)
      group.chunks.push({
        chunk_text: result.chunk_text,
        similarity_score: result.similarity_score,
        chunk_metadata: result.chunk_metadata
      })
      group.max_similarity = Math.max(group.max_similarity, result.similarity_score)
      
      if (result.subject_tags) {
        result.subject_tags.forEach((tag: string) => group.subject_tags.add(tag))
      }
      if (result.course_topics) {
        result.course_topics.forEach((topic: string) => group.course_topics.add(topic))
      }
      if (result.difficulty_level) {
        group.difficulty_levels.add(result.difficulty_level)
      }
    })

    // Convert to array and format results
    const results = Array.from(documentGroups.values()).map(group => ({
      file_name: group.file_name,
      relevance_score: group.max_similarity,
      chunks_found: group.chunks.length,
      subject_tags: Array.from(group.subject_tags),
      course_topics: Array.from(group.course_topics),
      difficulty_levels: Array.from(group.difficulty_levels),
      chunks: group.chunks.sort((a: any, b: any) => b.similarity_score - a.similarity_score)
    })).sort((a, b) => b.relevance_score - a.relevance_score)

    return NextResponse.json({
      success: true,
      query: query,
      results: results,
      total_documents: results.length,
      total_chunks: data.length
    })

  } catch (error) {
    console.error('Error in semantic search:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const topic = searchParams.get('topic')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get document statistics
    const { data: stats, error: statsError } = await supabase.rpc('get_document_statistics', {
      user_id_param: userId
    })

    if (statsError) {
      console.error('Error getting document statistics:', statsError)
      return NextResponse.json(
        { success: false, error: 'Failed to get document statistics' },
        { status: 500 }
      )
    }

    // If topic is provided, find similar documents
    let similarDocuments = []
    if (topic) {
      const { data: similar, error: similarError } = await supabase.rpc('find_similar_documents_by_topic', {
        topic_query: topic,
        user_id_param: userId,
        max_results: 5
      })

      if (!similarError) {
        similarDocuments = similar
      }
    }

    return NextResponse.json({
      success: true,
      statistics: stats[0] || {
        total_documents: 0,
        total_chunks: 0,
        subjects: [],
        topics: [],
        file_types: []
      },
      similar_documents: similarDocuments
    })

  } catch (error) {
    console.error('Error in semantic search GET:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
