"use server"

/**
 * Tavily Web Search Client
 *
 * Used to fetch high-quality, topic-specific resources (especially YouTube videos)
 * to enrich study notes.
 *
 * Env:
 * - TAVILY_API_KEY: your Tavily search API key
 */

interface TavilySearchResult {
  title: string
  url: string
  content: string
  score?: number
}

interface TavilySearchResponse {
  results?: TavilySearchResult[]
}

interface YouTubeVideoResource {
  title: string
  url: string
  description: string
  duration: string
  platform: string
  relevance: "high" | "medium" | "low"
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search"

function hasTavilyKey(): boolean {
  return !!process.env.TAVILY_API_KEY
}

/**
 * Search for YouTube videos related to specific concepts from study notes using Tavily.
 *
 * This creates targeted searches based on actual content from the notes, not just generic topics.
 */
export async function searchYouTubeVideosForTopic(
  topic: string,
  educationLevel?: string,
  specificConcepts?: string[]
): Promise<YouTubeVideoResource[]> {
  if (!hasTavilyKey()) {
    console.warn("[TAVILY] TAVILY_API_KEY not set. Skipping YouTube enrichment.")
    return []
  }

  // If we have specific concepts, search for videos on those concepts
  // Otherwise, fall back to topic-based search
  const searchQueries: string[] = []
  
  if (specificConcepts && specificConcepts.length > 0) {
    // Use the first 3-4 most specific concepts for targeted searches
    const conceptsToSearch = specificConcepts.slice(0, 4)
    for (const concept of conceptsToSearch) {
      if (concept && concept.trim().length > 0) {
        const queryParts = [concept.trim(), "YouTube tutorial explanation"]
        if (educationLevel) {
          queryParts.push(educationLevel.replace(/_/g, " "))
        }
        searchQueries.push(queryParts.join(" ").trim())
      }
    }
  }
  
  // If no specific concepts or we need more results, add a topic-based search
  if (searchQueries.length === 0 || searchQueries.length < 3) {
    const queryParts = [topic.trim(), "YouTube explanation video"]
    if (educationLevel) {
      queryParts.push(educationLevel.replace(/_/g, " "))
    }
    searchQueries.push(queryParts.join(" ").trim())
  }

  try {
    // Search for videos using each query and combine results
    const allVideos: YouTubeVideoResource[] = []
    const seenUrls = new Set<string>()
    
    for (const query of searchQueries) {
      try {
        const response = await fetch(TAVILY_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query,
            search_depth: "basic",
            include_answer: false,
            max_results: 3, // Get 2-3 results per query
            include_domains: ["youtube.com"],
          }),
        })

        if (!response.ok) {
          console.warn(`[TAVILY] API error for query "${query}":`, response.status, response.statusText)
          continue
        }

        const data = (await response.json()) as TavilySearchResponse
        const results = Array.isArray(data.results) ? data.results : []

        // Map results into our StudyNotes videos schema shape
        const videos = results
          .filter((r) => typeof r.url === "string" && r.url.includes("youtube.com"))
          .map((r) => {
            // Extract video ID for deduplication
            const url = r.url
            const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
            const videoId = videoIdMatch ? videoIdMatch[1] : url
            
            if (seenUrls.has(videoId)) {
              return null
            }
            seenUrls.add(videoId)
            
            return {
              title: r.title || query,
              url: r.url,
              description: r.content || `YouTube video about ${query}`,
              duration: "", // we don't have this from Tavily; left empty
              platform: "YouTube",
              relevance: "high" as const,
            }
          })
          .filter((v: YouTubeVideoResource | null): v is YouTubeVideoResource => v !== null) as YouTubeVideoResource[]
        
        allVideos.push(...videos)
      } catch (queryError) {
        console.warn(`[TAVILY] Error searching for query "${query}":`, queryError)
        continue
      }
    }

    // Return top 5-6 most relevant videos (deduplicated)
    return allVideos.slice(0, 6)
  } catch (error) {
    console.error("[TAVILY] Error while searching for YouTube videos:", error)
    return []
  }
}

export type { YouTubeVideoResource }


