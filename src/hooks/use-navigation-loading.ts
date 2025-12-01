/**
 * Hook to show a loading overlay when navigation takes more than a couple seconds
 * Provides visual feedback to users that the app is working during slow transitions
 */

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

const LOADING_DELAY_MS = 2000 // Show loading after 2 seconds

export function useNavigationLoading(isNavigating: boolean) {
  const [showLoading, setShowLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Reset loading state when pathname changes (navigation completed)
    if (!isNavigating) {
      setShowLoading(false)
      return
    }

    // If navigation is in progress, set a timeout to show loading
    if (isNavigating) {
      timeoutRef.current = setTimeout(() => {
        setShowLoading(true)
      }, LOADING_DELAY_MS)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isNavigating, pathname])

  return showLoading
}

