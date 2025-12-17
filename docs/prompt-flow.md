# Prompt Flow (Notes & Quizzes)

## What changed
- Canonical rules now live in `prompt/rules.md`.
- Prompts load the shared rules once per process and add only request-specific context.
- Content fed to the model is distilled and capped (default 8k chars) to cut prompt size and latency.

## How it works
1. Load rules: `getPromptRules()` (cached) → system prompt.
2. Distill source: `distillContent(fileContents, 8000)` keeps headings/formulas/examples, dedupes lines, trims to budget.
3. Build user prompt: include distilled snapshot, file names, instructions, images count, context prefs, and concise requirements.
4. Call model: Moonshot via OpenRouter, low temperature, reduced `maxTokens` (notes: 16k) since prompt is leaner.
5. Enrichment (diagrams/videos/embeddings) remains async and non-blocking.

## Files
- `prompt/rules.md`: shared directives for notes + quiz.
- `src/lib/prompt/rules-loader.ts`: cached loader for rules.
- `src/lib/prompt/distillation.ts`: lightweight distiller to keep context under budget.

## Expected impact
- Smaller prompt → fewer prompt tokens and faster completions.
- Typical notes runs should see ~2–3x faster AI step on medium docs, with similar output quality due to schema and rules.
- Distillation results are cached in-process by hash of content + settings to avoid recomputing for repeated runs.
