import { useCallback, useEffect, useState } from "react"

export type Appearance = {
  /** Extra scrim over the wallpaper, in percent. */
  overlay: number
  /** Wallpaper blur in px. */
  blur: number
}

const STORAGE_KEY = "yourtj-nav-appearance"
const DEFAULTS: Appearance = { overlay: 0, blur: 0 }

function clamp(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function readAppearance(): Appearance {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Appearance>
    return {
      overlay: clamp(parsed.overlay, 0, 80, DEFAULTS.overlay),
      blur: clamp(parsed.blur, 0, 20, DEFAULTS.blur),
    }
  } catch {
    return DEFAULTS
  }
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)

  // Written to the root element so the fixed wallpaper and overlay layers,
  // which are not React children of any wrapper, still inherit the values.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--wall-blur", `${appearance.blur}px`)
    root.style.setProperty("--wall-overlay", String(appearance.overlay / 100))
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
    } catch {
      // Private mode: values hold for this session.
    }
  }, [appearance])

  const setOverlay = useCallback((overlay: number) => {
    setAppearance((current) => ({ ...current, overlay }))
  }, [])

  const setBlur = useCallback((blur: number) => {
    setAppearance((current) => ({ ...current, blur }))
  }, [])

  const reset = useCallback(() => setAppearance(DEFAULTS), [])

  return { appearance, setOverlay, setBlur, reset }
}

export type AppearanceController = ReturnType<typeof useAppearance>
