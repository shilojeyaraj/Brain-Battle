import { useEffect, useRef, useCallback } from 'react'

export interface CheatEvent {
  type: 'tab_switch' | 'window_blur' | 'visibility_change'
  duration: number // milliseconds
  timestamp: number
}

export interface UseAntiCheatOptions {
  isGameActive: boolean
  thresholdMs?: number // Default 2500ms (2.5 seconds)
  onCheatDetected?: (event: CheatEvent) => void
}

export function useAntiCheat({
  isGameActive,
  thresholdMs = 2500,
  onCheatDetected
}: UseAntiCheatOptions) {
  const awayStartTime = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isAway = useRef(false)

  const reportViolation = useCallback((type: CheatEvent['type'], duration: number) => {
    const event: CheatEvent = {
      type,
      duration,
      timestamp: Date.now()
    }
    
    onCheatDetected?.(event)
  }, [onCheatDetected])

  const startAwayTimer = useCallback(() => {
    if (!isGameActive || isAway.current) return
    
    awayStartTime.current = Date.now()
    isAway.current = true
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    
    // Set timer to check if away for threshold duration
    timerRef.current = setTimeout(() => {
      if (isAway.current && awayStartTime.current) {
        const duration = Date.now() - awayStartTime.current
        reportViolation('tab_switch', duration)
      }
    }, thresholdMs)
  }, [isGameActive, thresholdMs, reportViolation])

  const endAwayTimer = useCallback(() => {
    if (!isAway.current || !awayStartTime.current) return
    
    const duration = Date.now() - awayStartTime.current
    
    // Only report if away for longer than threshold
    if (duration >= thresholdMs) {
      reportViolation('tab_switch', duration)
    }
    
    // Reset state
    isAway.current = false
    awayStartTime.current = null
    
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [thresholdMs, reportViolation])

  const handleVisibilityChange = useCallback(() => {
    if (!isGameActive) return
    
    if (document.hidden) {
      startAwayTimer()
    } else {
      endAwayTimer()
    }
  }, [isGameActive, startAwayTimer, endAwayTimer])

  const handleWindowBlur = useCallback(() => {
    if (!isGameActive) return
    startAwayTimer()
  }, [isGameActive, startAwayTimer])

  const handleWindowFocus = useCallback(() => {
    if (!isGameActive) return
    endAwayTimer()
  }, [isGameActive, endAwayTimer])

  // Set up event listeners
  useEffect(() => {
    if (!isGameActive) {
      // Clean up when game is not active
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      isAway.current = false
      awayStartTime.current = null
      return
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isGameActive, handleVisibilityChange, handleWindowBlur, handleWindowFocus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    isAway: isAway.current
  }
}
