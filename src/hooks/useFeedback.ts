"use client"

import { useCallback, useMemo } from "react"
import useSound from "use-sound"
import { useSoundSettings } from "@/context/sound-settings"

type ConfettiOptions = {
  particleCount?: number
  spread?: number
  startVelocity?: number
  scalar?: number
  colors?: string[]
}

function playBeepFallback(volume: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = "sine"
    o.frequency.value = 880
    g.gain.value = volume * 0.1
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => {
      o.stop()
      o.disconnect()
      g.disconnect()
      ctx.close()
    }, 120)
  } catch {
    // ignore
  }
}

export function useFeedback() {
  const { soundEnabled, volume, reducedMotion } = useSoundSettings()

  // Use URL paths so assets can live in /public/sounds without bundler imports
  const soundUrls = useMemo(() => ({
    click: "/sounds/click.mp3",
    correct: "/sounds/correct.mp3",
    wrong: "/sounds/wrong.mp3",
    levelup: "/sounds/level-up.mp3",
    streak: "/sounds/streak.mp3",
  }), [])

  const soundOptions = useMemo(() => ({
    volume: Math.min(1, Math.max(0, volume)),
    soundEnabled,
    interrupt: true,
  }), [volume, soundEnabled])

  // Initialize sounds
  const [playClickRaw] = useSound(soundUrls.click, soundOptions)
  const [playCorrectRaw] = useSound(soundUrls.correct, soundOptions)
  const [playWrongRaw] = useSound(soundUrls.wrong, soundOptions)
  const [playLevelUpRaw] = useSound(soundUrls.levelup, soundOptions)
  const [playStreakRaw] = useSound(soundUrls.streak, soundOptions)

  // Safe wrappers honoring settings and fallbacks
  const playClick = useCallback(() => {
    if (!soundEnabled) return
    try { playClickRaw() } catch { playBeepFallback(volume) }
  }, [playClickRaw, soundEnabled, volume])

  const playCorrect = useCallback(() => {
    if (!soundEnabled) return
    try { playCorrectRaw() } catch { playBeepFallback(volume) }
  }, [playCorrectRaw, soundEnabled, volume])

  const playWrong = useCallback(() => {
    if (!soundEnabled) return
    try { playWrongRaw() } catch { playBeepFallback(volume) }
  }, [playWrongRaw, soundEnabled, volume])

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return
    try { playLevelUpRaw() } catch { playBeepFallback(volume) }
  }, [playLevelUpRaw, soundEnabled, volume])

  const playStreak = useCallback(() => {
    if (!soundEnabled) return
    try { playStreakRaw() } catch { playBeepFallback(volume) }
  }, [playStreakRaw, soundEnabled, volume])

  const burstConfetti = useCallback(async (opts: ConfettiOptions = {}) => {
    if (reducedMotion) return
    try {
      const confetti = (await import("canvas-confetti")).default
      confetti({
        particleCount: opts.particleCount ?? 80,
        spread: opts.spread ?? 60,
        startVelocity: opts.startVelocity ?? 35,
        scalar: opts.scalar ?? 1,
        colors: opts.colors,
        origin: { y: 0.6 },
      })
    } catch {
      // ignore if not supported
    }
  }, [reducedMotion])

  return {
    playClick,
    playCorrect,
    playWrong,
    playLevelUp,
    playStreak,
    burstConfetti,
  }
}


