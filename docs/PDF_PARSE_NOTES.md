## PDF Parsing Notes (Brain Battle)

Goal: robust PDF parsing in production/serverless (Vercel) without workerSrc errors.

Key decisions
- All PDF parsing in `/api/notes` uses the unified extractor (`extractPDFTextAndImages`).
- pdfjs is forced to main-thread parsing: `disableWorker: true` at both the shared options (`SERVERLESS_PDF_OPTIONS`) and every `getDocument` call.
- We still set `GlobalWorkerOptions.workerSrc = ''` as a belt-and-suspenders, but worker checks are bypassed because the worker is disabled.
- `/api/notes` runs in `runtime = 'nodejs'` because pdfjs-dist and Supabase client libs are not Edge-safe.
- Avoid direct `pdf-extract-image` usage in `/api/notes`; if used elsewhere, ensure it routes through `pdf-image-extractor` (which applies the same serverless pdfjs config and `disableWorker: true`).
- All pdfjs imports must go through `getPdfjsLib()` to avoid unconfigured instances.

What to check when errors appear
- If you see “Setting up fake worker failed” or “No GlobalWorkerOptions.workerSrc specified”, verify `disableWorker: true` is present at the `getDocument` call and in `SERVERLESS_PDF_OPTIONS`, and confirm no stray pdfjs imports bypass `getPdfjsLib()`.
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

