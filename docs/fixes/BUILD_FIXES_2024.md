# Build Fixes - December 2024

## Summary
Fixed build errors and authentication issues related to Moonshot/OpenRouter API and OpenAI Vision API file size limits.

## Changes Made

### 1. Moonshot Authentication Fix
**File**: `src/app/api/generate-quiz/route.ts`

**Issue**: Code was checking for `MOONSHOT_API_KEY` but the application uses OpenRouter to access Moonshot models, which requires `OPEN_ROUTER_KEY`.

**Fix**:
- Updated authentication check to use `OPEN_ROUTER_KEY` or `OPENROUTER_API_KEY` instead of `MOONSHOT_API_KEY`
- Added clearer error messages indicating the required environment variable
- Updated console logging to show the correct key being checked

**Impact**: Users must set `OPEN_ROUTER_KEY` in `.env.local` instead of `MOONSHOT_API_KEY`. This aligns with the actual implementation that uses OpenRouter as a proxy to access Moonshot models.

### 2. OpenAI Vision API File Size Validation
**File**: `src/lib/agents/diagram-analyzer-agent.ts`

**Issue**: Large images extracted from PDFs (3MB+ files) were being sent to OpenAI Vision API, which has size limits (~20MB per image when base64-encoded). This caused "file too large" errors.

**Fix**:
- Added image size validation before sending to OpenAI Vision API
- Images larger than ~15MB (binary) are automatically skipped with a warning
- Improved error handling for OpenAI file size errors with clear messages
- Added logging to identify which images are too large
- Processing continues with other images in the batch even if some are skipped

**Technical Details**:
- Base64 encoding increases size by ~33%, so we limit raw image size to ~15MB
- Images are validated per batch (max 5 images per request)
- Skipped images are logged with page numbers and sizes
- Error messages provide guidance on compression or document splitting

**Impact**: 
- Prevents OpenAI API errors for large images
- Provides clear feedback when images are too large
- Allows processing to continue with valid images
- Better user experience with informative error messages

### 3. Build Verification
**Status**: ✅ Build passes successfully

**Verification**:
- Ran `pnpm build` - completed successfully
- All TypeScript types validated
- All routes compiled correctly
- No linting errors
- All 92 static pages generated successfully

## Environment Variables Required

### For Moonshot/OpenRouter Access:
```bash
OPEN_ROUTER_KEY=sk-or-v1-xxxxxxxxxxxxx
```

Or alternatively:
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

**Note**: `MOONSHOT_API_KEY` is no longer used. The application uses OpenRouter to access Moonshot models.

### For OpenAI Vision API (Pro feature):
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

## Testing Recommendations

1. **Test Moonshot Authentication**:
   - Verify `OPEN_ROUTER_KEY` is set in `.env.local`
   - Restart dev server after adding the key
   - Test quiz generation to ensure authentication works

2. **Test File Size Handling**:
   - Upload a PDF with large images (>15MB when base64-encoded)
   - Verify images are skipped with appropriate warnings
   - Confirm processing continues with other images
   - Check console logs for size validation messages

3. **Test Build Process**:
   - Run `pnpm build` to verify no errors
   - Check that all routes compile
   - Verify static pages generate correctly

## Related Files Modified

1. `src/app/api/generate-quiz/route.ts` - Authentication fix
2. `src/lib/agents/diagram-analyzer-agent.ts` - Image size validation
3. `src/app/api/notes/route.ts` - No changes (build error was from previous state)

## Notes

- The build error about duplicate imports in `notes/route.ts` was from a previous build state and has been resolved
- All recent conversation/memory features remain intact
- No breaking changes to existing functionality
- Error messages are now more informative for debugging

