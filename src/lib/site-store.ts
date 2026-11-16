export type CustomFolder = { id: string; label: string }

export type AddedSite = {
  id: string
  title: string
  description: string
  url: string
  /** Icon address; empty means "draw the first letter instead". */
  icon?: string
  /** Folder id: one of the shipped folders, or a custom one. */
  folder: string
}

export type SitePatch = {
  title?: string
  url?: string
  description?: string
  icon?: string
}

export type SiteStoreData = {
  /** Sites the user created. */
  added: AddedSite[]
  /** Edits applied on top of a shipped site, keyed by its id. */
  overrides: Record<string, SitePatch>
  /** Shipped sites the user removed. */
  hidden: string[]
  /** Shipped sites the user filed under another folder: site id to folder id. */
  moved: Record<string, string>
  /** Folders the user created. */
  folders: CustomFolder[]
  /** Manual order per folder; ids not listed keep their natural position. */
  order: Record<string, string[]>
}

const STORAGE_KEY = "yourtj-nav-sites"

export const EMPTY_SITE_STORE: SiteStoreData = {
  added: [],
  overrides: {},
  hidden: [],
  moved: {},
  folders: [],
  order: {},
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Anything malformed is dropped rather than crashing the page on boot. */
export function readSiteStore(): SiteStoreData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_SITE_STORE
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return EMPTY_SITE_STORE

    const added = Array.isArray(parsed.added)
      ? parsed.added.flatMap((entry): AddedSite[] => {
          if (!isRecord(entry)) return []
          const { id, title, url, folder } = entry
          if (typeof id !== "string" || typeof title !== "string" || typeof url !== "string") {
            return []
          }
          if (typeof folder !== "string") return []
          return [
            {
              id,
              title,
              url,
              folder,
              description: typeof entry.description === "string" ? entry.description : "",
              // Dropping this here used to turn every custom icon back into a letter on reload.
              ...(typeof entry.icon === "string" && entry.icon ? { icon: entry.icon } : {}),
            },
          ]
        })
      : []

    const folders = Array.isArray(parsed.folders)
      ? parsed.folders.flatMap((entry): CustomFolder[] => {
          if (!isRecord(entry)) return []
          const { id, label } = entry
          if (typeof id !== "string" || typeof label !== "string") return []
          return [{ id, label }]
        })
      : []

    const overrides = isRecord(parsed.overrides)
      ? (parsed.overrides as Record<string, SitePatch>)
      : {}
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((id): id is string => typeof id === "string")
      : []
    const moved: Record<string, string> = {}
    if (isRecord(parsed.moved)) {
      for (const [id, folder] of Object.entries(parsed.moved)) {
        if (typeof folder === "string") moved[id] = folder
      }
    }
    const order: Record<string, string[]> = {}
    if (isRecord(parsed.order)) {
      for (const [folder, ids] of Object.entries(parsed.order)) {
        if (Array.isArray(ids)) {
          order[folder] = ids.filter((id): id is string => typeof id === "string")
        }
      }
    }

    return { added, overrides, hidden, moved, folders, order }
  } catch {
    return EMPTY_SITE_STORE
  }
}

export function writeSiteStore(data: SiteStoreData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Quota or private mode: the change holds for this session only.
  }
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Accepts what people paste: with or without a scheme, with or without a path. */
export function normalizeUrl(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withScheme)
    if (!url.hostname.includes(".")) return null
    return url.toString()
  } catch {
    return null
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}
