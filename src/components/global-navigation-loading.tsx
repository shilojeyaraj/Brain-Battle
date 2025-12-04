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
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Check if pathname actually changed (not just initial mount)
    const pathnameChanged = previousPathnameRef.current !== null && 
                           previousPathnameRef.current !== pathname
    
    // Update previous pathname
    previousPathnameRef.current = pathname

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Hide loading immediately when pathname changes (navigation started)
    setShowLoading(false)
    isNavigatingRef.current = false

    // If pathname changed, we're navigating
    if (pathnameChanged) {
      // Mark navigation as starting
      isNavigatingRef.current = true
      navigationStartRef.current = Date.now()

      // Set timeout to show loading if navigation takes more than 2 seconds
      timeoutRef.current = setTimeout(() => {
        // Only show loading if we're still navigating and document is still loading
        if (isNavigatingRef.current && document.readyState !== 'complete') {
          setShowLoading(true)
        }
      }, LOADING_DELAY_MS)
    }

    // Cleanup function - called when component updates (navigation likely complete)
    return () => {
      // Clear timeout immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      // Mark navigation as complete after a small delay
      hideTimeoutRef.current = setTimeout(() => {
        // Mark navigation as complete
        isNavigatingRef.current = false
        setShowLoading(false)
      }, 100)
    }
  }, [pathname, searchParams])

  // Handle document ready state changes
  useEffect(() => {
    const handleLoad = () => {
      // Page fully loaded, hide loading immediately
      isNavigatingRef.current = false
      setShowLoading(false)
    }

    // If document is already complete, don't show loading
    if (document.readyState === 'complete') {
      isNavigatingRef.current = false
      setShowLoading(false)
    }

    window.addEventListener('load', handleLoad)
    
    return () => {
      window.removeEventListener('load', handleLoad)
    }
  }, [])

  // Don't render anything if not loading
  if (!showLoading) return null
  
  // Render as fixed overlay to prevent it from appearing in document flow
  return (
    <div className="fixed inset-0 z-[9999]">
      <BrainBattleLoading message="Loading page..." />
    </div>
  )
}

