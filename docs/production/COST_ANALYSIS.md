# Cost Analysis: Token Usage by Feature

## Executive Summary

This document analyzes which features consume the most OpenAI API tokens (and therefore cost the most money) in the Brain-Battle application.

## Cost Breakdown by Feature

### 🔴 **MOST EXPENSIVE: Study Notes Generation** (`/api/notes`)

**Model:** `gpt-4o` (most expensive model - ~$0.03 per 1K tokens)

**Token Usage:**
- **System Prompt:** ~15,000-20,000 characters (very detailed instructions)
- **User Prompt:** Includes entire document content (can be 50,000+ characters for large PDFs)
- **Response:** Large JSON with outline, concepts, formulas, practice questions (10,000-30,000 tokens)
- **Estimated Total:** 50,000-100,000+ tokens per request
- **Estimated Cost:** $1.50-$3.00 per notes generation

**Why it's expensive:**
- Uses the most expensive model (gpt-4o)
- Processes entire document content in the prompt
- Generates comprehensive, structured output
- No max_tokens limit (can generate very long responses)
- Very detailed system prompt for accuracy

**Frequency:** Every time a user generates study notes (1x per document upload)

---

### 🟠 **SECOND MOST EXPENSIVE: Quiz Generation** (`/api/generate-quiz`)

**Model:** `gpt-4o` (most expensive model - ~$0.03 per 1K tokens)

**Token Usage:**
- **System Prompt:** ~2,000-3,000 characters
- **User Prompt:** Includes document content or notes (can be 20,000-50,000 characters)
- **Response:** JSON with quiz questions (limited to 3,000 tokens max)
- **Estimated Total:** 20,000-50,000 tokens per request
- **Estimated Cost:** $0.60-$1.50 per quiz generation

**Why it's expensive:**
- Uses the most expensive model (gpt-4o)
- Processes document/notes content
- Generates multiple detailed questions with explanations
- Can be called multiple times per user session

**Frequency:** Every time a user generates a quiz (multiple times per session possible)

---

### 🟡 **THIRD MOST EXPENSIVE: Diagram Analysis** (if enabled)

**Model:** `gpt-4o` with Vision API (even more expensive - ~$0.01-0.03 per image)

**Token Usage:**
- **System Prompt:** ~2,000 characters
- **User Prompt:** Includes base64-encoded images + document context
- **Response:** JSON with diagram descriptions
- **Estimated Total:** 10,000-30,000 tokens per image (if using Vision API)
- **Estimated Cost:** $0.30-$0.90 per image analyzed

**Why it's expensive:**
- Uses Vision API which is more expensive than text-only
- Processes base64-encoded images (large token count)
- Currently **DISABLED for free tier** (good cost-saving measure)

**Frequency:** Only for Pro users, per image in document

---

### 🟢 **RELATIVELY CHEAP: Document Embeddings** (`/api/embeddings`)

**Model:** `text-embedding-3-small` (very cheap - ~$0.0001 per 1K tokens)

**Token Usage:**
- **Embeddings:** Processes text chunks (1,000 chars each)
- **Text Analysis:** Uses `gpt-3.5-turbo` (cheap - ~$0.002 per 1K tokens)
- **Estimated Total:** 2,000-5,000 tokens per document
- **Estimated Cost:** $0.0002-$0.0005 per document

**Why it's cheap:**
- Uses the cheapest embedding model
- Only uses gpt-3.5-turbo for metadata extraction (not gpt-4o)
- Processes in chunks, but embeddings are very cheap

**Frequency:** Every time a user uploads a document (1x per document)

---

### 🟢 **VERY CHEAP: Semantic Search** (`/api/semantic-search`)

**Model:** `text-embedding-3-small` (very cheap - ~$0.0001 per 1K tokens)

**Token Usage:**
- **Query Embedding:** Only generates embedding for search query (~100-500 tokens)
- **Estimated Total:** 100-500 tokens per search
- **Estimated Cost:** $0.00001-$0.00005 per search

**Why it's very cheap:**
- Only processes the search query (not entire documents)
- Uses cheapest embedding model
- No GPT-4o usage

**Frequency:** Every time a user performs semantic search (can be frequent)

---

### ✅ **FREE: PDF Parsing**

**No AI/Token Costs:** Uses `pdfjs-dist` library (local processing)

**Why it's free:**
- Uses client-side JavaScript library
- No API calls to OpenAI
- Processes PDFs locally in the browser/server

**Frequency:** Every time a PDF is uploaded (no cost)

---

## Cost Comparison Table

| Feature | Model | Est. Tokens | Est. Cost | Frequency | Total Monthly Cost* |
|---------|-------|-------------|-----------|-----------|---------------------|
| **Notes Generation** | gpt-4o | 50K-100K | $1.50-$3.00 | 1x/doc | **HIGHEST** |
| **Quiz Generation** | gpt-4o | 20K-50K | $0.60-$1.50 | Multiple/session | **HIGH** |
| **Diagram Analysis** | gpt-4o Vision | 10K-30K/img | $0.30-$0.90 | Per image (Pro only) | **MEDIUM** |
| **Document Embeddings** | embedding-3-small | 2K-5K | $0.0002-$0.0005 | 1x/doc | **LOW** |
| **Semantic Search** | embedding-3-small | 100-500 | $0.00001-$0.00005 | Per search | **VERY LOW** |
| **PDF Parsing** | N/A (local) | 0 | $0.00 | Per upload | **FREE** |

*Assuming 100 active users, 10 docs/user/month, 5 quizzes/user/month

---

## Recommendations for Cost Optimization

### 1. **Study Notes Generation** (Highest Cost)
- ✅ Already optimized: Uses low temperature (0.2) for accuracy
- 💡 **Consider:** 
  - Add max_tokens limit to prevent runaway costs
  - Cache notes for same documents
  - Offer "quick notes" vs "detailed notes" options
  - Consider using gpt-4o-mini for simpler documents

### 2. **Quiz Generation** (High Cost)
- ✅ Already optimized: Has max_tokens: 3000 limit
- ✅ Already optimized: Uses lower temperature (0.3)
- 💡 **Consider:**
  - Cache quiz questions for same document/topic combinations
  - Reuse questions from practice_questions in notes
  - Consider gpt-4o-mini for simpler quizzes

### 3. **Diagram Analysis** (Medium Cost - Currently Disabled)
- ✅ **Already optimized:** Disabled for free tier (excellent cost-saving measure)
- ✅ Only enabled for Pro users who pay subscription
- 💡 **Consider:**
  - Keep disabled for free tier
  - Add per-image rate limiting for Pro users
  - Consider cheaper vision models if available

### 4. **Document Embeddings** (Low Cost)
- ✅ Already optimized: Uses cheapest embedding model
- ✅ Already optimized: Uses gpt-3.5-turbo for metadata (not gpt-4o)
- 💡 **Consider:** No changes needed - already very cost-effective

### 5. **Semantic Search** (Very Low Cost)
- ✅ Already optimized: Only processes query, not documents
- 💡 **Consider:** No changes needed - already very cost-effective

---

## Monthly Cost Projections

### Scenario 1: 100 Active Users (Free Tier)
- 10 documents/user/month = 1,000 notes generations
- 5 quizzes/user/month = 500 quiz generations
- **Estimated Monthly Cost:** $1,500-$3,000 (mostly notes generation)

### Scenario 2: 100 Active Users (50% Free, 50% Pro)
- Free users: 500 notes + 250 quizzes = ~$1,125/month
- Pro users: 500 notes + 250 quizzes + diagram analysis = ~$1,500/month
- **Estimated Monthly Cost:** $2,625/month

### Scenario 3: 1,000 Active Users (Free Tier)
- 10,000 notes generations/month
- 5,000 quiz generations/month
- **Estimated Monthly Cost:** $15,000-$30,000/month

---

## Key Takeaways

1. **Study Notes Generation is BY FAR the most expensive feature** - accounts for 60-70% of total costs
2. **Quiz Generation is the second most expensive** - accounts for 20-30% of total costs
3. **PDF Parsing costs NOTHING** - it's local processing
4. **Embeddings and Semantic Search are very cheap** - negligible cost
5. **Diagram Analysis is expensive but disabled for free tier** - good cost control

## Action Items

1. ✅ **Already Done:** Diagram analysis disabled for free tier
2. 💡 **Consider:** Add caching for notes/quizzes to reduce duplicate API calls
3. 💡 **Consider:** Add max_tokens limit to notes generation
4. 💡 **Consider:** Monitor actual token usage and adjust limits accordingly
5. 💡 **Consider:** Implement rate limiting based on subscription tier

