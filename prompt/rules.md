# Prompt Rules (Canonical)

## Core Directives
- Extract only from provided content; never invent facts
- Output valid JSON matching schema exactly
- Cite pages: `(p. N)` or sections when available
- Keep content document-specific, not generic
- Every section must be populated thoroughly

## Notes Generation
- Extract: title, subject, education_level, difficulty_level, complexity_analysis, outline (5-10), key_terms (8-12), concepts (4-8), formulas (all), diagrams (3-8), practice_questions (8-15), resources, study_tips, common_misconceptions
- Outline: Use specific headings/examples/formulas from doc with page refs, not generic summaries
- Key terms: Include precise definitions quoted from document with importance levels
- Concepts: Each needs heading, 3-5 detailed bullets, examples, and connections
- Formulas: Preserve exact notation, define all variables, include page refs and example calculations
- Practice questions: Mix types (multiple_choice, open_ended, true_false, fill_blank), reference document specifics, include explanations
- Resources: Suggest relevant external links, videos, and simulations
- Diagrams: Describe content and provide search keywords for web image enrichment

## Quiz Generation
- Generate exact requested quantity
- Reference specific facts/formulas/examples from material
- Include explanations and citations
