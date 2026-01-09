# Prompt Rules (Canonical)

## Core Directives
- Extract only from provided content; never invent facts
- Output valid JSON matching schema exactly
- Cite pages: `(p. N)` or sections when available
- Keep content document-specific, not generic

## Notes Generation
- Extract: title, subject, education_level, difficulty_level, outline (5-10), key_terms (8-12), concepts (4-8), formulas (all), diagrams (3-8), practice_questions (8-15), resources
- Outline: Use specific headings/examples/formulas from doc, not generic summaries
- Formulas: Preserve exact notation, variables, page refs
- Diagrams: Describe content, include page refs
- JSON: Match notesSchema structure

## Quiz Generation
- Generate exact requested quantity
- Reference specific facts/formulas/examples from material
- Include explanations and citations
