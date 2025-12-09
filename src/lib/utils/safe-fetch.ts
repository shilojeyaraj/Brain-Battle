/**
 * Safe fetch utility that handles JSON parsing errors
 * Prevents "Unexpected token '<'" errors when API returns HTML instead of JSON
 */

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null; response: Response }> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: options?.credentials || 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    // Check if response is actually JSON (not HTML 404 page)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error(`❌ [SAFE FETCH] Non-JSON response from ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        contentType,
        preview: text.substring(0, 100),
      })
      
      return {
        data: null,
        error: `Server returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType}`,
        response,
      }
    }

    const data = await response.json()
    return { data, error: null, response }
  } catch (error) {
    console.error(`❌ [SAFE FETCH] Error fetching ${url}:`, error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: null as any,
    }
  }
}

