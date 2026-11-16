import type { Site } from "@/data/sites"
import { initialsOf } from "@/lib/pinyin"

/** Half-open ranges over the code points of a title. */
export type Ranges = [number, number][]

export type Suggestion =
  | { kind: "history"; text: string; ranges: Ranges }
  | { kind: "site"; site: Site; local: boolean; ranges: Ranges }

export type SuggestSource = {
  sites: Site[]
  /** Ids of the sites the user added on this device. */
  localIds: ReadonlySet<string>
  /** Recently opened site ids, newest first: a tie goes to the one used lately. */
  recent: string[]
  history: string[]
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** Where `needle` sits in `text`, by code point, or -1. */
function find(text: string, needle: string) {
  const at = text.toLowerCase().indexOf(needle)
  return at < 0 ? -1 : [...text.slice(0, at)].length
}

function scoreSite(site: Site, q: string, initialsQuery: boolean): { score: number; ranges: Ranges } | null {
  const title = site.title
  const length = [...q].length
  const at = find(title, q)
  if (at === 0) return { score: 100, ranges: [[0, length]] }

  if (initialsQuery) {
    const initials = initialsOf(title)
    const hit = initials.indexOf(q)
    // Only where the letters came from Chinese: "can" inside "Canvas" is a plain match.
    if (hit >= 0 && initials !== title.toLowerCase()) {
      return { score: hit === 0 ? 85 : 45, ranges: [[hit, hit + q.length]] }
    }
  }

  if (at > 0) return { score: 70 - Math.min(at, 10), ranges: [[at, at + length]] }
  const host = hostOf(site.url).toLowerCase()
  if (host.startsWith(q)) return { score: 55, ranges: [] }
  if (host.includes(q)) return { score: 35, ranges: [] }
  if (site.description.toLowerCase().includes(q)) return { score: 20, ranges: [] }
  return null
}

/**
 * The rows under a search field. With nothing typed: recent searches only.
 * Typed: matching sites (titles, pinyin initials, hosts, descriptions), then
 * matching past searches. A search identical to the input is left out; it
 * would only repeat it.
 */
export function suggest(
  query: string,
  source: SuggestSource,
  limits: { sites: number; history: number; idle: number },
): Suggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return source.history.slice(0, limits.idle).map((text) => ({ kind: "history", text, ranges: [] }))
  }

  const initialsQuery = /^[a-z0-9]+$/.test(q) && /[a-z]/.test(q)
  const seen = new Set<string>()
  const sites = source.sites
    .flatMap((site) => {
      // A site filed in two places, or pinned and listed, is one row.
      if (seen.has(site.id)) return []
      seen.add(site.id)
      const hit = scoreSite(site, q, initialsQuery)
      if (!hit) return []
      const recency = source.recent.indexOf(site.id)
      return [{ site, ...hit, score: hit.score + (recency < 0 ? 0 : 8 - Math.min(recency, 7)) }]
    })
    .sort((a, b) => b.score - a.score || [...a.site.title].length - [...b.site.title].length)
    .slice(0, limits.sites)
    .map(({ site, ranges }): Suggestion => ({ kind: "site", site, local: source.localIds.has(site.id), ranges }))

  const history = source.history
    .flatMap((text) => {
      if (text.toLowerCase() === q) return []
      const at = find(text, q)
      return at < 0 ? [] : [{ text, at }]
    })
    // Prefix matches first; otherwise the history's own order, newest first.
    .sort((a, b) => Number(b.at === 0) - Number(a.at === 0))
    .slice(0, limits.history)
    .map(({ text, at }): Suggestion => ({ kind: "history", text, ranges: [[at, at + [...q].length]] }))

  return [...sites, ...history]
}
