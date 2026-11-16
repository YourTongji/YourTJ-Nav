import { useCallback, useEffect, useRef, useState } from "react"

import {
  bust,
  defaultSourceId,
  findSource,
  type WallpaperSource,
  type WallpaperSourceId,
} from "@/data/wallpapers"
import {
  deleteCustomWallpaper,
  listCustomWallpapers,
  saveCustomWallpaper,
} from "@/lib/wallpaper-store"

export type WallpaperPicture = {
  url: string
  /** False when the address came from a random-redirect endpoint, so a preview
   *  of it would fetch a different picture. */
  exact: boolean
  /** True for the bundled gradient we show when nothing else loaded. */
  fallback?: boolean
}

export type CustomWallpaper = { id: string; url: string; addedAt: number }

type Layers = { a: WallpaperPicture | null; b: WallpaperPicture | null; active: 0 | 1 }
export type WallpaperStatus = "idle" | "loading" | "ready" | "error"

const SOURCE_KEY = "yourtj-nav-wallpaper"
const LAST_KEY = "yourtj-nav-wallpaper-last"
const ACTIVE_CUSTOM_KEY = "yourtj-nav-wallpaper-custom"

/** Bundled, local, instant: the floor under every network path. */
const FALLBACK_URL = `${import.meta.env.BASE_URL}wallpaper-fallback.svg`

/** How long a resolved picture stays good enough to skip the network entirely. */
const FRESH_MS = 6 * 60 * 60 * 1000
const JSON_TIMEOUT_MS = 3000
const IMAGE_TIMEOUT_MS = 5000

type CachedPicture = { url: string; exact: boolean; at: number }
type LastMap = Partial<Record<WallpaperSourceId, CachedPicture>>

function readSource(): WallpaperSourceId {
  try {
    const saved = window.localStorage.getItem(SOURCE_KEY)
    if (saved === "anime" || saved === "landscape" || saved === "custom") return saved
  } catch {
    // Storage disabled: fall through to the default source.
  }
  return defaultSourceId
}

function readActiveCustom(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CUSTOM_KEY)
  } catch {
    return null
  }
}

function writeActiveCustom(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_CUSTOM_KEY, id)
    else window.localStorage.removeItem(ACTIVE_CUSTOM_KEY)
  } catch {
    // Choice stays in memory when storage is unavailable.
  }
}

function readLast(): LastMap {
  try {
    const raw = window.localStorage.getItem(LAST_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: LastMap = {}
    for (const id of ["anime", "landscape"] as const) {
      const entry = parsed?.[id]
      if (!entry || typeof entry !== "object") continue
      const { url, exact, at } = entry as Record<string, unknown>
      if (typeof url === "string" && url.startsWith("http") && typeof at === "number") {
        out[id] = { url, exact: exact === true, at }
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeLast(id: WallpaperSourceId, picture: WallpaperPicture) {
  try {
    const map = readLast()
    map[id] = { url: picture.url, exact: picture.exact, at: Date.now() }
    window.localStorage.setItem(LAST_KEY, JSON.stringify(map))
  } catch {
    // Storage full or disabled: the picture still shows, it just is not remembered.
  }
}

function shuffle<T>(list: readonly T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** One JSON endpoint, hard-capped: a hanging request must not hold the wallpaper. */
async function fetchJsonUrl(endpoint: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), JSON_TIMEOUT_MS)
  try {
    const response = await fetch(bust(endpoint), {
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) return null
    const data = (await response.json()) as { url?: unknown }
    return typeof data.url === "string" && data.url.startsWith("http") ? data.url : null
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

/** Does this address actually paint? A 404 or a dead CDN must not become a black page. */
function decodes(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ok)
    }
    const timer = window.setTimeout(() => finish(false), IMAGE_TIMEOUT_MS)
    const image = new Image()
    image.onload = () => finish(true)
    image.onerror = () => finish(false)
    image.src = url
  })
}

/**
 * Resolves one picture that is known to render, trying the naming endpoints
 * first and the random-redirect ones after. Returns null only when every
 * candidate failed, in which case the caller keeps the bundled gradient.
 */
async function resolvePicture(source: WallpaperSource): Promise<WallpaperPicture | null> {
  const candidates: WallpaperPicture[] = []

  for (const endpoint of shuffle(source.json)) {
    const url = await fetchJsonUrl(endpoint)
    if (url) {
      candidates.push({ url, exact: true })
      break
    }
  }

  for (const url of shuffle(source.fallback)) {
    candidates.push({ url, exact: false })
  }

  for (const picture of candidates) {
    if (await decodes(picture.url)) return picture
  }

  return null
}

/**
 * Two image slots that cross-fade. Each slot is an <img>, and it is only faded
 * in once it has decoded, so a slow endpoint never flashes an empty layer.
 *
 * Nothing here ever waits on the network to paint: a cached picture or the
 * bundled gradient is on screen from the first frame, and a resolved picture
 * replaces it whenever it arrives.
 *
 * Uploads are kept as a list, not a single slot: clicking "自定义" shows what
 * you already added, so switching back to a wallpaper you used last week does
 * not mean finding the file again.
 */
export function useWallpaper() {
  const [layers, setLayers] = useState<Layers>({ a: null, b: null, active: 0 })
  const [source, setSourceState] = useState<WallpaperSourceId>(readSource)
  const [status, setStatus] = useState<WallpaperStatus>("idle")
  const [customs, setCustoms] = useState<CustomWallpaper[]>([])
  const [activeCustom, setActiveCustom] = useState<string | null>(readActiveCustom)
  const urls = useRef(new Map<string, string>())
  const requestId = useRef(0)

  const commit = useCallback((picture: WallpaperPicture) => {
    setLayers((prev) => {
      const current = prev.active === 0 ? prev.a : prev.b
      if (current?.url === picture.url) return prev
      if (prev.a === null) return { ...prev, a: picture, active: 0 }
      if (prev.b === null) return { ...prev, b: picture, active: 1 }
      return prev.active === 0
        ? { ...prev, b: picture, active: 1 }
        : { ...prev, a: picture, active: 0 }
    })
  }, [])

  /** Guarantees something is painted before any request is made. */
  const seed = useCallback((picture: WallpaperPicture) => {
    setLayers((prev) => {
      if (prev.a || prev.b) return prev
      return { a: picture, b: null, active: 0 }
    })
  }, [])

  const markReady = useCallback(() => setStatus("ready"), [])

  /** The active picture failed to render: show the bundled gradient instead. */
  const fail = useCallback(() => {
    setStatus("error")
    setLayers((prev) => {
      const current = prev.active === 0 ? prev.a : prev.b
      if (current?.fallback) return prev
      const next: WallpaperPicture = { url: FALLBACK_URL, exact: true, fallback: true }
      return prev.active === 0
        ? { ...prev, b: next, active: 1 }
        : { ...prev, a: next, active: 0 }
    })
  }, [])

  /** Re-reads the uploads, keeping object URLs for the ones already on screen. */
  const refreshCustoms = useCallback(async () => {
    const entries = await listCustomWallpapers()
    const seen = new Set<string>()
    const next: CustomWallpaper[] = entries.map((entry) => {
      let url = urls.current.get(entry.id)
      if (!url) {
        url = URL.createObjectURL(entry.blob)
        urls.current.set(entry.id, url)
      }
      seen.add(entry.id)
      return { id: entry.id, url, addedAt: entry.addedAt }
    })
    for (const [id, url] of urls.current) {
      if (seen.has(id)) continue
      URL.revokeObjectURL(url)
      urls.current.delete(id)
    }
    setCustoms(next)
    return next
  }, [])

  const roll = useCallback(
    async (id: WallpaperSourceId, options?: { force?: boolean }) => {
      const ticket = ++requestId.current
      if (id === "custom") return

      const cached = readLast()[id]
      if (!options?.force && cached && Date.now() - cached.at < FRESH_MS) {
        commit({ url: cached.url, exact: cached.exact })
        return
      }

      setStatus("loading")
      const picture = await resolvePicture(findSource(id))
      if (ticket !== requestId.current) return

      if (picture) {
        commit(picture)
        writeLast(id, picture)
      } else {
        // Every candidate failed. Whatever is already painted stays.
        setStatus("error")
      }
    },
    [commit],
  )

  // Whatever we can paint without the network, paint it now.
  useEffect(() => {
    if (source === "custom") {
      seed({ url: FALLBACK_URL, exact: true, fallback: true })
      let cancelled = false
      void refreshCustoms().then((list) => {
        if (cancelled) return
        const pick = list.find((item) => item.id === readActiveCustom()) ?? list[0]
        if (!pick) return
        setActiveCustom(pick.id)
        writeActiveCustom(pick.id)
        commit({ url: pick.url, exact: true })
      })
      return () => {
        cancelled = true
      }
    }

    const cached = readLast()[source]
    if (cached && Date.now() - cached.at < FRESH_MS) {
      commit({ url: cached.url, exact: cached.exact })
      return
    }

    seed({ url: FALLBACK_URL, exact: true, fallback: true })
    void roll(source)
  }, [source, commit, roll, seed, refreshCustoms])

  // Load the gallery once, so the panel has something to show even before the
  // custom source is picked.
  useEffect(() => {
    void refreshCustoms()
  }, [refreshCustoms])

  useEffect(() => {
    const map = urls.current
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url)
      map.clear()
    }
  }, [])

  const setSource = useCallback((id: WallpaperSourceId) => {
    setSourceState(id)
    try {
      window.localStorage.setItem(SOURCE_KEY, id)
    } catch {
      // Choice stays in memory when storage is unavailable.
    }
  }, [])

  /** "换一张" always goes to the network; the cache only serves first paint. */
  const refresh = useCallback(() => void roll(source, { force: true }), [roll, source])

  const selectCustom = useCallback(
    (id: string) => {
      const pick = customs.find((item) => item.id === id)
      if (!pick) return
      setActiveCustom(pick.id)
      writeActiveCustom(pick.id)
      commit({ url: pick.url, exact: true })
    },
    [commit, customs],
  )

  const upload = useCallback(
    async (file: File) => {
      try {
        const entry = await saveCustomWallpaper(file)
        const list = await refreshCustoms()
        const pick = list.find((item) => item.id === entry.id) ?? list[0]
        if (!pick) return
        setActiveCustom(pick.id)
        writeActiveCustom(pick.id)
        setSourceState("custom")
        try {
          window.localStorage.setItem(SOURCE_KEY, "custom")
        } catch {
          // Ignore: the picture still shows for this session.
        }
        commit({ url: pick.url, exact: true })
      } catch {
        setStatus("error")
      }
    },
    [commit, refreshCustoms],
  )

  const removeCustom = useCallback(
    async (id: string) => {
      await deleteCustomWallpaper(id)
      const list = await refreshCustoms()
      if (activeCustom !== id) return
      const next = list[0]
      if (next) {
        setActiveCustom(next.id)
        writeActiveCustom(next.id)
        commit({ url: next.url, exact: true })
        return
      }
      setActiveCustom(null)
      writeActiveCustom(null)
      setSource("anime")
    },
    [activeCustom, commit, refreshCustoms, setSource],
  )

  const current = layers.active === 0 ? layers.a : layers.b

  return {
    layers,
    current,
    status,
    source,
    customs,
    activeCustom,
    hasCustom: customs.length > 0,
    markReady,
    fail,
    refresh,
    setSource,
    selectCustom,
    upload,
    removeCustom,
  }
}

export type WallpaperController = ReturnType<typeof useWallpaper>
