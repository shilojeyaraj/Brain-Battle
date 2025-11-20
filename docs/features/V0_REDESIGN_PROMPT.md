# Brain Battle - v0 Redesign Prompt

## 🎯 App Overview

**Brain Battle** is an AI-powered multiplayer study platform that transforms studying into an engaging, competitive experience. Students upload PDFs/documents, AI generates personalized study notes and quiz questions, and users compete in real-time multiplayer battles or study solo.

**Core Value Proposition:** Make studying fun through gamification, AI-powered content generation, and social competition.

---

## 🎨 Current Design System

### Visual Style: **Cartoon/Game-like UI**
- **Thick black borders** (4px solid) on all cards and buttons
- **Bold shadows** (4-6px offset) for depth
- **Vibrant color palette:**
  - Primary: Bright blue (`oklch(0.55 0.22 250)`)
  - Secondary: Vibrant green (`oklch(0.65 0.2 145)`)
  - Accent: Bright yellow (`oklch(0.85 0.18 85)`)
  - Chart colors: Blue, Green, Orange, Pink/Red, Yellow
- **Bold, chunky typography** (Fredoka font family for display)
- **Rounded corners** (0.75rem radius)
- **Light gray background** (`oklch(0.85 0.01 240)`)
- **White cards** with thick borders

### Current Animation Patterns:
- **Cartoon hover effects:** Buttons lift up (`translate(-2px, -2px)`) with shadow increase
- **3D card flips** for flashcard questions (perspective-1000, rotateY)
- **Shake animations** for wrong answers
- **Framer Motion** for page transitions and micro-interactions
- **XP progress bars** with animated fills
- **Level-up modals** with confetti bursts and sparkles
- **Reward toasts** that fly up on correct answers
- **Sound effects** (click, correct, wrong, level-up, streak)

---

## 📱 Key Pages & Features

### 1. **Landing Page** (`/`)
- Hero section with title "AI-Powered Study Battles!"
- "Start Playing!" CTA button (must be visible above fold)
- "How It Works" navigation link (scrolls to section)
- Feature cards grid (6 cards: Upload & Study, AI Questions, Multiplayer, Study Notes, Progress Tracking, Single/Multiplayer)
- Final CTA section "Ready to Battle?"

### 2. **Dashboard** (`/dashboard`)
- **Header:** User avatar, XP bar, level, stats toggle
- **Stats Grid:** 6 stat cards (Level, XP, Wins, Accuracy, Streak, Total Quizzes) - collapsible
- **Lobby Section:** Create room / Join room cards
- **Recent Battles:** List of past quiz sessions
- **Leaderboard:** Top players ranking

### 3. **Singleplayer Mode** (`/singleplayer`)
- Document upload interface
- Study notes viewer with AI-generated content
- Quiz battle page with:
  - Question cards (3D flip animation)
  - Multiple choice or open-ended questions
  - Timer countdown
  - Progress bar
  - XP rewards on correct answers
  - Level-up celebrations

### 4. **Multiplayer Rooms** (`/room/[id]`)
- **Room Lobby:**
  - Member list (real-time updates)
  - Study session timer
  - Chat component
  - Shared study notes
  - Quiz configuration
- **Battle Page:**
  - Real-time leaderboard
  - Synchronized questions
  - Live progress tracking
  - Anti-cheat warnings
  - Final results screen

### 5. **Authentication** (`/login`, `/signup`)
- Clean forms with validation
- Email/password authentication
- Error/success messaging

---

## 🎮 Gamification Elements

### XP & Leveling System:
- **20+ ranks** with unique names (Novice → Master → Legend)
- **XP calculation:** Based on accuracy, speed, difficulty multipliers
- **XP breakdown:** Shows exactly how XP was earned
- **Level-up celebrations:** Confetti, sparkles, modal with rank change
- **Progress bars:** Animated XP bars with rank icons

### Achievements & Rewards:
- Streak tracking
- Win/loss statistics
- Accuracy percentages
- Speed bonuses
- Perfect score rewards

---

## 🚀 Tech Stack (for Context)

- **Framework:** Next.js 15.5.4 (App Router)
- **Styling:** Tailwind CSS 4.0
- **UI Components:** Radix UI primitives
- **Animations:** Framer Motion 12.23.24
- **Icons:** Lucide React
- **Audio:** use-sound hook
- **Confetti:** canvas-confetti
- **Real-time:** Supabase Realtime subscriptions
- **State:** React Hooks (useState, useEffect, useCallback, useMemo)

---

## ✨ Animation Opportunities

### Landing Page:
- **Hero section:** Title fade-in with stagger, button bounce-in
- **Feature cards:** Staggered entrance animations, hover lift effects
- **Scroll animations:** Cards fade/slide in as user scrolls
- **Smooth scroll:** "How It Works" link smoothly scrolls to section

### Dashboard:
- **Stats cards:** Number counting animations, progress bar fills
- **XP bar:** Smooth fill animation on XP gain
- **Room cards:** Hover lift with shadow increase
- **Leaderboard:** Staggered list item animations

### Quiz/Battle Pages:
- **Question cards:** 3D flip on reveal, shake on wrong answer
- **Answer selection:** Button press animation, correct answer glow
- **XP rewards:** Number flies up from answer, confetti burst
- **Progress bar:** Smooth fill as questions complete
- **Timer:** Pulsing animation when time is low
- **Level-up:** Modal zooms in with sparkles, confetti explosion

### Multiplayer:
- **Member join/leave:** Slide-in animations
- **Real-time updates:** Smooth transitions for score changes
- **Chat messages:** Slide in from side
- **Leaderboard updates:** Smooth position changes

### Micro-interactions:
- **Button clicks:** Scale down on press, bounce back
- **Card hovers:** Lift effect with shadow increase
- **Loading states:** Skeleton screens with pulse animation
- **Error states:** Shake animation
- **Success states:** Checkmark animation, glow pulse

---

## 🎯 Design Requirements

### Must-Have:
1. **Cartoon/game-like aesthetic** - Maintain thick borders, bold shadows, vibrant colors
2. **Responsive design** - Mobile-first, works on all screen sizes
3. **Accessibility** - Respect `prefers-reduced-motion`, proper ARIA labels
4. **Performance** - Smooth 60fps animations, lazy loading for heavy components
5. **Consistent spacing** - Use Tailwind spacing scale
6. **Brand colors** - Maintain current color palette

### Animation Principles:
- **Purposeful:** Every animation should enhance UX, not distract
- **Fast:** Micro-interactions 120-240ms, transitions 300-600ms
- **Smooth:** Use easing functions (ease-out for entrances, ease-in for exits)
- **Delightful:** Add personality through bounce, spring, or elastic effects
- **Accessible:** Honor reduced motion preferences

### Interaction Patterns:
- **Hover:** Lift effect with shadow increase
- **Click:** Scale down slightly, then bounce back
- **Loading:** Skeleton screens with pulse
- **Success:** Confetti, sparkles, glow effects
- **Error:** Shake animation, red border pulse

---

## 🎨 Specific Animation Ideas

### Landing Page:
- Title letters animate in one by one (stagger)
- "Start Playing!" button has a subtle pulse/glow
- Feature cards slide up with fade as you scroll
- "How It Works" section cards have hover lift effects

### Dashboard:
- Stats numbers count up from 0
- XP bar fills smoothly with gradient animation
- Room cards have entrance animations (stagger)
- Leaderboard items slide in with delay

### Quiz Flow:
- Question card flips in with 3D rotation
- Answer buttons have ripple effect on click
- Correct answer: Green glow + confetti burst
- Wrong answer: Red shake + dull sound
- XP reward: Number flies up with trail effect
- Level-up: Full screen celebration with particles

### Multiplayer:
- Member avatars slide in from side
- Score changes animate with number counting
- Leaderboard positions swap smoothly
- Chat messages fade in from bottom

---

## 📋 Component Structure

### Key Components:
- `DashboardHeader` - User profile, XP bar, navigation
- `StatsGrid` - 6 stat cards with animated numbers
- `LobbySection` - Create/Join room cards
- `QuizCard` - 3D flip card for questions
- `XPProgressBar` - Animated progress with rank icon
- `LevelUpModal` - Celebration modal with confetti
- `RewardToast` - XP reward notifications
- `MemberList` - Real-time member updates
- `Leaderboard` - Animated rankings

---

## 🎭 Tone & Feel

**Energetic, Fun, Competitive, Educational**

- **Energetic:** Fast-paced animations, vibrant colors
- **Fun:** Playful micro-interactions, celebration effects
- **Competitive:** Leaderboard animations, score updates
- **Educational:** Clear information hierarchy, helpful tooltips

---

## 💡 Redesign Focus Areas

1. **Enhanced Landing Page:**
   - More dynamic hero section
   - Better scroll animations
   - Engaging feature showcase

2. **Improved Dashboard:**
   - Smoother stat animations
   - Better visual hierarchy
   - More engaging room cards

3. **Better Quiz Experience:**
   - More satisfying answer feedback
   - Smoother card transitions
   - Enhanced celebration effects

4. **Polished Multiplayer:**
   - Better real-time update animations
   - Smoother leaderboard transitions
   - More engaging member interactions

---

## 🔧 Technical Constraints

- Must use **Framer Motion** for animations
- Must maintain **Tailwind CSS** utility classes
- Must use **Radix UI** components as base
- Must respect **prefers-reduced-motion**
- Must be **SSR-safe** (client-side only animations)
- Must maintain **TypeScript** types
- Must use **Lucide React** icons

---

## 📝 Example Animation Patterns

```tsx
// Entrance animation
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
}

// Hover lift
const hoverLift = {
  whileHover: { y: -4, boxShadow: "6px 6px 0px oklch(0.15 0.02 280)" },
  transition: { duration: 0.15 }
}

// Button press
const buttonPress = {
  whileTap: { scale: 0.95 },
  transition: { duration: 0.1 }
}

// Stagger children
const container = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}
```

---

## 🎯 Redesign Goals

1. **More Engaging:** Add delightful micro-interactions throughout
2. **Smoother Transitions:** Improve page and state transitions
3. **Better Feedback:** Enhanced visual feedback for user actions
4. **Performance:** Maintain 60fps, optimize animation performance
5. **Accessibility:** Ensure animations don't hinder usability
6. **Consistency:** Unified animation language across all pages

---

**Ready to redesign Brain Battle with amazing animations while maintaining the fun, cartoon-like aesthetic!**

