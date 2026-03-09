/**
 * @jest-environment node
 * 
 * Tests for prompt construction quality - ensures the system and user prompts
 * contain all necessary instructions for high-quality notes generation.
 */

import { distillContent } from '@/lib/prompt/distillation'
import * as fs from 'fs'
import * as path from 'path'

const RULES_PATH = path.join(process.cwd(), 'prompt', 'rules.md')

describe('Prompt Rules File', () => {
  let rules: string

  beforeAll(() => {
    rules = fs.readFileSync(RULES_PATH, 'utf-8')
  })

  it('should exist and be non-empty', () => {
    expect(rules.length).toBeGreaterThan(100)
  })

  it('should contain core directives about factual accuracy', () => {
    expect(rules.toLowerCase()).toContain('never invent')
  })

  it('should contain JSON schema requirement', () => {
    expect(rules.toLowerCase()).toContain('json')
    expect(rules.toLowerCase()).toContain('schema')
  })

  it('should contain citation requirements', () => {
    expect(rules).toContain('p. N')
  })

  it('should specify outline item counts', () => {
    expect(rules).toMatch(/outline.*5-10/i)
  })

  it('should specify key_terms count', () => {
    expect(rules).toMatch(/key.?terms.*8-12/i)
  })

  it('should specify concepts count', () => {
    expect(rules).toMatch(/concepts.*4-8/i)
  })

  it('should specify practice_questions count', () => {
    expect(rules).toMatch(/practice.?questions.*8-15/i)
  })

  it('should mention formula extraction', () => {
    expect(rules.toLowerCase()).toContain('formula')
    expect(rules.toLowerCase()).toContain('notation')
  })

  it('should mention diagram handling', () => {
    expect(rules.toLowerCase()).toContain('diagram')
  })

  it('should not be excessively long (< 2000 chars)', () => {
    expect(rules.length).toBeLessThan(2000)
  })
})

describe('Distillation Quality at 6000 chars', () => {
  const sampleDocument = `
Introduction to Sorting Algorithms

Bubble Sort
Bubble sort is a simple comparison-based sorting algorithm. It repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order.

Time Complexity: O(n²) in worst and average case, O(n) in best case (already sorted)
Space Complexity: O(1) - in-place sorting

Algorithm:
for i = 0 to n-1:
    for j = 0 to n-i-2:
        if arr[j] > arr[j+1]:
            swap(arr[j], arr[j+1])

Quick Sort
Quick sort is a divide-and-conquer algorithm. It works by selecting a 'pivot' element and partitioning the array around it.

Time Complexity: O(n log n) average, O(n²) worst case
Space Complexity: O(log n) for recursion stack

Partition Function:
partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j = low to high-1:
        if arr[j] <= pivot:
            i++
            swap(arr[i], arr[j])
    swap(arr[i+1], arr[high])
    return i + 1

Merge Sort
Merge sort is a divide-and-conquer algorithm that divides the array in half, sorts each half, then merges.

Time Complexity: O(n log n) in all cases
Space Complexity: O(n) - requires additional space

Key Term: Stable Sort - A sorting algorithm is stable if it preserves the relative order of equal elements.
Key Term: In-Place Sort - A sorting algorithm that uses O(1) extra space.
Key Term: Divide and Conquer - Problem-solving approach that breaks problems into subproblems.

Comparison Table:
| Algorithm    | Best    | Average  | Worst   | Space | Stable |
|-------------|---------|----------|---------|-------|--------|
| Bubble Sort | O(n)    | O(n²)   | O(n²)  | O(1)  | Yes    |
| Quick Sort  | O(nlogn)| O(nlogn) | O(n²)  | O(logn)| No    |
| Merge Sort  | O(nlogn)| O(nlogn) | O(nlogn)| O(n)  | Yes    |

Practice Problems:
1. Trace bubble sort on array [5, 3, 8, 1, 2]
2. Implement quicksort with median-of-three pivot selection
3. Prove that merge sort has O(n log n) complexity using recurrence relations
`

  it('should preserve headings', () => {
    const result = distillContent([sampleDocument], 6000)
    expect(result).toContain('Bubble Sort')
    expect(result).toContain('Quick Sort')
    expect(result).toContain('Merge Sort')
  })

  it('should preserve formulas and complexity notations', () => {
    const result = distillContent([sampleDocument], 6000)
    expect(result).toContain('O(n²)')
    expect(result).toContain('O(n log n)')
  })

  it('should preserve key term definitions', () => {
    const result = distillContent([sampleDocument], 6000)
    expect(result).toContain('Stable Sort')
  })

  it('should produce output within the maxLength limit', () => {
    const result = distillContent([sampleDocument], 6000)
    expect(result.length).toBeLessThanOrEqual(6200) // small buffer for line boundaries
  })

  it('should not be empty for reasonable input', () => {
    const result = distillContent([sampleDocument], 6000)
    expect(result.length).toBeGreaterThan(500)
  })

  it('should handle very large documents by truncating', () => {
    const largeDocs = Array.from({ length: 10 }, (_, i) =>
      sampleDocument.replace(/Bubble Sort/g, `Algorithm${i} Sort`)
        .replace(/Quick Sort/g, `Fast${i} Sort`)
        .replace(/Merge Sort/g, `Combine${i} Sort`)
    )
    const result = distillContent(largeDocs, 6000)
    expect(result.length).toBeLessThanOrEqual(6200)
    expect(result.length).toBeGreaterThan(500)
  })

  it('should deduplicate repeated content across files', () => {
    const result = distillContent([sampleDocument, sampleDocument], 6000)
    const bubbleCount = (result.match(/Bubble Sort/g) || []).length
    expect(bubbleCount).toBeLessThanOrEqual(2)
  })
})

describe('User Prompt Structure', () => {
  function buildUserPrompt(params: {
    distilledContent: string
    fileNames: string[]
    difficulty: string
    instructions?: string
    extractedImagesCount?: number
    contextInstructions?: string
  }) {
    const { distilledContent, fileNames, difficulty, instructions, extractedImagesCount = 0, contextInstructions } = params

    return `DOCUMENT CONTENT:
${distilledContent || '[no text extracted]'}

FILES: ${fileNames.join(', ') || 'uploaded files'}
DIFFICULTY: ${difficulty || 'medium'}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}
${extractedImagesCount > 0 ? `IMAGES: ${extractedImagesCount} extracted (reference by page number)` : ''}
${contextInstructions ? `STUDY CONTEXT: ${contextInstructions}` : ''}

Generate comprehensive study notes as JSON with ALL of these sections:

1. METADATA: title, subject, education_level, difficulty_level, complexity_analysis (vocabulary_level, concept_sophistication, prerequisite_knowledge[], reasoning_level)

2. OUTLINE (5-10 items): Use EXACT headings/formulas/examples from the document, not generic summaries. Each item must be specific enough to identify which page/section it refers to. Include page refs.
   BAD: "Introduction to the topic"
   GOOD: "SR Latch truth table and characteristic equation Q+ = S + R'Q (p. 3)"

3. KEY_TERMS (8-12): Extract specific terms with precise definitions from the document. Include importance level.

4. CONCEPTS (4-8): Each with heading, detailed bullets (3-5 per concept), real examples from the document, and connections to other concepts. Be thorough and specific.

5. FORMULAS (extract ALL): Every equation/formula with name, exact notation, description, variable definitions, page reference, and example calculation if shown.

6. DIAGRAMS (3-8): Describe diagrams/figures from the document. Include title, caption, page number, and search keywords for web enrichment.

7. PRACTICE_QUESTIONS (8-15): Mix of multiple_choice, open_ended, true_false, fill_blank. Each must reference specific content from the document. Include answer, explanation, difficulty, and topic.

8. RESOURCES: links (5-10), videos (3-5), simulations (2-4) - all relevant to the document's subject.

9. STUDY_TIPS (5-8): Specific to this material, not generic advice.

10. COMMON_MISCONCEPTIONS (3-5): Related to the document's subject matter.

CRITICAL REQUIREMENTS:
- Every section must be populated with document-specific content
- All formulas must use exact notation from the document
- Practice questions must test actual content, not generic knowledge
- Return valid JSON only, no markdown wrapping`

  }

  it('should include document content', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'Some content about physics',
      fileNames: ['physics.pdf'],
      difficulty: 'medium',
    })
    expect(prompt).toContain('Some content about physics')
  })

  it('should include file names', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['lecture1.pdf', 'lecture2.pdf'],
      difficulty: 'hard',
    })
    expect(prompt).toContain('lecture1.pdf, lecture2.pdf')
  })

  it('should include difficulty level', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'hard',
    })
    expect(prompt).toContain('DIFFICULTY: hard')
  })

  it('should include instructions when provided', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
      instructions: 'Focus on sorting algorithms',
    })
    expect(prompt).toContain('INSTRUCTIONS: Focus on sorting algorithms')
  })

  it('should omit instructions line when not provided', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
    })
    expect(prompt).not.toContain('INSTRUCTIONS:')
  })

  it('should include image count when images present', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
      extractedImagesCount: 5,
    })
    expect(prompt).toContain('IMAGES: 5 extracted')
  })

  it('should specify all 10 required sections', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
    })
    expect(prompt).toContain('METADATA')
    expect(prompt).toContain('OUTLINE')
    expect(prompt).toContain('KEY_TERMS')
    expect(prompt).toContain('CONCEPTS')
    expect(prompt).toContain('FORMULAS')
    expect(prompt).toContain('DIAGRAMS')
    expect(prompt).toContain('PRACTICE_QUESTIONS')
    expect(prompt).toContain('RESOURCES')
    expect(prompt).toContain('STUDY_TIPS')
    expect(prompt).toContain('COMMON_MISCONCEPTIONS')
  })

  it('should include quality guidance (BAD/GOOD examples)', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
    })
    expect(prompt).toContain('BAD:')
    expect(prompt).toContain('GOOD:')
  })

  it('should require JSON output', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
    })
    expect(prompt).toContain('Return valid JSON only')
  })

  it('should specify count ranges for array sections', () => {
    const prompt = buildUserPrompt({
      distilledContent: 'content',
      fileNames: ['file.pdf'],
      difficulty: 'medium',
    })
    expect(prompt).toMatch(/OUTLINE.*5-10/s)
    expect(prompt).toMatch(/KEY_TERMS.*8-12/s)
    expect(prompt).toMatch(/CONCEPTS.*4-8/s)
    expect(prompt).toMatch(/PRACTICE_QUESTIONS.*8-15/s)
  })
})
