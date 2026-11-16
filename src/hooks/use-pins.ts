import { useCallback, useState } from "react"

import { readPins, writePins } from "@/lib/pin-store"

/**
 * Pinned sites are an ordering of ids, not copies: renaming or re-iconing a
 * site updates its pin too, and removing the site drops the pin with it.
 */
export function usePins() {
  const [ids, setIds] = useState<string[]>(readPins)

  const commit = useCallback((next: string[]) => {
    setIds(next)
    writePins(next)
  }, [])

  const toggle = useCallback(
    (id: string) => {
      setIds((current) => {
        const next = current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
        writePins(next)
        return next
      })
    },
    [],
  )

  /** Adds a pin, optionally at a drop position. Already-pinned ids are left alone. */
  const add = useCallback((id: string, index?: number) => {
    setIds((current) => {
      if (current.includes(id)) return current
      const next = [...current]
      const at = index === undefined ? next.length : Math.max(0, Math.min(index, next.length))
      next.splice(at, 0, id)
      writePins(next)
      return next
    })
  }, [])

  const remove = useCallback(
    (id: string) => {
      setIds((current) => {
        if (!current.includes(id)) return current
        const next = current.filter((item) => item !== id)
        writePins(next)
        return next
      })
    },
    [],
  )

  /** Drops ids that no longer resolve to a site (deleted, or reset). */
  const prune = useCallback(
    (known: Set<string>) => {
      setIds((current) => {
        const next = current.filter((id) => known.has(id))
        if (next.length === current.length) return current
        writePins(next)
        return next
      })
    },
    [],
  )

  const move = useCallback((from: number, to: number) => {
    setIds((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current
      }
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      writePins(next)
      return next
    })
  }, [])

  const reset = useCallback(() => commit([]), [commit])

  return { ids, add, toggle, remove, move, prune, reset, commit }
}

export type PinsController = ReturnType<typeof usePins>
