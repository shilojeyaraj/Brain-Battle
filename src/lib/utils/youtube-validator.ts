/**
 * YouTube URL Validator
 * Validates YouTube URLs and checks if videos actually exist
 */

/**
 * Validates YouTube URL format
 */
export function isValidYouTubeURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  // YouTube URL patterns
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /^https?:\/\/youtu\.be\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/i,
  ]

  return patterns.some(pattern => pattern.test(url.trim()))
}

/**
 * Extracts video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!isValidYouTubeURL(url)) {
    return null
  }

  // Extract from youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([\w-]+)/i)
  if (watchMatch) {
    return watchMatch[1]
  }

  // Extract from youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/i)
  if (shortMatch) {
    return shortMatch[1]
  }

  // Extract from youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/embed\/([\w-]+)/i)
  if (embedMatch) {
    return embedMatch[1]
  }

  // Extract from youtube.com/v/VIDEO_ID
  const vMatch = url.match(/\/v\/([\w-]+)/i)
  if (vMatch) {
    return vMatch[1]
  }

  return null
}

/**
 * Checks if a YouTube video exists by making a HEAD request to the oEmbed endpoint
 * This is a lightweight check that doesn't require the full video data
 */
export async function validateYouTubeVideo(url: string): Promise<boolean> {
  try {
    const videoId = extractYouTubeVideoId(url)
    if (!videoId) {
      return false
    }

    // Use YouTube oEmbed API to check if video exists
    // This is more reliable than checking the video URL directly
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    
    const response = await fetch(oEmbedUrl, {
      method: 'HEAD',
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    })

    // YouTube oEmbed returns 200 if video exists, 404 if it doesn't
    return response.ok
  } catch (error) {
    // If validation fails (network error, timeout, etc.), assume invalid
    console.warn('YouTube validation error:', error)
    return false
  }
}

/**
 * Validates an array of video URLs and filters out invalid ones
 */
export async function validateAndFilterVideos(videos: Array<{ url: string; [key: string]: any }>): Promise<Array<{ url: string; [key: string]: any }>> {
  if (!Array.isArray(videos)) {
    return []
  }

  const validatedVideos = await Promise.all(
    videos.map(async (video) => {
      // First check URL format
      if (!isValidYouTubeURL(video.url)) {
        console.warn(`Invalid YouTube URL format: ${video.url}`)
        return null
      }

      // Then check if video actually exists
      const isValid = await validateYouTubeVideo(video.url)
      if (!isValid) {
        console.warn(`YouTube video not found or inaccessible: ${video.url}`)
        return null
      }

      return video
    })
  )

  // Filter out null values (invalid videos)
  return validatedVideos.filter((video): video is NonNullable<typeof video> => video !== null)
}

