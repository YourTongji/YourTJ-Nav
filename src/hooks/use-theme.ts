import { useCallback, useEffect, useState } from "react"

/** What the user picked. `system` follows the OS and keeps following it. */
export type ThemeMode = "light" | "dark" | "system"
/** What is actually painted. */
export type Theme = "light" | "dark"

const STORAGE_KEY = "yourtj-nav-theme"

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === "light" || saved === "dark" || saved === "system") return saved
  return "system"
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [systemDark, setSystemDark] = useState(prefersDark)

  // Only matters while mode is "system", but the listener is cheap and keeps
  // the value warm so switching to system never flashes the wrong theme.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  const theme: Theme = mode === "system" ? (systemDark ? "dark" : "light") : mode

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Private mode: the choice holds for this session.
    }
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => setModeState(next), [])

  return { mode, theme, setMode }
}
