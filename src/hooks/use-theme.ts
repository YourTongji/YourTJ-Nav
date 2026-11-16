import { useCallback, useEffect, useRef, useState } from "react"

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

  /*
    A theme change repaints every colour on the page in one frame, which reads
    as a flash. Where the browser has the View Transitions API the whole page
    cross-fades instead, as the 简洁模式 swap does; the first paint (already set
    by the boot script), a hidden tab and reduced motion stay instant.
  */
  const painted = useRef(false)
  const latest = useRef<ViewTransition | null>(null)
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      root.classList.toggle("dark", theme === "dark")
      root.style.colorScheme = theme
    }
    const first = !painted.current
    painted.current = true
    const unchanged = root.classList.contains("dark") === (theme === "dark")
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (first || unchanged || still || document.hidden || !document.startViewTransition) {
      apply()
      return
    }
    root.dataset.transition = "theme"
    const transition = document.startViewTransition(apply)
    latest.current = transition
    transition.finished.finally(() => {
      // A quicker second switch skips this one; leave the marker for that one.
      if (latest.current === transition) delete root.dataset.transition
    })
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
