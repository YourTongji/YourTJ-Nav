import type { BrandIconFn } from "reicon-brands"

/** Public assets live under the deploy base, which is not always "/". */
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`

import { Baidu } from "reicon-brands"

import type { SiteMark } from "@/data/sites"

export type Engine = {
  id: string
  name: string
  urlTemplate: string
  mark: SiteMark
}

const brand = (Icon: BrandIconFn): SiteMark => ({ kind: "brand", Icon, chip: "light" })

export const engines: Engine[] = [
  {
    id: "google",
    name: "Google",
    urlTemplate: "https://www.google.com/search?q=%s",
    mark: { kind: "logo", src: asset("/brand/google.svg"), chip: "light" },
  },
  {
    id: "bing",
    name: "Bing",
    urlTemplate: "https://www.bing.com/search?q=%s",
    mark: { kind: "logo", src: asset("/brand/bing.svg"), chip: "light" },
  },
  {
    id: "baidu",
    name: "百度",
    urlTemplate: "https://www.baidu.com/s?wd=%s",
    mark: brand(Baidu),
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    urlTemplate: "https://duckduckgo.com/?q=%s",
    mark: { kind: "logo", src: asset("/brand/duckduckgo.svg"), chip: "light" },
  },
]

export const engineIds = engines.map((engine) => engine.id)

export const defaultEngineId = "google"

export function findEngine(id: string): Engine {
  return engines.find((engine) => engine.id === id) ?? engines[0]
}

const bareHost = /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/

/** True when the query is a host or a path the user probably wants to open directly. */
export function looksLikeAddress(query: string): boolean {
  const value = query.trim()
  if (!value || /\s/.test(value)) return false
  if (/^https?:\/\//i.test(value)) return true
  return bareHost.test(value) && value.includes(".")
}

/** Turns the input into a destination: a direct address when it looks like one, else a search. */
export function resolveQuery(query: string, engine: Engine): string {
  const value = query.trim()
  if (!value) return ""
  if (looksLikeAddress(value)) {
    return /^https?:\/\//i.test(value) ? value : `https://${value}`
  }
  return engine.urlTemplate.replace("%s", encodeURIComponent(value))
}
