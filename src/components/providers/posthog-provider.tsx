"use client"

/**
 * PostHog Provider - Simplified for Next.js 15.3+
 * PostHog is now initialized via instrumentation-client.ts
 * This provider is kept for backwards compatibility and manual event tracking
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // PostHog is automatically initialized via instrumentation-client.ts
  // No need to manually initialize here
  return <>{children}</>
}

