import { useCallback, useEffect, useState } from "react"

/**
 * A choice from a fixed list, remembered per device. Falls back when the stored
 * value is not one of the options (an older build, a renamed id).
 */
export function useEnumPref<T extends string>(key: string, options: readonly T[], fallback: T) {
  const [value, setValueState] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return options.includes(saved as T) ? (saved as T) : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Private mode: the choice holds for this session.
    }
  }, [key, value])

  const setValue = useCallback((next: T) => setValueState(next), [])

  return [value, setValue] as const
}
