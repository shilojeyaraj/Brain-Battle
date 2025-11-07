"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type SoundSettings = {
  soundEnabled: boolean
  volume: number // 0..1
  reducedMotion: boolean
  setSoundEnabled: (enabled: boolean) => void
  setVolume: (vol: number) => void
  setReducedMotion: (reduced: boolean) => void
}

const SoundSettingsContext = createContext<SoundSettings | null>(null)

const STORAGE_KEYS = {
  soundEnabled: "bb.soundEnabled",
  volume: "bb.soundVolume",
  reducedMotion: "bb.reducedMotion",
}

function getSystemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !("matchMedia" in window)) return false
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

export function SoundSettingsProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [volume, setVolume] = useState<number>(0.5)
  const [reducedMotion, setReducedMotion] = useState<boolean>(false)

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const storedEnabled = localStorage.getItem(STORAGE_KEYS.soundEnabled)
      const storedVolume = localStorage.getItem(STORAGE_KEYS.volume)
      const storedReduced = localStorage.getItem(STORAGE_KEYS.reducedMotion)

      if (storedEnabled !== null) setSoundEnabled(storedEnabled === "true")
      if (storedVolume !== null) {
        const v = parseFloat(storedVolume)
        if (!Number.isNaN(v)) setVolume(Math.min(1, Math.max(0, v)))
      }
      if (storedReduced !== null) {
        setReducedMotion(storedReduced === "true")
      } else {
        setReducedMotion(getSystemPrefersReducedMotion())
      }
    } catch {
      // ignore storage errors
      setReducedMotion(getSystemPrefersReducedMotion())
    }
  }, [])

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.soundEnabled, String(soundEnabled))
    } catch {}
  }, [soundEnabled])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(volume))
    } catch {}
  }, [volume])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.reducedMotion, String(reducedMotion))
    } catch {}
  }, [reducedMotion])

  const setSoundEnabledSafe = useCallback((enabled: boolean) => {
    setSoundEnabled(Boolean(enabled))
  }, [])

  const setVolumeSafe = useCallback((vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol))
    setVolume(clamped)
  }, [])

  const setReducedMotionSafe = useCallback((reduced: boolean) => {
    setReducedMotion(Boolean(reduced))
  }, [])

  const value = useMemo<SoundSettings>(() => ({
    soundEnabled,
    volume,
    reducedMotion,
    setSoundEnabled: setSoundEnabledSafe,
    setVolume: setVolumeSafe,
    setReducedMotion: setReducedMotionSafe,
  }), [soundEnabled, volume, reducedMotion, setSoundEnabledSafe, setVolumeSafe, setReducedMotionSafe])

  return (
    <SoundSettingsContext.Provider value={value}>
      {children}
    </SoundSettingsContext.Provider>
  )
}

export function useSoundSettings(): SoundSettings {
  const ctx = useContext(SoundSettingsContext)
  if (!ctx) {
    throw new Error("useSoundSettings must be used within SoundSettingsProvider")
  }
  return ctx
}


