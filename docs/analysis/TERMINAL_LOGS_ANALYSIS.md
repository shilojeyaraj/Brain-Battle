# Terminal Logs Analysis - Critical Issues

## Date: 2025-12-17

### Summary
Analysis of terminal logs (lines 226-1013) reveals **4 critical issues** preventing proper quiz generation and notes processing.

---

## 🔴 Critical Issue #1: Quiz Sessions Schema Mismatch

**Error:**
```
❌ [QUIZ API] Failed to create quiz session for question storage: {
  code: 'PGRST204',
  message: "Could not find the 'user_id' column of 'quiz_sessions' in the schema cache"
}
```

**Root Cause:**
- Code in `src/app/api/generate-quiz/route.ts` (line 1271) tries to insert `user_id` into `quiz_sessions`
- The `quiz_sessions` table schema (from `supabase/schema.sql`) does NOT have a `user_id` column
- Schema has: `id`, `room_id`, `unit_id`, `status`, `total_questions`, `started_at`, `ended_at`, `winner_user_id`, `created_at`
- Code also tries to insert: `session_name`, `time_limit`, `is_active` which don't exist in the schema

**Impact:**
- Quiz sessions cannot be created for singleplayer games
- Questions cannot be stored in the database
- Quiz generation fails silently (returns 200 but doesn't store data)

**Fix Applied:**
- Removed `user_id` from insert statement
- Need to verify which schema is actually in production (schema.sql vs setup.sql)

---

## 🔴 Critical Issue #2: User Foreign Key Violation

**Error:**
```
❌ [QUIZ DEDUP] Foreign key violation: User 19d3c81b-a1fd-4850-bc9a-d32ce90f765f does not exist in users table
   This should have been caught earlier. User may have been deleted.
```

**Root Cause:**
- User exists in `auth.users` (session is valid) but NOT in `public.users`
- `quiz_question_history` table has foreign key to `public.users`
- `ensureUserExists` utility exists but isn't being called before storing question history

**Impact:**
- Question deduplication fails
- Question history is not stored
- Users may see duplicate questions

**Fix Needed:**
- Call `ensureUserExists(userId)` before storing question history
- Or handle the error gracefully (already done, but should prevent it)

---

## 🟡 Issue #3: Embeddings API 404

**Error:**
```
⚠️ [EMBEDDINGS] Failed to generate embeddings: 404
⚠️ [NOTES API] Embedding generation failed: HTTP 404
```

**Root Cause:**
- Embeddings API route exists at `/api/embeddings`
- Called from `src/lib/utils/parallel-enrichment.ts` (line 295)
- Base URL might be incorrect or route not accessible
- Could be authentication issue or route not deployed

**Impact:**
- Embeddings are not generated for study notes
- Semantic search won't work for these notes
- Non-critical (notes still work without embeddings)

**Fix Needed:**
- Verify base URL is correct
- Check if route requires authentication
- Ensure route is accessible in production

---

## 🟡 Issue #4: Invalid YouTube Video URLs

**Error:**
```
YouTube video not found or inaccessible: https://www.youtube.com/watch?v=example-tensile
YouTube video not found or inaccessible: https://www.youtube.com/watch?v=example-hardness
YouTube video not found or inaccessible: https://www.youtube.com/watch?v=example-impact
YouTube video not found or inaccessible: https://www.youtube.com/watch?v=example-columbia
```

**Root Cause:**
- AI is generating placeholder URLs instead of real YouTube video IDs
- Video enrichment logic should validate URLs before storing
- AI prompt might need improvement to generate real URLs

**Impact:**
- Invalid video links in study notes
- Users see broken video references
- Non-critical (videos are optional enrichment)

**Fix Needed:**
- Improve AI prompt to generate real YouTube URLs
- Add validation to filter out placeholder URLs
- Use Tavily API results instead of AI-generated URLs

---

## ✅ What's Working

1. **Notes Generation**: Successfully generating study notes (68.5 seconds)
2. **Quiz Generation**: AI successfully generates questions (39.5 seconds)
3. **OpenRouter API**: Connection and retry logic working
4. **Progress Logging**: Memory architecture logging working
5. **Video Enrichment**: Tavily API finding real videos (6 valid videos)

---

## 🔧 Recommended Fixes (Priority Order)

### Priority 1: Fix Quiz Sessions Schema
1. Verify actual production schema for `quiz_sessions`
2. Either:
   - Update code to match schema.sql (remove non-existent columns)
   - OR create migration to add missing columns if setup.sql is correct
3. Test quiz session creation

### Priority 2: Fix User Foreign Key
1. Call `ensureUserExists(userId)` before storing question history
2. Add to `storeQuestionHistory` function in `question-deduplication.ts`

### Priority 3: Fix Embeddings 404
1. Check base URL configuration
2. Verify route accessibility
3. Add authentication if needed

### Priority 4: Fix YouTube URLs
1. Improve AI prompt for video URL generation
2. Add URL validation
3. Use Tavily results directly

---

## 📊 Statistics from Logs

- **Notes Generation Time**: 68.5 seconds
- **Quiz Generation Time**: 39.5 seconds  
- **Total API Time**: 90.9 seconds (notes) + 64.7 seconds (quiz)
- **Questions Generated**: 5 questions (3 multiple choice, 2 open-ended)
- **Diagrams Extracted**: 5 diagrams (but no images, free tier)
- **Videos Found**: 6 valid videos (4 invalid filtered out)
- **Embeddings**: Failed (404)

---

## 🎯 Next Steps

1. ✅ Fix quiz_sessions insert (remove user_id)
2. ⏳ Fix user foreign key (add ensureUserExists call)
3. ⏳ Investigate embeddings 404
4. ⏳ Improve YouTube URL generation
