"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type SoundSettings = {
  // Sound effects settings
  soundEnabled: boolean
  volume: number // 0..1
  // Music settings
  musicEnabled: boolean
  musicVolume: number // 0..1
  // Motion settings
  reducedMotion: boolean
  // Setters
  setSoundEnabled: (enabled: boolean) => void
  setVolume: (vol: number) => void
  setMusicEnabled: (enabled: boolean) => void
  setMusicVolume: (vol: number) => void
  setReducedMotion: (reduced: boolean) => void
}

const SoundSettingsContext = createContext<SoundSettings | null>(null)

const STORAGE_KEYS = {
  soundEnabled: "bb.soundEnabled",
  volume: "bb.soundVolume",
  musicEnabled: "bb.musicEnabled",
  musicVolume: "bb.musicVolume",
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
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true)
  const [musicVolume, setMusicVolume] = useState<number>(0.3)
  const [reducedMotion, setReducedMotion] = useState<boolean>(false)

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const storedEnabled = localStorage.getItem(STORAGE_KEYS.soundEnabled)
      const storedVolume = localStorage.getItem(STORAGE_KEYS.volume)
      const storedMusicEnabled = localStorage.getItem(STORAGE_KEYS.musicEnabled)
      const storedMusicVolume = localStorage.getItem(STORAGE_KEYS.musicVolume)
      const storedReduced = localStorage.getItem(STORAGE_KEYS.reducedMotion)

      if (storedEnabled !== null) setSoundEnabled(storedEnabled === "true")
      if (storedVolume !== null) {
        const v = parseFloat(storedVolume)
        if (!Number.isNaN(v)) setVolume(Math.min(1, Math.max(0, v)))
      }
      if (storedMusicEnabled !== null) setMusicEnabled(storedMusicEnabled === "true")
      if (storedMusicVolume !== null) {
        const v = parseFloat(storedMusicVolume)
        if (!Number.isNaN(v)) setMusicVolume(Math.min(1, Math.max(0, v)))
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
      localStorage.setItem(STORAGE_KEYS.musicEnabled, String(musicEnabled))
    } catch {}
  }, [musicEnabled])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.musicVolume, String(musicVolume))
    } catch {}
  }, [musicVolume])

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

  const setMusicEnabledSafe = useCallback((enabled: boolean) => {
    setMusicEnabled(Boolean(enabled))
  }, [])

  const setMusicVolumeSafe = useCallback((vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol))
    setMusicVolume(clamped)
  }, [])

  const setReducedMotionSafe = useCallback((reduced: boolean) => {
    setReducedMotion(Boolean(reduced))
  }, [])

  const value = useMemo<SoundSettings>(() => ({
    soundEnabled,
    volume,
    musicEnabled,
    musicVolume,
    reducedMotion,
    setSoundEnabled: setSoundEnabledSafe,
    setVolume: setVolumeSafe,
    setMusicEnabled: setMusicEnabledSafe,
    setMusicVolume: setMusicVolumeSafe,
    setReducedMotion: setReducedMotionSafe,
  }), [soundEnabled, volume, musicEnabled, musicVolume, reducedMotion, setSoundEnabledSafe, setVolumeSafe, setMusicEnabledSafe, setMusicVolumeSafe, setReducedMotionSafe])

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
