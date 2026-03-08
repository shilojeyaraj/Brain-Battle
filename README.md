# Brain Battle

**AI-powered multiplayer study platform** — upload documents, generate study notes and quizzes with AI, then compete with friends in real-time.

[![CI](https://github.com/ShiloSmith/Brain-Brawl/actions/workflows/ci.yml/badge.svg)](https://github.com/ShiloSmith/Brain-Brawl/actions/workflows/ci.yml)

## Live Demo

**[brain-battle.app](https://brain-battle.app)** — sign up free and try it instantly.

<!-- Add a screenshot or GIF here when available -->
<!-- ![Brain Battle Dashboard](docs/assets/screenshot-dashboard.png) -->

> **Demo video:** [Watch a 2-minute walkthrough](https://brain-battle.app) *(coming soon)*

---

## Features

- **AI Study Notes** — Upload PDFs/DOCX/PPTX, get structured notes with key terms, formulas, concepts, and practice questions.
- **Smart Quiz Generation** — AI creates quizzes directly from your documents with multiple question types (MCQ, open-ended, true/false).
- **Real-Time Multiplayer** — Create private rooms, compete on the same quiz, see live leaderboards.
- **Clans & Classrooms** — Teachers create clans, students join for free. Run Kahoot-style sessions for up to 500 participants.
- **Gamification** — XP system, 20+ ranks, achievements, streaks, and global leaderboards.
- **Anti-Cheat** — Tab-switch detection, timing analysis, and live violation alerts for fair play.
- **Semantic Search** — Vector-based document search for finding relevant content across your notes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15** (App Router, TypeScript) |
| UI | **Tailwind CSS 4**, Radix UI, Framer Motion |
| Database | **Supabase** (PostgreSQL + pgvector + Realtime) |
| AI | **Moonshot Kimi K2** for notes/quiz generation, OpenAI embeddings |
| Auth | Custom session-based auth with bcrypt, WebAuthn/MFA support |
| Payments | **Stripe** (subscriptions, checkout, webhooks) |
| Monitoring | Sentry (errors), PostHog (analytics) |
| CI/CD | GitHub Actions, Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase project ([supabase.com](https://supabase.com))
- AI API key (Moonshot or OpenAI)

### Install

```bash
git clone https://github.com/ShiloSmith/Brain-Brawl.git
cd Brain-Brawl
npm install
```

### Environment Variables

Copy the example and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MOONSHOT_API_KEY` | Moonshot AI API key |
| `STRIPE_SECRET_KEY` | Stripe secret key (for payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Database Setup

Run the SQL from `supabase/setup.sql` in your Supabase SQL Editor to create all tables and RLS policies.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # 50+ REST API endpoints
│   ├── dashboard/         # Main dashboard
│   ├── room/[id]/         # Multiplayer room
│   ├── singleplayer/      # Singleplayer study flow
│   └── auth/              # Login, signup, MFA
├── components/            # 75+ React components
│   ├── ui/                # Base UI primitives (Button, Toast, Dialog, etc.)
│   ├── dashboard/         # Dashboard widgets
│   ├── multiplayer/       # Real-time multiplayer components
│   └── study-notes/       # Notes viewer with flashcards
├── lib/                   # Business logic and utilities
│   ├── ai/                # AI client factory (Moonshot, OpenAI, OpenRouter)
│   ├── agents/            # Multi-agent orchestrator for note generation
│   ├── auth/              # Session management, WebAuthn
│   ├── schemas/           # Zod validation schemas
│   ├── security/          # Input validation, rate limiting
│   ├── stripe/            # Payment integration
│   └── utils/             # Helpers (retry, debounce, error sanitizer, etc.)
├── hooks/                 # Custom React hooks
└── context/               # React context providers
```

---

## Testing

The project uses **Jest** with **React Testing Library** for unit, component, and integration tests.

### Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### What's Covered

| Category | Scope | Location |
|----------|-------|----------|
| **Unit tests** | XP calculator, quiz evaluator, distillation, validation schemas, error sanitizer, debounce/throttle, retry/circuit breaker, formula formatter | `src/lib/**/*.test.ts` |
| **Component tests** | Button, Toast system | `src/components/ui/__tests__/` |
| **Integration tests** | Health API, multiplayer flow, quiz generation API, room creation | `tests/integration/`, `src/app/api/**/*.test.ts` |

### Adding Tests

Place test files next to the source file (`foo.test.ts`) or in `__tests__/` directories. Tests automatically run in CI on every push and pull request.

---

## CI / DevOps

CI runs automatically on every push and pull request to `main` and `develop`:

1. **Lint & Type Check** — ESLint + `tsc --noEmit`
2. **Unit & Integration Tests** — Jest with coverage report
3. **Production Build** — Full `next build` to catch SSR/build errors

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the full pipeline.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run clean` | Clean build artifacts |

---

## Architecture Highlights

- **Multi-agent AI pipeline** — Content extraction, complexity analysis, concept organization, and question generation run in parallel for faster note generation.
- **Prompt optimization** — Shared rules file + content distillation keeps prompts lean (~6k chars) for faster AI responses.
- **Real-time sync** — Supabase Realtime channels for live multiplayer progress, member lists, and cheat alerts.
- **Freemium model** — Only clan creators need Pro; members join free. One Pro account supports up to 500 participants.
- **Security** — Input validation (Zod), error sanitization, file content validation (magic numbers), rate limiting, and session-based auth.

---

## License

MIT — see [LICENSE](LICENSE) for details.
