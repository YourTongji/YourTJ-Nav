import { useState } from "react"

import { defaultEngineId, engineIds, findEngine } from "@/data/engines"
import { useEnumPref } from "@/hooks/use-enum-pref"

/**
 * One draft and one engine for every search field on the page. The hero field
 * and the compact one in the nav bar take turns on screen, so whatever was
 * typed or picked in one has to be waiting in the other.
 */
export function useSearch() {
  const [query, setQuery] = useState("")
  const [engineId, setEngineId] = useEnumPref("yourtj-nav-engine", engineIds, defaultEngineId)

  return { query, setQuery, engineId, setEngineId, engine: findEngine(engineId) }
}

export type SearchController = ReturnType<typeof useSearch>
