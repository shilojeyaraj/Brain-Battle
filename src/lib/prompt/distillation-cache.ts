import { createHash } from "crypto"

type CacheEntry = { value: string; ts: number }

// Simple in-memory LRU-ish cache
const CACHE_LIMIT = 50
const cache = new Map<string, CacheEntry>()

function evictIfNeeded() {
  if (cache.size <= CACHE_LIMIT) return
  // Evict oldest entry
  let oldestKey: string | null = null
  let oldestTs = Number.POSITIVE_INFINITY
  for (const [key, entry] of cache.entries()) {
    if (entry.ts < oldestTs) {
      oldestTs = entry.ts
      oldestKey = key
    }
  }
  if (oldestKey) cache.delete(oldestKey)
}

export function hashKey(parts: string[]): string {
  const h = createHash("sha256")
  for (const part of parts) {
    h.update(part || "")
    h.update("\u241E") // record separator
  }
  return h.digest("hex")
}

export async function getOrSetDistillation(
  keyParts: string[],
  compute: () => string | Promise<string>
): Promise<string> {
  const key = hashKey(keyParts)
  const hit = cache.get(key)
  if (hit) {
    return hit.value
  }
  const value = await compute()
  cache.set(key, { value, ts: Date.now() })
  evictIfNeeded()
  return value
}
