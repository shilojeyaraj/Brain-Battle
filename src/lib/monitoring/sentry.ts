/**
 * Sentry Error Tracking Setup
 * 
 * Sentry is initialized via sentry.client.config.ts, sentry.server.config.ts, and sentry.edge.config.ts
 * These files are automatically loaded by @sentry/nextjs
 * 
 * Setup:
 * 1. Get your DSN from https://sentry.io
 * 2. Add NEXT_PUBLIC_SENTRY_DSN to your .env.local
 * 3. Sentry will automatically initialize from the config files
 */

import * as Sentry from '@sentry/nextjs'

// Sentry is already initialized via config files, so we just export helper functions

// Log errors to Sentry
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    })
  } else {
    // Fallback to console in development
    console.error('Error (Sentry not configured):', error, context)
  }
}

// Log messages to Sentry
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      contexts: {
        custom: context,
      },
    })
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context)
  }
}

// Set user context
export function setUser(user: { id: string; email?: string; username?: string }) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
  }
}

// Clear user context
export function clearUser() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null)
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    })
  }
}

