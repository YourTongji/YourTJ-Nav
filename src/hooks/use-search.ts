import { useCallback, useState } from "react"

import { defaultEngineId, engineIds, findEngine } from "@/data/engines"
import { useEnumPref } from "@/hooks/use-enum-pref"
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  removeSearchHistory,
} from "@/lib/search-history"

/**
 * One draft and one engine for every search field on the page. The hero field
 * and the compact one in the nav bar take turns on screen, so whatever was
 * typed or picked in one has to be waiting in the other.
 */
export function useSearch() {
  const [query, setQuery] = useState("")
  const [engineId, setEngineId] = useEnumPref("yourtj-nav-engine", engineIds, defaultEngineId)
  // Shared too: a search made in the bar shows up under the hero field.
  const [history, setHistory] = useState(readSearchHistory)
  const remember = useCallback((text: string) => setHistory(pushSearchHistory(text)), [])
  const forget = useCallback((text: string) => setHistory(removeSearchHistory(text)), [])
  const clearHistory = useCallback(() => setHistory(clearSearchHistory()), [])

  return {
    query,
    setQuery,
    engineId,
    setEngineId,
    engine: findEngine(engineId),
    history,
    remember,
    forget,
    clearHistory,
  }
}

export type SearchController = ReturnType<typeof useSearch>
