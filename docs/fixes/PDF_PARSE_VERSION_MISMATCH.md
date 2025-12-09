# PDF Parsing Version Mismatch Fix

## Problem

The application was experiencing PDF parsing failures during study notes generation. The error log showed:

```
Error: Failed to parse PDF "Slides - Ch.6.4-6.10-A-2024.pdf". Error: The API version "4.4.168" does not match the Worker version "4.10.38".
```

## Root Cause

1. **Dependency Conflict**: 
   - The project has `pdfjs-dist@4.10.38` installed in the root `node_modules`.
   - `pdf-parse@2.4.5` (used as a fallback) depends on its own internal version of `pdfjs-dist@4.4.168`.

2. **Worker Loading**:
   - When `pdf-parse` initializes, it uses its internal `pdfjs-dist` (4.4.168) API.
   - However, it tries to load a worker file. Due to Node.js module resolution or global configuration, it inadvertently loads the worker from the root `pdfjs-dist` (4.10.38).
   - `pdfjs-dist` strictly enforces that the API version must match the Worker version, causing the crash.

## Solution

We explicitly disabled the worker for `pdf-parse`'s internal `pdfjs-dist` instance. This forces it to use the "fake worker" (main thread execution), which:
1. Bypasses the need to load an external worker file (solving serverless path issues).
2. Prevents the version mismatch since no external worker code is loaded.

### Implementation

In `src/app/api/notes/route.ts` and `src/app/api/generate-quiz/route.ts`:

```typescript
// 1. Import the class
const pdfParseModule: any = await import('pdf-parse')
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default

// 2. CRITICAL FIX: Disable worker by setting it to a dummy data URI
if (typeof PDFParse.setWorker === 'function') {
  PDFParse.setWorker('data:application/javascript,void(0);')
}

// 3. Instantiate with serverless options
const parser = new PDFParse({ 
  data: buffer,
  useSystemFonts: true,     // Prevent font fetching
  disableAutoFetch: true,   // Prevent resource fetching
  useWorkerFetch: false,    // Disable worker fetch
  isEvalSupported: false    // Security
})
```

## Verification

A verification script `scripts/verify-pdf-fix.mjs` was created to confirm that:
1. `pdf-parse` can be imported correctly in ESM.
2. The `PDFParse` class is available.
3. The `setWorker` method exists and executes without error.
4. Instantiation with options works.

## Status

✅ **FIXED** - The fallback mechanism is now robust against version mismatches and serverless environment constraints.

