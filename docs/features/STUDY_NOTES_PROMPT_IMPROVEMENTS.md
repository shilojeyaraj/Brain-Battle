# Study Notes Prompt Improvements

Date: 2025-11-25

## Goals

- Reduce duplicated or off-topic quiz questions.
- Ensure section content and questions stay aligned with their specific topic.
- Make formula entries more precise and better tied to examples.
- Improve diagram usage across all subjects and grade levels.

## Changes Applied

### 1. Section-Local Topic Control

**Where:** `src/app/api/notes/route.ts` in the `systemPrompt` for `/api/notes`.

**What we added:**
- Rules that each section (topic) must only describe and ask questions about its own concept unless the original document is explicitly comparing multiple concepts.
- Comparison sections (e.g., time/space complexity tables, summary sections) are allowed to talk about multiple concepts but are forbidden from repeating full algorithm/definition blocks.
- Validation-style guidance telling the model to mentally reject output where quiz questions in a section are clearly about another topic.

**Why:**
- Prevents issues like Selection Sort and Heap Sort sections containing Bubble Sort questions.
- Generalizes to any subject (physics formulas, biology processes, history events, etc.).

### 2. Quiz Question De-duplication Rules

**What we added:**
- Prompt-level guidance that:
  - Quiz questions must be semantically distinct within a section.
  - The model should avoid reusing essentially the same question text across sections.
- Explicit self-check asking the model to internally reject and regenerate if most questions are just rephrasings of earlier ones.

**Why:**
- Reduces repeated questions like “What is the time complexity of Bubble Sort?” appearing under multiple unrelated sections.

### 3. Formula & Example Accuracy

**What we added:**
- Generic, subject-agnostic rules:
  - Each formula must come directly from the document (or be an obvious rearrangement) and include a page reference.
  - When the document shows a numeric example (e.g., \(n = 5\) for an \(O(n^2)\) algorithm), the notes should show the calculation linking formula → example.
  - The model should avoid inventing new numeric examples that are not clearly implied by the document.

**Why:**
- Keeps formulas and worked examples consistent with the slides/notes the user uploaded.
- Works for algorithms, physics, chemistry, math, etc.

### 4. Diagram Usage Rules

**What we added:**
- Stronger instructions that:
  - Diagrams must be associated with the sections whose pages they appear on.
  - Each section should reference and briefly explain its diagrams (e.g., what the trace or graph actually shows).
  - Notes should be rejected if diagrams exist on a section’s pages but related diagram references are missing.

**Why:**
- Ensures diagrams and figures in PDFs become part of the actual learning experience instead of being ignored.

### 5. Education Level Guidance (Generalized)

**What we added:**
- Prompt text that:
  - Uses the inferred education level to control how things are explained (language, depth, notation), not what facts are used.
  - Emphasizes that all facts must still come from the document, even for lower or higher grade levels.

**Why:**
- Makes notes more appropriate for elementary vs. high school vs. university content while staying grounded in the original material.

## Expected Impact

- More accurate, document-specific notes for all subjects.
- Fewer repeated or cross-topic quiz questions.
- Better alignment between formulas, numeric examples, and the original slides.
- More consistent use of diagrams and visuals in notes.

## Next Steps / Ideas

- Consider a multi-pass pipeline where each major topic/section is generated separately using only its pages.
- Add lightweight post-processing on the server to automatically de-duplicate quiz questions across sections.
- Log a small sample of notes before/after these changes to quantitatively evaluate improvements.


