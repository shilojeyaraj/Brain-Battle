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
 * Search for YouTube videos related to a given topic using Tavily.
 *
 * This is intentionally conservative: we only look at a few top results
 * and filter for youtube.com URLs.
 */
export async function searchYouTubeVideosForTopic(
  topic: string,
  educationLevel?: string
): Promise<YouTubeVideoResource[]> {
  if (!hasTavilyKey()) {
    console.warn("[TAVILY] TAVILY_API_KEY not set. Skipping YouTube enrichment.")
    return []
  }

  const queryParts = [topic.trim(), "YouTube explanation video"]
  if (educationLevel) {
    queryParts.push(educationLevel.replace(/_/g, " "))
  }
  const query = queryParts.join(" ").trim()

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
        max_results: 6,
        include_domains: ["youtube.com"],
      }),
    })

    if (!response.ok) {
      console.warn("[TAVILY] API error for YouTube search:", response.status, response.statusText)
      return []
    }

    const data = (await response.json()) as TavilySearchResponse
    const results = Array.isArray(data.results) ? data.results : []

    // Map results into our StudyNotes videos schema shape
    const videos: YouTubeVideoResource[] = results
      .filter((r) => typeof r.url === "string" && r.url.includes("youtube.com"))
      .slice(0, 3) // keep top 3
      .map((r) => ({
        title: r.title || topic,
        url: r.url,
        description: r.content || `YouTube video related to ${topic}`,
        duration: "", // we don't have this from Tavily; left empty
        platform: "YouTube",
        relevance: "high" as const,
      }))

    return videos
  } catch (error) {
    console.error("[TAVILY] Error while searching for YouTube videos:", error)
    return []
  }
}

export type { YouTubeVideoResource }


