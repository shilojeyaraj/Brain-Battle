/**
 * Parallel Enrichment Utilities
 * Helper functions for parallelizing note generation enrichment operations
 */

import { validateAndFilterVideos } from "@/lib/utils/youtube-validator"
import { searchYouTubeVideosForTopic } from "@/lib/web/tavily-client"

/**
 * Enriches a single diagram with web image if needed
 * This allows parallel processing of multiple diagrams
 */
export async function enrichSingleDiagram(
  diagram: { source: string; keywords?: string[]; image_url?: string; credit?: string; [key: string]: any },
  index: number,
  total: number
): Promise<typeof diagram> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`    📊 [IMAGE ENRICHMENT] Processing diagram ${index + 1}/${total}: ${(diagram as any).title || 'Untitled'}`)
    console.log(`      - Source: ${diagram.source}`)
    console.log(`      - Keywords: ${diagram.keywords?.join(', ') || 'None'}`)
  }
  
  if (diagram.source === "web" && diagram.keywords && !diagram.image_url) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`      🌐 [IMAGE ENRICHMENT] Fetching web image for: ${diagram.keywords.join(' ')}`)
      }
      
      // Use Unsplash API for high-quality images
      const searchQuery = `${diagram.keywords.join(" ")} educational diagram academic`
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`      🔍 [IMAGE ENRICHMENT] Enhanced search query: ${searchQuery}`)
      }
      
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&client_id=${process.env.UNSPLASH_ACCESS_KEY}`,
        {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const image = data.results[0]
          diagram.image_url = image.urls.regular
          diagram.credit = `Unsplash: ${image.user.name}`
          if (process.env.NODE_ENV === 'development') {
            console.log(`      ✅ [IMAGE ENRICHMENT] Found image: ${image.urls.regular}`)
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`      ⚠️ [IMAGE ENRICHMENT] No images found for: ${searchQuery}`)
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`      ❌ [IMAGE ENRICHMENT] API error: ${response.status} ${response.statusText}`)
        }
      }
    } catch (error) {
      // Don't fail the entire operation if one image fetch fails
      if (process.env.NODE_ENV === 'development') {
        console.error(`      ❌ [IMAGE ENRICHMENT] Error fetching web image:`, error)
      }
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log(`      ℹ️ [IMAGE ENRICHMENT] Skipping (not web source, no keywords, or already has image)`)
    }
  }
  
  return diagram
}

/**
 * Enriches diagrams with web images in parallel
 * Processes multiple diagrams concurrently for better performance
 */
export async function enrichDiagramsWithWebImages(
  diagrams: { source: string; keywords?: string[]; image_url?: string; credit?: string; [key: string]: any }[]
): Promise<typeof diagrams> {
  if (!diagrams || diagrams.length === 0) {
    return diagrams
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`  🔍 [IMAGE ENRICHMENT] Processing ${diagrams.length} diagrams in parallel...`)
  }

  try {
    // Process all diagrams in parallel
    const enrichedDiagrams = await Promise.allSettled(
      diagrams.map((diagram, index) => enrichSingleDiagram(diagram, index, diagrams.length))
    )

    // Extract successful results and log failures
    const results = enrichedDiagrams.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error(`  ❌ [IMAGE ENRICHMENT] Failed to enrich diagram ${index + 1}:`, result.reason)
        }
        // Return original diagram if enrichment failed
        return diagrams[index]
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`  ✅ [IMAGE ENRICHMENT] Completed processing ${results.length} diagrams`)
    }

    return results
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`  ❌ [IMAGE ENRICHMENT] Error in parallel enrichment:`, error)
    }
    // Return original diagrams if parallel processing fails
    return diagrams
  }
}

/**
 * Extracts concepts from notes data for video search
 * Helper to prepare video search parameters
 */
export function extractConceptsForVideoSearch(notesData: {
  title?: string
  key_terms?: any[]
  concepts?: any[]
  outline?: any[]
}): string[] {
  const specificConcepts: string[] = []
  
  // Add key terms (these are usually the most specific)
  if (Array.isArray(notesData.key_terms) && notesData.key_terms.length > 0) {
    specificConcepts.push(...notesData.key_terms.slice(0, 5).map((term: any) => {
      if (typeof term === 'string') return term
      if (term && typeof term === 'object' && term.term) return term.term
      return null
    }).filter((t: string | null): t is string => t !== null && t.trim().length > 0))
  }
  
  // Add concept names (these are usually detailed topics)
  if (Array.isArray(notesData.concepts) && notesData.concepts.length > 0) {
    specificConcepts.push(...notesData.concepts.slice(0, 3).map((concept: any) => {
      if (typeof concept === 'string') return concept
      if (concept && typeof concept === 'object' && concept.name) return concept.name
      if (concept && typeof concept === 'object' && concept.topic) return concept.topic
      return null
    }).filter((c: string | null): c is string => c !== null && c.trim().length > 0))
  }
  
  // Add outline items that are specific (not generic)
  if (Array.isArray(notesData.outline) && notesData.outline.length > 0) {
    const outlineItems = notesData.outline
      .slice(0, 4)
      .map((item: any) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && item.title) return item.title
        if (item && typeof item === 'object' && item.topic) return item.topic
        return null
      })
      .filter((o: string | null): o is string => o !== null && o.trim().length > 0 && o.length < 100)
    
    specificConcepts.push(...outlineItems)
  }
  
  // Remove duplicates and limit to most relevant
  const uniqueConcepts = Array.from(new Set(specificConcepts.map(c => c.trim().toLowerCase())))
    .slice(0, 5) // Keep top 5 unique concepts
    .map(lower => {
      // Find original case version
      return specificConcepts.find(c => c.trim().toLowerCase() === lower) || lower
    })
  
  return uniqueConcepts
}

/**
 * Enriches notes with YouTube videos
 * Handles video search, merging, and validation
 */
export async function enrichWithYouTubeVideos(
  notesData: {
    title?: string
    education_level?: string
    resources?: { videos?: any[] }
    key_terms?: any[]
    concepts?: any[]
    outline?: any[]
  },
  topicForVideos: string,
  fileNames: string[]
): Promise<{ videos: any[] }> {
  try {
    const educationHint = (notesData.education_level || "") as string
    const specificConcepts = extractConceptsForVideoSearch(notesData)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  📚 [VIDEO ENRICHMENT] Extracted ${specificConcepts.length} specific concepts for video search:`)
      specificConcepts.forEach((concept, idx) => {
        console.log(`    ${idx + 1}. ${concept}`)
      })
    }
    
    // Search for videos using Tavily
    const newVideos = await searchYouTubeVideosForTopic(
      topicForVideos,
      educationHint,
      specificConcepts.length > 0 ? specificConcepts : undefined
    )
    
    if (newVideos.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`  📹 [VIDEO ENRICHMENT] Tavily suggested ${newVideos.length} YouTube video(s) for topic: "${topicForVideos}"`)
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ℹ️ [VIDEO ENRICHMENT] No additional YouTube videos returned from Tavily for topic: "${topicForVideos}"`)
      }
    }

    const existingVideos = Array.isArray(notesData.resources?.videos)
      ? notesData.resources.videos
      : []

    // Merge existing and new videos, preferring existing entries for duplicate URLs
    const mergedByUrl = new Map<string, any>()
    for (const v of existingVideos) {
      if (v?.url) mergedByUrl.set(v.url, v)
    }
    for (const v of newVideos) {
      if (v?.url && !mergedByUrl.has(v.url)) {
        mergedByUrl.set(v.url, v)
      }
    }

    const mergedVideos = Array.from(mergedByUrl.values())
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  📹 [VIDEO ENRICHMENT] Total videos before validation: ${mergedVideos.length}`)
    }

    // Validate videos in parallel (already parallelized in validateAndFilterVideos)
    if (mergedVideos.length > 0) {
      const validatedVideos = await validateAndFilterVideos(mergedVideos)
      const removedCount = mergedVideos.length - validatedVideos.length

      if (removedCount > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  ⚠️ [VIDEO ENRICHMENT] Removed ${removedCount} invalid or inaccessible video(s) after validation`)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  ✅ [VIDEO ENRICHMENT] All ${validatedVideos.length} video(s) are valid`)
        }
      }

      return { videos: validatedVideos }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ℹ️ [VIDEO ENRICHMENT] No videos to validate after merging`)
      }
      return { videos: [] }
    }
  } catch (error) {
    console.error(`  ❌ [VIDEO ENRICHMENT] Error enriching or validating YouTube videos:`, error)
    // Return empty videos array on error
    return { videos: notesData.resources?.videos || [] }
  }
}

/**
 * Generates embeddings for semantic search
 * Can be run in parallel with other enrichment operations
 */
export async function generateEmbeddingsForNotes(
  fileContents: string[],
  fileNames: string[],
  userId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const combinedText = fileContents.join('\n\n')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  🌐 [EMBEDDINGS] Using base URL: ${baseUrl}`)
      console.log(`  🔧 [EMBEDDINGS] Environment check: VERCEL_URL=${process.env.VERCEL_URL}, NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL}`)
    }
    
    const embeddingResponse = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: combinedText,
        fileName: fileNames.join(', '),
        fileType: 'study_notes',
        userId: userId
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (embeddingResponse.ok) {
      const embeddingResult = await embeddingResponse.json()
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [EMBEDDINGS] Embeddings generated successfully`)
        console.log(`  - Chunks processed: ${embeddingResult.chunksProcessed}`)
        console.log(`  - Subject tags: ${embeddingResult.metadata?.subjectTags?.join(', ') || 'None'}`)
        console.log(`  - Course topics: ${embeddingResult.metadata?.courseTopics?.join(', ') || 'None'}`)
        console.log(`  - Difficulty: ${embeddingResult.metadata?.difficultyLevel || 'Unknown'}`)
      }
      return { success: true, result: embeddingResult }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ [EMBEDDINGS] Failed to generate embeddings: ${embeddingResponse.status}`)
      }
      return { success: false, error: `HTTP ${embeddingResponse.status}` }
    }
  } catch (error) {
    console.error(`❌ [EMBEDDINGS] Error generating embeddings:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

