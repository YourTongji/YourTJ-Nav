import { useEffect, useState } from "react"

import type { ClockPrefs } from "@/hooks/use-clock-prefs"
import { cn } from "@/lib/utils"

const monthDay = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" })
const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" })

function pad(value: number) {
  return value.toString().padStart(2, "0")
}

/** Re-renders on the minute (or second) boundary, never on a fixed 1s poll. */
function useNow(withSeconds: boolean) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer = 0
    const unit = withSeconds ? 1000 : 60_000
    const tick = () => {
      setNow(new Date())
      // Land just past the boundary so a digit is never a unit stale.
      timer = window.setTimeout(tick, unit - (Date.now() % unit) + 40)
    }
    timer = window.setTimeout(tick, unit - (Date.now() % unit) + 40)
    return () => window.clearTimeout(timer)
  }, [withSeconds])

  return now
}

const INK_CLASS = {
  auto: "text-ink",
  light: "text-white",
  dark: "text-[oklch(0.16_0.012_262)]",
} as const

export function Clock({ prefs }: { prefs: ClockPrefs }) {
  const now = useNow(prefs.seconds)
  const hours24 = now.getHours()
  const hours = prefs.hour12 ? hours24 % 12 || 12 : hours24
  const meridiem = prefs.hour12 ? (hours24 < 12 ? "AM" : "PM") : null

  return (
    <div
      className="flex flex-col items-center gap-1 text-center"
      style={{ opacity: prefs.opacity / 100 }}
    >
      <p
        className={cn("leading-none tabular-nums", INK_CLASS[prefs.ink])}
        style={{
          fontFamily: prefs.serif
            ? 'var(--font-clock)'
            : 'var(--font-sans)',
          fontWeight: prefs.weight,
          fontSize: `min(${prefs.size}px, 14vw)`,
          letterSpacing: prefs.serif ? "0.01em" : "-0.02em",
        }}
        aria-label={`现在 ${pad(hours24)}:${pad(now.getMinutes())}`}
      >
        {pad(hours)}
        <span className="mx-[0.06em] opacity-70">:</span>
        {pad(now.getMinutes())}
        {prefs.seconds ? (
          <>
            <span className="mx-[0.06em] opacity-70">:</span>
            {pad(now.getSeconds())}
          </>
        ) : null}
        {meridiem ? (
          <span
            className="ml-2 align-baseline font-sans text-[0.24em] tracking-[0.14em] opacity-70"
            style={{ fontWeight: 500 }}
          >
            {meridiem}
          </span>
        ) : null}
      </p>
      <p className="text-[11.5px] tracking-[0.08em] text-ink-muted">
        {monthDay.format(now)}
        <span aria-hidden="true" className="mx-1.5 opacity-45">
          ·
        </span>
        {weekday.format(now)}
      </p>
    </div>
  )
}
