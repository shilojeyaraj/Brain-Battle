/**
 * Lightweight distillation helper to keep prompts lean.
 * - Removes duplicate lines
 * - Keeps headings/formulas/examples if obvious
 * - Caps total length
 */
export function distillContent(
  fileContents: string[],
  maxLength = 8000
): string {
  const joined = fileContents.join("\n")
  if (!joined) return ""

  // Split into lines, trim, drop empties
  const lines = joined
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Deduplicate lines while preserving order
  const seen = new Set<string>()
  const unique = []
  for (const line of lines) {
    if (seen.has(line)) continue
    seen.add(line)
    unique.push(line)
  }

  // Prefer heading-like or formula-like lines
  const prioritized = unique.filter(
    (l) =>
      /^[A-Z].{0,120}$/.test(l) || // short headings
      /[:;]/.test(l) || // lists/definitions
      /[=<>±√∑πµΩ]/.test(l) // formulas/symbols
  )

  const fallback = prioritized.length > 0 ? prioritized : unique
  let result = ""
  for (const line of fallback) {
    const next = result ? result + "\n" + line : line
    if (next.length > maxLength) break
    result = next
  }

  // If still too long, hard truncate
  if (result.length > maxLength) {
    result = result.slice(0, maxLength) + "\n...[truncated]"
  }

  return result
}
