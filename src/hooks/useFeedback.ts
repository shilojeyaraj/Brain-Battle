"use client"

import { useCallback, useMemo, useRef } from "react"
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
    click: "/sounds/click.ogg",
    correct: "/sounds/correct.ogg",
    wrong: "/sounds/wrong.ogg",
    levelup: "/sounds/level-up.ogg",
    streak: "/sounds/streak.ogg",
  }), [])

  // Extended SFX registry for infrequent/auxiliary sounds
  type SfxKey =
    | "hover"
    | "select"
    | "back"
    | "toggle-on"
    | "toggle-off"
    | "modal-open"
    | "modal-close"
    | "soft-impact"
    | "hard-impact"
    | "error"
    | "countdown-tick"
    | "countdown-final"
    | "time-up"
    | "power-up"
    | "power-down"
    | "combo-up"
    | "streak-break"
    | "win"
    | "lose"
    | "draw"
    | "rank-up"
    | "achievement"
    | "coin"
    | "purchase-confirm"
    | "purchase-fail"
    | "save"
    | "network-error"

  const sfxUrlByKey: Record<SfxKey, string> = useMemo(() => ({
    "hover": "/sounds/hover.ogg",
    "select": "/sounds/select.ogg",
    "back": "/sounds/back.ogg",
    "toggle-on": "/sounds/toggle-on.ogg",
    "toggle-off": "/sounds/toggle-off.ogg",
    "modal-open": "/sounds/modal-open.ogg",
    "modal-close": "/sounds/modal-close.ogg",
    "soft-impact": "/sounds/soft-impact.ogg",
    "hard-impact": "/sounds/hard-impact.ogg",
    "error": "/sounds/error.ogg",
    "countdown-tick": "/sounds/countdown-tick.ogg",
    "countdown-final": "/sounds/countdown-final.ogg",
    "time-up": "/sounds/time-up.ogg",
    "power-up": "/sounds/power-up.ogg",
    "power-down": "/sounds/power-down.ogg",
    "combo-up": "/sounds/combo-up.ogg",
    "streak-break": "/sounds/streak-break.ogg",
    "win": "/sounds/win.ogg",
    "lose": "/sounds/lose.ogg",
    "draw": "/sounds/draw.ogg",
    "rank-up": "/sounds/rank-up.ogg",
    "achievement": "/sounds/achievement.ogg",
    "coin": "/sounds/coin.ogg",
    "purchase-confirm": "/sounds/purchase-confirm.ogg",
    "purchase-fail": "/sounds/purchase-fail.ogg",
    "save": "/sounds/save.ogg",
    "network-error": "/sounds/network-error.ogg",
  }), [])

  // Simple cache to avoid creating too many Audio objects simultaneously
  const lastPlayRef = useRef<Record<string, number>>({})

  const playSfx = useCallback((name: SfxKey) => {
    if (!soundEnabled) return
    try {
      const now = Date.now()
      const last = lastPlayRef.current[name] || 0
      // basic de-dupe for hover-like rapid triggers (100ms)
      if (now - last < 100) return
      lastPlayRef.current[name] = now

      const url = sfxUrlByKey[name]
      if (!url) return
      
      // Check if file exists before trying to load (prevent 404s)
      const audio = new Audio(url)
      audio.volume = Math.min(1, Math.max(0, volume))
      
      // Set up error handler before playing
      const handleError = () => {
        playBeepFallback(volume)
      }
      audio.addEventListener('error', handleError, { once: true })
      
      // no await to avoid blocking UI thread
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      audio.play().catch(() => {
        // If play fails, use fallback
        playBeepFallback(volume)
      })
    } catch {
      // If anything fails, use fallback beep
      playBeepFallback(volume)
    }
  }, [soundEnabled, volume, sfxUrlByKey])

  // Helper to play audio with fallback
  const playAudioWithFallback = useCallback((url: string) => {
    if (!soundEnabled) return
    try {
      const audio = new Audio(url)
      audio.volume = Math.min(1, Math.max(0, volume))
      audio.addEventListener('error', () => playBeepFallback(volume), { once: true })
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      audio.play().catch(() => playBeepFallback(volume))
    } catch {
      playBeepFallback(volume)
    }
  }, [soundEnabled, volume])

  // Core sound wrappers using real audio files
  const playClick = useCallback(() => {
    if (!soundEnabled) return
    playAudioWithFallback(soundUrls.click)
  }, [soundEnabled, playAudioWithFallback, soundUrls.click])

  const playCorrect = useCallback(() => {
    if (!soundEnabled) return
    playAudioWithFallback(soundUrls.correct)
  }, [soundEnabled, playAudioWithFallback, soundUrls.correct])

  const playWrong = useCallback(() => {
    if (!soundEnabled) return
    playAudioWithFallback(soundUrls.wrong)
  }, [soundEnabled, playAudioWithFallback, soundUrls.wrong])

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return
    playAudioWithFallback(soundUrls.levelup)
  }, [soundEnabled, playAudioWithFallback, soundUrls.levelup])

  const playStreak = useCallback(() => {
    if (!soundEnabled) return
    playAudioWithFallback(soundUrls.streak)
  }, [soundEnabled, playAudioWithFallback, soundUrls.streak])

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

    // generic
    playSfx,

    // convenience wrappers
    playHover: () => playSfx("hover"),
    playSelect: () => playSfx("select"),
    playBack: () => playSfx("back"),
    playToggleOn: () => playSfx("toggle-on"),
    playToggleOff: () => playSfx("toggle-off"),
    playModalOpen: () => playSfx("modal-open"),
    playModalClose: () => playSfx("modal-close"),
    playSoftImpact: () => playSfx("soft-impact"),
    playHardImpact: () => playSfx("hard-impact"),
    playError: () => playSfx("error"),

    // game flow
    playCountdownTick: () => playSfx("countdown-tick"),
    playCountdownFinal: () => playSfx("countdown-final"),
    playTimeUp: () => playSfx("time-up"),

    // rewards/state
    playPowerUp: () => playSfx("power-up"),
    playPowerDown: () => playSfx("power-down"),
    playComboUp: () => playSfx("combo-up"),
    playStreakBreak: () => playSfx("streak-break"),

    // results
    playWin: () => playSfx("win"),
    playLose: () => playSfx("lose"),
    playDraw: () => playSfx("draw"),
    playRankUp: () => playSfx("rank-up"),
    playAchievement: () => playSfx("achievement"),
    playCoin: () => playSfx("coin"),
    playPurchaseConfirm: () => playSfx("purchase-confirm"),
    playPurchaseFail: () => playSfx("purchase-fail"),
    playSave: () => playSfx("save"),
    playNetworkError: () => playSfx("network-error"),

    burstConfetti,
  }
}


