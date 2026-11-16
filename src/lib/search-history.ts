/** What was searched from this page, newest first. Queries only; nothing leaves the device. */

const STORAGE_KEY = "yourtj-nav-search-history"
const LIMIT = 20

export function readSearchHistory(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "").slice(0, LIMIT)
  } catch {
    return []
  }
}

function write(entries: string[]) {
  try {
    if (entries.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode: the history lasts for this session.
  }
  return entries
}

/** Moves a query to the top; the same words typed with other spacing or case count as one. */
export function pushSearchHistory(query: string): string[] {
  const value = query.trim()
  if (!value) return readSearchHistory()
  const key = value.toLowerCase()
  return write([value, ...readSearchHistory().filter((entry) => entry.toLowerCase() !== key)].slice(0, LIMIT))
}

export function removeSearchHistory(query: string): string[] {
  return write(readSearchHistory().filter((entry) => entry !== query))
}

export function clearSearchHistory(): string[] {
  return write([])
}
