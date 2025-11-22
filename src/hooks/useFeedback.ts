"use client"

import { useCallback, useMemo, useRef } from "react"
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

  // Only initialize sounds if sound is enabled to prevent unnecessary 404s
  // use-sound will try to load files immediately, so we conditionally initialize
  const soundOptions = useMemo(() => ({
    volume: Math.min(1, Math.max(0, volume)),
    soundEnabled: soundEnabled && false, // Disable use-sound loading to prevent 404s
    interrupt: true,
  }), [volume, soundEnabled])

  // Don't initialize use-sound to prevent 404s - use fallback beeps directly
  // This prevents the library from trying to load missing files
  const [playClickRaw] = useSound(null, soundOptions)
  const [playCorrectRaw] = useSound(null, soundOptions)
  const [playWrongRaw] = useSound(null, soundOptions)
  const [playLevelUpRaw] = useSound(null, soundOptions)
  const [playStreakRaw] = useSound(null, soundOptions)

  // Safe wrappers - use fallback beeps directly to avoid 404s
  // Since sound files don't exist, we skip use-sound and use beeps
  const playClick = useCallback(() => {
    if (!soundEnabled) return
    playBeepFallback(volume)
  }, [soundEnabled, volume])

  const playCorrect = useCallback(() => {
    if (!soundEnabled) return
    // Higher pitch for correct answers
    playBeepFallback(volume * 1.2)
  }, [soundEnabled, volume])

  const playWrong = useCallback(() => {
    if (!soundEnabled) return
    // Lower pitch for wrong answers
    playBeepFallback(volume * 0.8)
  }, [soundEnabled, volume])

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return
    playBeepFallback(volume * 1.3)
  }, [soundEnabled, volume])

  const playStreak = useCallback(() => {
    if (!soundEnabled) return
    playBeepFallback(volume * 1.1)
  }, [soundEnabled, volume])

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


