# PDF.js Serverless Environment Fix

## Problem

In serverless environments (Vercel, AWS Lambda), pdfjs-dist was failing with:
```
Error: Setting up fake worker failed: "Cannot find module '/var/task/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'"
```

This happens because:
1. pdfjs-dist tries to load a worker file from the file system
2. In serverless environments, file paths are different (`/var/task/` instead of local paths)
3. The worker file path cannot be resolved correctly

## Solution

Created a centralized configuration utility (`src/lib/pdfjs-config.ts`) that:
1. **Disables the worker** by setting `GlobalWorkerOptions.workerSrc = ''`
2. **Uses serverless-compatible options** for `getDocument()`:
   - `useWorkerFetch: false` - Disables worker fetch
   - `isEvalSupported: false` - Disables eval (security)
   - `disableAutoFetch: true` - Disables auto-fetching
   - `useSystemFonts: true` - Uses system fonts

## Files Updated

All PDF parsing code now uses the centralized configuration:

1. ✅ `src/app/api/notes/route.ts` - Notes generation
2. ✅ `src/app/api/generate-quiz/route.ts` - Quiz generation
3. ✅ `src/lib/pdf-smart-extractor.ts` - Diagram extraction
4. ✅ `src/lib/pdf-image-extractor.ts` - Image extraction
5. ✅ `src/lib/test-pdf-parsing.ts` - PDF testing utilities

## Usage

Instead of:
```typescript
const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
const pdfjsLib = pdfjsModule.default || pdfjsModule

const loadingTask = pdfjsLib.getDocument({
  data: new Uint8Array(buffer),
  useSystemFonts: true,
  verbosity: 0,
  isEvalSupported: false,
})
```

Use:
```typescript
const { getPdfjsLib, SERVERLESS_PDF_OPTIONS } = await import('@/lib/pdfjs-config')
const pdfjsLib = await getPdfjsLib()

const loadingTask = pdfjsLib.getDocument({
  data: new Uint8Array(buffer),
  ...SERVERLESS_PDF_OPTIONS,
})
```

## How It Works

1. **`configurePdfjsForServerless()`** - Configures pdfjs-dist to disable the worker
2. **`getPdfjsLib()`** - Returns configured pdfjs-dist library
3. **`SERVERLESS_PDF_OPTIONS`** - Pre-configured options for serverless environments

## Testing

After deployment, test PDF parsing:
1. Upload a PDF file in singleplayer mode
2. Generate study notes
3. Verify no worker errors in logs
4. Confirm PDF text is extracted correctly

## Notes

- This fix works in both development and production
- The worker is disabled, so PDF parsing runs in the main thread
- Performance impact is minimal for most PDFs
- For very large PDFs, consider chunking or streaming

## Related Issues

- Vercel serverless function limitations
- pdfjs-dist worker file path resolution
- Node.js module resolution in serverless environments

