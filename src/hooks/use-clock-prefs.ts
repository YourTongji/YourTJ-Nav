import { useCallback, useEffect, useState } from "react"

export type ClockInk = "auto" | "light" | "dark"

export type ClockPrefs = {
  visible: boolean
  /** Serif (Instrument Serif) or sans (Geist). */
  serif: boolean
  weight: number
  size: number
  opacity: number
  seconds: boolean
  hour12: boolean
  ink: ClockInk
}

export const CLOCK_DEFAULTS: ClockPrefs = {
  visible: true,
  serif: true,
  weight: 400,
  size: 54,
  opacity: 100,
  seconds: false,
  hour12: false,
  ink: "auto",
}

const KEY = "yourtj-nav-clock"

const INKS: ClockInk[] = ["auto", "light", "dark"]

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function parse(raw: string | null): ClockPrefs {
  if (raw === null) return CLOCK_DEFAULTS
  // The first version stored a bare "1"/"0" for visibility only.
  if (raw === "1" || raw === "0") return { ...CLOCK_DEFAULTS, visible: raw === "1" }
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    return {
      visible: typeof value.visible === "boolean" ? value.visible : CLOCK_DEFAULTS.visible,
      serif: typeof value.serif === "boolean" ? value.serif : CLOCK_DEFAULTS.serif,
      weight: clamp(value.weight, 300, 800, CLOCK_DEFAULTS.weight),
      size: clamp(value.size, 32, 96, CLOCK_DEFAULTS.size),
      opacity: clamp(value.opacity, 20, 100, CLOCK_DEFAULTS.opacity),
      seconds: typeof value.seconds === "boolean" ? value.seconds : CLOCK_DEFAULTS.seconds,
      hour12: typeof value.hour12 === "boolean" ? value.hour12 : CLOCK_DEFAULTS.hour12,
      ink: INKS.includes(value.ink as ClockInk) ? (value.ink as ClockInk) : CLOCK_DEFAULTS.ink,
    }
  } catch {
    return CLOCK_DEFAULTS
  }
}

export function useClockPrefs() {
  const [prefs, setPrefs] = useState<ClockPrefs>(() => {
    try {
      return parse(window.localStorage.getItem(KEY))
    } catch {
      return CLOCK_DEFAULTS
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      // Private mode: the choice holds for this session.
    }
  }, [prefs])

  const update = useCallback((patch: Partial<ClockPrefs>) => {
    setPrefs((current) => ({ ...current, ...patch }))
  }, [])

  return { prefs, update }
}

export type ClockController = ReturnType<typeof useClockPrefs>
