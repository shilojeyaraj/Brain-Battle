# Brain Battle - v0 Redesign Prompt (Concise)

## App Overview
**Brain Battle** is an AI-powered multiplayer study platform. Students upload PDFs, AI generates study notes/quizzes, and users compete in real-time battles or study solo. Think "Kahoot meets AI-powered study tools" with heavy gamification.

## Design System: Cartoon/Game-like UI
- **Thick black borders** (4px) on all cards/buttons
- **Bold shadows** (4-6px offset, black)
- **Vibrant colors:** Bright blue primary, green secondary, yellow accent
- **Bold typography** (Fredoka font)
- **Rounded corners** (0.75rem)
- **Light gray background**, white cards

## Key Pages

### 1. Landing Page (`/`)
- Hero: "AI-Powered Study Battles!" title + "Start Playing!" button (must be visible above fold)
- "How It Works" nav link (smooth scrolls to section)
- 6 feature cards: Upload & Study, AI Questions, Multiplayer, Study Notes, Progress Tracking, Single/Multiplayer
- Final CTA: "Ready to Battle?"

### 2. Dashboard (`/dashboard`)
- Header: Avatar, XP bar, level, stats toggle
- Stats Grid: 6 cards (Level, XP, Wins, Accuracy, Streak, Quizzes) - collapsible
- Lobby: Create/Join room cards
- Recent Battles list
- Leaderboard

### 3. Quiz/Battle Pages
- Question cards with 3D flip animation
- Multiple choice/open-ended questions
- Timer countdown
- XP rewards on correct answers
- Level-up celebrations with confetti

### 4. Multiplayer Rooms
- Real-time member list
- Study session timer
- Chat component
- Live leaderboard
- Synchronized quiz battles

## Current Animations (Framer Motion)
- Cartoon hover: buttons lift up with shadow increase
- 3D card flips for questions
- Shake on wrong answers
- XP progress bars with animated fills
- Level-up modals with confetti/sparkles
- Reward toasts fly up on correct answers
- Sound effects (click, correct, wrong, level-up)

## Animation Opportunities

### Landing Page:
- Hero title: letters stagger in, button bounce-in with pulse
- Feature cards: staggered entrance, hover lift effects
- Scroll animations: cards fade/slide in on scroll

### Dashboard:
- Stats numbers: count up from 0
- XP bar: smooth gradient fill
- Room cards: entrance stagger, hover lift

### Quiz:
- Question cards: 3D flip on reveal
- Answer buttons: ripple on click, correct = green glow + confetti, wrong = red shake
- XP reward: number flies up with trail
- Level-up: full screen celebration with particles

### Multiplayer:
- Member avatars: slide in from side
- Score changes: number counting animation
- Leaderboard: smooth position swaps

## Tech Stack
- Next.js 15.5.4, TypeScript, Tailwind CSS 4.0
- Framer Motion 12.23.24, Radix UI, Lucide icons
- use-sound, canvas-confetti

## Design Requirements
- Maintain cartoon aesthetic (thick borders, bold shadows, vibrant colors)
- Responsive, mobile-first
- Respect `prefers-reduced-motion`
- Smooth 60fps animations
- Micro-interactions: 120-240ms, transitions: 300-600ms
- Hover: lift with shadow, Click: scale down then bounce, Success: confetti/glow, Error: shake

## Redesign Goals
1. More engaging micro-interactions
2. Smoother page/state transitions
3. Better visual feedback
4. Maintain performance (60fps)
5. Unified animation language

**Redesign Brain Battle with amazing animations while keeping the fun, cartoon-like aesthetic!**

