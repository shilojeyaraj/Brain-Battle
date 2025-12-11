## PDF Parsing Notes (Brain Battle)

Goal: make PDF parsing robust in production/serverless (Vercel) without workerSrc errors.

Key decisions
- All PDF parsing in `/api/notes` uses the unified extractor (`extractPDFTextAndImages`).
- The unified extractor force-sets `GlobalWorkerOptions.workerSrc = ''` and disables worker fetch.
- `/api/notes` runs in `runtime = 'nodejs'` because pdfjs/dist and Supabase client libs are not Edge-safe.
- Avoid `pdf-extract-image` in `/api/notes` to prevent unconfigured pdfjs imports; if ever used elsewhere, set `workerSrc=''` immediately after import.

What to check when errors appear
- If you see “Setting up fake worker failed” or “No GlobalWorkerOptions.workerSrc specified”, a code path imported pdfjs without the config. Ensure it goes through `pdf-unified-extractor` or sets `workerSrc=''` immediately after import.
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


