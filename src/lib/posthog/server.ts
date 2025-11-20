import "server-only"
import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

/**
 * Get PostHog server client (singleton)
 * Use this for server-side event tracking
 */
export function getPostHogServer(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null
  }

  if (posthogClient) {
    return posthogClient
  }

  try {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1, // Flush immediately for server-side
      flushInterval: 0,
    })

    return posthogClient
  } catch (error) {
    console.error('Failed to initialize PostHog server client:', error)
    return null
  }
}

/**
 * Track server-side events
 */
export function trackServerEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, any>
) {
  const client = getPostHogServer()
  if (!client) return

  try {
    client.capture({
      distinctId,
      event: eventName,
      properties,
    })
  } catch (error) {
    console.error('PostHog server tracking error:', error)
  }
}

/**
 * Identify user on server-side
 */
export function identifyServerUser(
  distinctId: string,
  properties?: Record<string, any>
) {
  const client = getPostHogServer()
  if (!client) return

  try {
    client.identify({
      distinctId,
      properties,
    })
  } catch (error) {
    console.error('PostHog server identify error:', error)
  }
}

