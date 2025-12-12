// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// Disable Sentry during build to prevent Html import errors
if (process.env.NEXT_PHASE === 'phase-production-build') {
  // Skip Sentry initialization during build
  // This prevents Sentry from importing Html from next/document during prerendering
} else {
  // Normal Sentry initialization
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === 'development',

    environment: process.env.NODE_ENV || 'development',

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request) {
        delete event.request.headers?.['authorization']
        delete event.request.headers?.['cookie']
      }
      return event
    },
  })
}
