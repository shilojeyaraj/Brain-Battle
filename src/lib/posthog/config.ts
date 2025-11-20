import posthog from 'posthog-js'

export const posthogEnabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY

export function initPostHog() {
  if (!posthogEnabled || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return
  }

  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: posthogHost,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ PostHog initialized')
      }
    },
    // Capture pageviews automatically
    capture_pageview: false, // We'll handle this manually for better control
    capture_pageleave: true,
    // Enable session recording (optional)
    session_recording: {
      recordCrossOriginIframes: false,
    },
    // Privacy settings
    respect_dnt: true, // Respect Do Not Track
  })

  return posthog
}

