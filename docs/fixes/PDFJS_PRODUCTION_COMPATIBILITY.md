# PDF.js Production Compatibility

## Overview

All PDF parsing functions in the application are configured to work in production serverless environments (Vercel, AWS Lambda, etc.) where worker files cannot be loaded from the file system.

## Configuration

The PDF.js library is configured via `src/lib/pdfjs-config.ts`, which:

1. **Disables the worker** by setting `GlobalWorkerOptions.workerSrc = ''`
2. **Patches PDF.js** to accept empty worker source without throwing errors
3. **Uses fake worker mode** that runs in the main thread (no file system access required)
4. **Optimizes for serverless** with appropriate `getDocument` options

## Files Using PDF.js Configuration

All PDF parsing code uses the centralized configuration:

### ✅ API Routes
- `src/app/api/notes/route.ts` - Study notes generation
- `src/app/api/generate-quiz/route.ts` - Quiz question generation

### ✅ Utility Functions
- `src/lib/pdf-smart-extractor.ts` - Diagram extraction
- `src/lib/pdf-image-extractor.ts` - Image extraction
- `src/lib/test-pdf-parsing.ts` - PDF testing utilities

## Usage Pattern

All PDF parsing code follows this pattern:

```typescript
// Import the configured PDF.js library
const { getPdfjsLib, SERVERLESS_PDF_OPTIONS } = await import('@/lib/pdfjs-config')
const pdfjsLib = await getPdfjsLib()

// Use with serverless-optimized options
const loadingTask = pdfjsLib.getDocument({
  data: new Uint8Array(buffer),
  ...SERVERLESS_PDF_OPTIONS,
})

const pdfDocument = await loadingTask.promise
// ... process PDF pages
```

## Production Compatibility

### ✅ Development
- Works in local development environment
- Uses fake worker (no file system access needed)
- Proper error handling and logging

### ✅ Production (Vercel/Serverless)
- Works in serverless environments
- No file system dependencies
- No worker file loading required
- Optimized for cold starts

### ✅ Error Handling
- Graceful fallbacks if PDF parsing fails
- Detailed error messages for debugging
- Proper error propagation to API routes

## Key Features

1. **No File System Access**: Worker runs in main thread, no worker files needed
2. **Cached Configuration**: PDF.js is configured once and cached for performance
3. **Production Optimized**: Minimal logging, optimized options for serverless
4. **Error Resilient**: Proper error handling and fallbacks

## Testing

To test PDF parsing in production:

1. Upload a PDF file in singleplayer mode
2. Generate study notes
3. Verify no worker errors in logs
4. Confirm PDF text is extracted correctly

## Troubleshooting

If you encounter "No GlobalWorkerOptions.workerSrc specified" errors:

1. Ensure `getPdfjsLib()` is called before any PDF operations
2. Check that `src/lib/pdfjs-config.ts` is properly imported
3. Verify the configuration is applied before `getDocument()` calls

## Related Files

- `src/lib/pdfjs-config.ts` - Main configuration file
- `docs/fixes/PDFJS_SERVERLESS_FIX.md` - Original serverless fix documentation
- `next.config.ts` - Next.js configuration (externalizes pdfjs-dist)

