/**
 * Utility to normalize expected_answers to always be an array
 * Handles cases where expected_answers might be a string, null, or other types
 */
export function normalizeExpectedAnswers(expected: any): string[] {
  if (Array.isArray(expected)) {
    return expected.map(e => String(e))
  }
  if (typeof expected === 'string') {
    return [expected]
  }
  if (expected != null) {
    return [String(expected)]
  }
  return []
}

