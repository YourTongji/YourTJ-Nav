const KEY = "yourtj-nav-pins"

export function readPins(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))]
  } catch {
    return []
  }
}

export function writePins(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Storage disabled: the row still works for this session.
  }
}
