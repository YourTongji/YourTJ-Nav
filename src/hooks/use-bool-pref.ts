import { useCallback, useEffect, useState } from "react"

/**
 * A boolean the user can flip, remembered per device. Written on change rather
 * than on mount, so a first visit does not store a value nobody chose.
 */
export function useBoolPref(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return saved === null ? fallback : saved === "1"
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value ? "1" : "0")
    } catch {
      // Private mode: the choice holds for this session.
    }
  }, [key, value])

  const toggle = useCallback(() => setValue((current) => !current), [])

  return [value, toggle, setValue] as const
}
