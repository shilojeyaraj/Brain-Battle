# Current Prompt Baseline (Pre-Optimization)

This document captures the prompt structure before optimization for reference.

**Date:** 2026-01-09  
**Purpose:** Document current prompt structure before optimization to ensure we can compare and revert if needed.

## Current Prompt Structure

### 1. Rules File (`prompt/rules.md`)

**Size:** ~1,500 characters

**Content:**
- Shared System Directives (9 points)
- Notes Task Directives (8 points with examples)
- Quiz Task Directives (6 points with examples)
- Response Format (2 points)
- Style & Quality (3 points)

**Key Sections:**
- Role definition
- Output format requirements
- Citation requirements
- Diagram/image handling
- Safety guidelines
- Notes-specific extraction requirements
- Quiz-specific generation requirements
- Examples of good vs bad outputs

### 2. System Prompt (in `src/app/api/notes/route.ts`)

**Current Implementation:**
```typescript
const systemPrompt = `${rules}

TASK: Generate study notes as JSON matching notesSchema. Never invent facts; use only provided content. Cite pages. Keep outputs concise and schema-valid.
`
```

**Size:** ~1,800-2,000 characters (rules + task directive)

**Components:**
- Full rules.md content (~1,500 chars)
- Task directive (~300 chars)

### 3. User Prompt (in `src/app/api/notes/route.ts`)

**Current Implementation:**
```typescript
const userPrompt = `DOCUMENT SNAPSHOT (distilled, capped 8k chars):
${distilledContent || '[no text extracted]'}

FILES: ${fileNames.join(', ') || 'uploaded files'}
TOTAL CHARS: ${fileContents.join('').length}

STUDY INSTRUCTIONS: ${instructions || 'Use the document content to create comprehensive study notes. If no topic, infer from content.'}
${fileContents.length > 1 ? 'Multiple documents: keep examples/formulas tied to the correct source (use page/file names).' : ''}

IMAGES: ${extractedImages.length} extracted images${extractedImages.length ? ' (reference by page; image data available separately)' : ' (none)'}

CONTEXT: ${contextInstructions || '[none]'}

REQUIREMENTS:
- Use only the provided content; cite (p. N) or sections.
- Outline items must be document-specific (titles/examples/formulas), not generic.
- Extract every formula with exact notation and variable meanings.
- Extract every concept/key term with page refs.
- Describe diagrams if present; include page refs.
- Practice questions must reference document specifics (formulas/examples/diagrams).
- Return valid JSON only, matching notesSchema.`
```

**Size Breakdown:**
- Header: ~50 chars
- Distilled content: ~8,000 chars (max)
- Files line: ~50-200 chars
- Total chars line: ~30 chars
- Study instructions: ~100-200 chars
- Multiple docs note: ~100 chars (conditional)
- Images line: ~50-100 chars
- Context line: ~50-200 chars
- Requirements section: ~400 chars

**Total User Prompt:** ~9,000-10,000 characters

### 4. Distillation Settings

**Current:** `distillContent(fileContents, 8000)`

**Function:** `src/lib/prompt/distillation.ts`
- Removes duplicate lines
- Prioritizes headings, formulas, and structured content
- Caps at 8,000 characters
- Hard truncates if still too long

## Total Prompt Size

**System Prompt:** ~1,800-2,000 characters  
**User Prompt:** ~9,000-10,000 characters  
**Total:** ~10,800-12,000 characters per request

## Redundancies Identified

1. **Rules file repeats in system prompt** - Full rules.md is included verbatim
2. **Requirements section duplicates rules** - User prompt repeats what's in rules.md
3. **Verbose labels** - "DOCUMENT SNAPSHOT (distilled, capped 8k chars)" is unnecessarily long
4. **Redundant instructions** - Multiple ways of saying "use only provided content"
5. **Unnecessary metadata** - "TOTAL CHARS" line doesn't help the model
6. **Conditional text** - Some conditional text could be simplified

## Optimization Opportunities

1. **Streamline rules.md** - Remove redundancy, keep only essential directives
2. **Simplify system prompt** - Reference rules without full duplication
3. **Compact user prompt** - Remove redundant requirements, use shorter labels
4. **Reduce distillation size** - From 8,000 to 6,000 chars (still sufficient for quality)
5. **Remove unnecessary metadata** - Drop "TOTAL CHARS" and verbose labels

## Expected Savings

- System prompt: ~1,800 → ~300 chars (saves ~1,500 chars)
- User prompt: ~9,000 → ~8,500 chars (saves ~500 chars)
- Distillation: 8,000 → 6,000 chars (saves ~2,000 chars)
- **Total reduction: ~4,000 characters (~30-35% reduction)**

## Notes

- Quality should be maintained as core requirements remain in rules.md
- Schema structure is still enforced via `responseFormat: 'json_object'` in API call
- Model should understand requirements from streamlined rules + schema validation

