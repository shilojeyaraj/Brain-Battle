import posthog from 'posthog-js'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ PostHog initialized')
      }
    },
    // Automatically capture pageviews
    capture_pageview: true,
    capture_pageleave: true,
    // Session recording (optional - can be disabled)
    session_recording: {
      recordCrossOriginIframes: false,
    },
    // Privacy settings
    respect_dnt: true,
  })
}

// Export posthog for manual event tracking
export { posthog }

