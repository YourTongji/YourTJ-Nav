import { useCallback, useEffect, useState } from "react"

/** A number the user can dial, remembered per device. */
export function useNumberPref(key: string, fallback: number, min: number, max: number) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key)
      const parsed = saved === null ? Number.NaN : Number(saved)
      return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value))
    } catch {
      // Private mode: the choice holds for this session.
    }
  }, [key, value])

  const update = useCallback(
    (next: number) => setValue(Math.min(max, Math.max(min, next))),
    [min, max],
  )

  return [value, update] as const
}
