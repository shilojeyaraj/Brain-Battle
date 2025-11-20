# UX Effects Guide: Sounds, Animations, and Rewards

This guide outlines how to add dopamine-friendly feedback to Brain-Battle without overwhelming users. It covers sound effects, motion patterns, particle/confetti, and accessible settings.

## Principles
- Positive micro-rewards: short, satisfying feedback after actions.
- Clear progress: visible XP movement, levels, streaks.
- Consistency: 3–4 sound types; cohesive motion timing; match theme colors.
- Accessibility: Reduced Motion and Sound toggles at a global level.

## Effects Overview
### Micro-interactions
- Pop/Bounce: subtle scale up/down on press/hover.
- Card Flip: 3D rotate for reveal.
- Slide/Fade: mount/unmount transitions.
- Shake: error/wrong answer.
- Pulse/Glow: highlight activity or streaks.

### Macro animations
- Screen slide-in: major state transitions.
- Zoom focus: spotlight on reward or card.
- XP burst: number fly-up and progress change.
- Level-up: confetti + triumphant note.

### Particles & Confetti
- Confetti for wins/level-ups.
- Sparkles for streaks.
- Floating emojis for reactions.

## Sounds (SFX)
- Click/UI: soft tick/pop for button presses (<=0.3s).
- Correct: bright chime/sparkle (<=0.6s).
- Wrong: dull thud/short buzz (<=0.4s).
- Level-up/Reward: rising note/“ta-da” (<=0.8s).
- Optional: background/ambient (use separate controls and fade).

Implementation uses `use-sound` with global toggles and volume in `SoundSettingsProvider`.

## Color & Light Effects
- Glow pulses on success/streaks.
- Gradient transitions for progress.
- Light burst on level-up.
- Match confetti colors to theme tokens.

## Accessibility & Settings
- Global toggles:
  - Sound Enabled (boolean)
  - Volume (0–1)
  - Reduced Motion (boolean; honors system `prefers-reduced-motion`)
- Persist preferences locally (`localStorage`).
- Respect Reduced Motion by disabling non-essential animations and particles.

## Implementation
### Packages
- Already present: `framer-motion`
- Added: `use-sound`, `canvas-confetti`

### New Files
- `src/context/sound-settings.tsx`: sound/reduced-motion/volume context and hook.
- `src/hooks/useFeedback.ts`: SFX + confetti helpers.
- `src/components/feedback/GameFeedback.tsx`: reward fly-ups/toasts.
- `src/components/ui/settings-modal.tsx`: global settings UI.
- `public/sounds/` (put audio assets here): `click.mp3`, `correct.mp3`, `wrong.mp3`, `level-up.mp3`, `streak.mp3`

### Providers
- Wrap app in a client provider that exposes settings and configures `MotionConfig` based on reduced motion.

### Quiz Flow Integration
- On answer:
  - Play correct/wrong SFX.
  - If correct: trigger confetti and show reward toast (e.g., “+10 XP”).
- On level-up:
  - Play level-up SFX and confetti from `LevelUpModal`.

### Example Snippets
Play SFX (via `useFeedback`):
```tsx
const { playCorrect, playWrong } = useFeedback()
isCorrect ? playCorrect() : playWrong()
```

Burst confetti:
```tsx
const { burstConfetti } = useFeedback()
burstConfetti({ particleCount: 100, spread: 70 })
```

Reward toast:
```tsx
<RewardToast show={show} message="+10 XP!" />
```

### Design Timing
- Micro-interactions: 120–240ms
- Flips: ~600ms
- Reward toast visible: 1.5–3s
- Confetti burst: 0.5–1s

## Rollout Checklist
- Add providers and settings modal.
- Wire singleplayer and multiplayer answer handlers.
- Enhance level-up modal with SFX + confetti.
- Verify SSR safety and reduced motion compliance.
- Tune volumes and durations for consistency.


