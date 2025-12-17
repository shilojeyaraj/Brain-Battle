import { promises as fs } from "fs"
import path from "path"

let cachedRules: string | null = null

/**
 * Load the shared prompt rules from prompt/rules.md
 * Cached per process to avoid repeated I/O.
 */
export async function getPromptRules(): Promise<string> {
  if (cachedRules) return cachedRules

  const rulesPath = path.join(process.cwd(), "prompt", "rules.md")
  const contents = await fs.readFile(rulesPath, "utf-8")
  cachedRules = contents.trim()
  return cachedRules
}
