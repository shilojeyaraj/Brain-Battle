"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { BrainBattleLoading } from "@/components/ui/brain-battle-loading"

const LOADING_DELAY_MS = 2000 // Show loading after 2 seconds

/**
 * Global Navigation Loading Component
 * Automatically shows a loading overlay when page transitions take more than 2 seconds
 * Works for all pages automatically by detecting pathname changes
 */
export function GlobalNavigationLoading() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showLoading, setShowLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationStartRef = useRef<number | null>(null)
  const previousPathnameRef = useRef<string | null>(null)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    // Check if pathname actually changed (not just initial mount)
    const pathnameChanged = previousPathnameRef.current !== null && 
                           previousPathnameRef.current !== pathname
    
    // Update previous pathname
    previousPathnameRef.current = pathname

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // If pathname changed, we're navigating
    if (pathnameChanged) {
      // Mark navigation as starting
      isNavigatingRef.current = true
      navigationStartRef.current = Date.now()
      setShowLoading(false)

      // Set timeout to show loading if navigation takes more than 2 seconds
      timeoutRef.current = setTimeout(() => {
        // Only show loading if we're still navigating
        if (isNavigatingRef.current) {
          setShowLoading(true)
        }
      }, LOADING_DELAY_MS)
    } else {
      // Initial mount or same pathname - check if page is still loading
      // This handles slow initial page loads
      isNavigatingRef.current = true
      navigationStartRef.current = Date.now()
      
      timeoutRef.current = setTimeout(() => {
        // Check if document is still loading or if React hasn't hydrated yet
        if (isNavigatingRef.current && (document.readyState === 'loading' || 
            typeof window !== 'undefined' && !(window as any).__NEXT_DATA__?.props?.pageProps)) {
          setShowLoading(true)
        }
      }, LOADING_DELAY_MS)
    }

    // Cleanup function - called when component updates (navigation likely complete)
    return () => {
      // Small delay before hiding to ensure smooth transition
      const hideTimeout = setTimeout(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        // Mark navigation as complete
        isNavigatingRef.current = false
        setShowLoading(false)
        
        // Log navigation time for debugging
        if (navigationStartRef.current) {
          const navigationTime = Date.now() - navigationStartRef.current
          if (navigationTime > LOADING_DELAY_MS) {
            console.log(`⏱️ [NAV] Navigation took ${navigationTime}ms (showed loading)`)
          }
        }
      }, 100)

      return () => clearTimeout(hideTimeout)
    }
  }, [pathname, searchParams])

  // Also handle page visibility changes and document ready state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check if we should show loading
        if (isNavigatingRef.current && navigationStartRef.current) {
          const elapsed = Date.now() - navigationStartRef.current
          if (elapsed > LOADING_DELAY_MS && document.readyState !== 'complete') {
            setShowLoading(true)
          }
        }
      }
    }

    const handleLoad = () => {
      // Page fully loaded, hide loading
      isNavigatingRef.current = false
      setShowLoading(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('load', handleLoad)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('load', handleLoad)
    }
  }, [])

  if (!showLoading) return null
  
  return <BrainBattleLoading message="Loading page..." />
}

