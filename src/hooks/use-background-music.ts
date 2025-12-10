"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSoundSettings } from "@/context/sound-settings"

type MusicTrack = "lobby" | "battle" | "none"

const MUSIC_URLS: Record<Exclude<MusicTrack, "none">, string> = {
  lobby: "/music/lobby.mp3",
  battle: "/music/battle.mp3",
}

const FADE_DURATION = 500 // ms for fade out

/**
 * Hook to manage background music playback
 * - Plays the specified track when mounted
 * - Loops continuously
 * - Respects musicEnabled and musicVolume from settings
 * - Fades out smoothly on unmount or track change
 * - Handles browser autoplay restrictions gracefully
 */
export function useBackgroundMusic(track: MusicTrack) {
  const { musicEnabled, musicVolume } = useSoundSettings()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeIntervalRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)

  // Clean up fade interval
  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      window.clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }
  }, [])

  // Fade out and stop audio
  const fadeOutAndStop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    clearFadeInterval()

    const startVolume = audio.volume
    const steps = 10
    const stepDuration = FADE_DURATION / steps
    const volumeStep = startVolume / steps
    let currentStep = 0

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++
      const newVolume = Math.max(0, startVolume - volumeStep * currentStep)
      audio.volume = newVolume

      if (currentStep >= steps) {
        clearFadeInterval()
        audio.pause()
        audio.currentTime = 0
        isPlayingRef.current = false
      }
    }, stepDuration)
  }, [clearFadeInterval])

  // Initialize or update audio element
  useEffect(() => {
    // If track is 'none' or music disabled, stop any playing music
    if (track === "none" || !musicEnabled) {
      if (audioRef.current && isPlayingRef.current) {
        fadeOutAndStop()
      }
      return
    }

    const url = MUSIC_URLS[track]
    
    // If we already have an audio element for this track, just update volume
    if (audioRef.current && audioRef.current.src.endsWith(url.split("/").pop() || "")) {
      audioRef.current.volume = musicVolume
      return
    }

    // Create new audio element for different track
    if (audioRef.current) {
      fadeOutAndStop()
    }

    const audio = new Audio(url)
    audio.loop = true
    audio.volume = musicVolume
    audioRef.current = audio

    // Handle autoplay restrictions - try to play, if blocked wait for user interaction
    const tryPlay = async () => {
      try {
        await audio.play()
        isPlayingRef.current = true
      } catch (error) {
        // Autoplay was blocked - set up one-time click listener to start music
        const handleUserInteraction = async () => {
          try {
            if (audioRef.current && !isPlayingRef.current) {
              await audioRef.current.play()
              isPlayingRef.current = true
            }
          } catch {
            // Still blocked, ignore
          }
          document.removeEventListener("click", handleUserInteraction)
          document.removeEventListener("keydown", handleUserInteraction)
        }
        
        document.addEventListener("click", handleUserInteraction, { once: true })
        document.addEventListener("keydown", handleUserInteraction, { once: true })
      }
    }

    tryPlay()

    // Cleanup on unmount
    return () => {
      clearFadeInterval()
      if (audio) {
        audio.pause()
        audio.src = ""
        isPlayingRef.current = false
      }
    }
  }, [track, musicEnabled, fadeOutAndStop, clearFadeInterval])

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current && musicEnabled) {
      audioRef.current.volume = musicVolume
    }
  }, [musicVolume, musicEnabled])

  // Handle music enabled toggle
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (musicEnabled && track !== "none") {
      if (!isPlayingRef.current) {
        audio.play().then(() => {
          isPlayingRef.current = true
        }).catch(() => {
          // Autoplay blocked, will play on next user interaction
        })
      }
    } else {
      if (isPlayingRef.current) {
        fadeOutAndStop()
      }
    }
  }, [musicEnabled, track, fadeOutAndStop])
}

