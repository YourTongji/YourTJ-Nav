const STORAGE_KEY = "yourtj-nav-recent"
const LIMIT = 12

/** Most recent first, ids only: the site data itself stays in code. */
export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string").slice(0, LIMIT)
  } catch {
    return []
  }
}

export function pushRecent(id: string): string[] {
  const next = [id, ...readRecent().filter((entry) => entry !== id)].slice(0, LIMIT)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode: recents stay in memory for this session.
  }
  return next
}

/** Drop one id; the ones behind it move up to fill the row. */
export function removeRecent(id: string): string[] {
  const next = readRecent().filter((entry) => entry !== id)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode: recents stay in memory for this session.
  }
  return next
}

export function clearRecent() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}

export { LIMIT as RECENT_LIMIT }
