## PDF Parsing Notes (Brain Battle)

Goal: robust PDF parsing in production/serverless (Vercel) without workerSrc errors.

Key decisions
- PDF parsing in `/api/notes` now uses `pdf-parse` (text-only) for stability; images are skipped.
- pdfjs-based paths remain configured serverlessly (worker disabled), but `/api/notes` no longer depends on pdfjs for PDFs.
- `/api/notes` runs in `runtime = 'nodejs'` because pdfjs-dist and Supabase client libs are not Edge-safe.
- If you reintroduce pdfjs for PDFs, use `getPdfjsLib()`, set `workerSrc = ''`, and `disableWorker = true` before any `getDocument` call.

What to check when errors appear
- If you re-enable pdfjs and see “Setting up fake worker failed” or “No GlobalWorkerOptions.workerSrc specified”, verify `disableWorker: true` at `getDocument` and in `SERVERLESS_PDF_OPTIONS`, and ensure all pdfjs imports go through `getPdfjsLib()`.
- Ensure deployment uses pnpm and the Node runtime for `/api/notes`.

API contract
- `/api/notes` supports POST multipart form data with `files[]`.
- Requires authentication (session cookie).

Local test (curl)
```
curl -X POST https://brain-battle.app/api/notes \
  -H "Cookie: <session_cookie>" \
  -F "files=@Slides.pdf"
```

Client calls
- Must use POST; GET will return 405.
- Include auth session; unauthenticated calls will return 401.

