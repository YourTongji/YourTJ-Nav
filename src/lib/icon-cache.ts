/**
 * Keeps icons quick from the second visit on. The browser's HTTP cache already
 * holds the files; what it cannot remember is an icon that failed, which would
 * otherwise cost a request and a broken-image frame on every load. Misses are
 * remembered for three days, then tried again.
 */

const MISS_KEY = "yourtj-nav-icon-miss"
const MISS_TTL = 3 * 24 * 60 * 60 * 1000
const MISS_MAX = 200

let misses: Record<string, number> | null = null

function readMisses() {
  if (misses) return misses
  misses = {}
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(MISS_KEY) ?? "{}")
    if (typeof parsed === "object" && parsed !== null) {
      const now = Date.now()
      for (const [src, at] of Object.entries(parsed)) {
        if (typeof at === "number" && now - at < MISS_TTL) misses[src] = at
      }
    }
  } catch {
    // Unreadable: start empty.
  }
  return misses
}

function writeMisses() {
  try {
    const entries = Object.entries(readMisses()).sort((a, b) => b[1] - a[1]).slice(0, MISS_MAX)
    window.localStorage.setItem(MISS_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Private mode: remembered for this session.
  }
}

export function isMissing(src: string) {
  return src in readMisses()
}

export function markMissing(src: string) {
  // Offline, everything fails; that says nothing about the icon.
  if (src.startsWith("data:") || !navigator.onLine) return
  readMisses()[src] = Date.now()
  writeMisses()
}

export function clearMissing(src: string) {
  if (!isMissing(src)) return
  delete readMisses()[src]
  writeMisses()
}

const warmed = new Set<string>()

/**
 * Fetches and decodes icons while the page is idle, so a folder switch or a
 * page turn paints them from memory instead of the network.
 */
export function warmIcons(srcs: string[]) {
  const queue = srcs.filter((src) => !src.startsWith("data:") && !warmed.has(src) && !isMissing(src))
  if (!queue.length) return () => {}
  const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 200))
  const cancel = window.cancelIdleCallback ?? window.clearTimeout
  let handle = 0

  const step = (deadline?: IdleDeadline) => {
    // A few at a time, inside the idle budget where the browser gives one.
    while (queue.length && (!deadline || deadline.timeRemaining() > 4)) {
      const src = queue.shift() as string
      warmed.add(src)
      const image = new Image()
      image.decoding = "async"
      image.onerror = () => markMissing(src)
      image.src = src
      image.decode?.().catch(() => {})
      if (!deadline) break
    }
    if (queue.length) handle = idle(step)
  }
  handle = idle(step)
  return () => cancel(handle)
}
