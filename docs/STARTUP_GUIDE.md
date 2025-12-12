# Startup Guide (Brain-Brawl)

Quick steps to run locally and verify the core flows after the recent PDF/quiz changes.

## Prerequisites
- Node.js 18+ (match the project lock; 18.x recommended)
- pnpm (project pins pnpm@10.22.0 in package.json)
- .env.local populated with required secrets (Supabase, Stripe, OpenRouter/Moonshot, Sentry). Do not use live Stripe keys in local dev.

## Install
```bash
pnpm install
```

## Dev server
```bash
pnpm dev
```
Visit http://localhost:3000.

## Build (prod parity)
```bash
pnpm run build
```

## Testing

### PDF Extraction Test
Run from repo root:
```bash
pnpm run test:pdf-extract -- --file "Slides - Ch.6.4-6.10-A-2024.pdf"
```
Expected: text length > 0, worker warnings absent. This mirrors the production extractor configuration (fake worker, ESM pdfjs).

### Quiz Generation Test
**Note:** Requires a running dev server and authentication.

1. Start dev server in one terminal:
```bash
pnpm dev
```

2. Log in via web app (http://localhost:3000/login) and copy your session cookie from browser DevTools (Application → Cookies → `brain-brawl-session`)

3. Run quiz generation test:
```bash
TEST_SESSION_COOKIE=<your-cookie> pnpm test:quiz-gen -- --file "Slides - Ch.6.4-6.10-A-2024.pdf" --topic "Mechanics" --num-questions 5
```

Or test both together:
```bash
pnpm test:all
```

Expected: Notes generated successfully, quiz questions created and validated.

## Notes on PDF configuration
- We use pdfjs-dist ESM build with fake worker: workerSrc resolves to `pdf.worker.min.mjs` via `pdfjs-config`, and `disableWorker=true` is enforced.
- All PDF text extraction goes through `extractPDFTextAndImages` in `lib/pdf-unified-extractor.ts`.

## Quiz generation
- API: `/api/generate-quiz` (Moonshot via OpenRouter). Diagram generation is disabled; questions are stored in both `quiz_questions` and legacy `questions`.
- Singleplayer sessions are auto-created when missing.

## Stats and caching
- `/api/quiz-results` ensures `users` and `player_stats` rows exist before updating stats.
- `/api/user-stats` fetches profile, stats, recent battles, achievements in parallel.

## Known build warnings
- `require-in-the-middle` (from Sentry/OTel) – safe to ignore.
- ESLint “Failed to patch” warning (rushstack) – noisy, but build passes.

## Production reminders
- Ensure `.env` on Vercel has all required secrets.
- Use test Stripe keys in non-prod; live keys will charge real cards.


