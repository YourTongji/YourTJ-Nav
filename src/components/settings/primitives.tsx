import { useId, useRef, useState } from "react"
import { ChevronDown } from "reicon-react"

import { Collapse } from "@/components/Collapse"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] font-medium text-ink">{children}</span>
      {hint ? <span className="text-[11px] tabular-nums text-ink-muted">{hint}</span> : null}
    </span>
  )
}

/** The pill used for every small either/or choice in the panel. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-full bg-[var(--mat-well)] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "h-8 rounded-full text-[12px] font-medium transition-[background-color,color,box-shadow] duration-200 pointer-coarse:h-10",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-[var(--mat-raised)] text-ink shadow-[var(--mat-raised-edge)]"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A setting that is on or off. The whole row is the label, so the words toggle
 * it too: a 38px switch alone is a small target, and on a phone the text is
 * where the thumb lands first.
 */
export function SwitchRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const hintId = useId()

  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 pointer-coarse:min-h-11">
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-ink">{title}</span>
        {hint ? (
          <span id={hintId} className="mt-0.5 block text-[11px] text-ink-muted">
            {hint}
          </span>
        ) : null}
      </span>
      <Switch
        checked={checked}
        onChange={onChange}
        label={title}
        aria-describedby={hint ? hintId : undefined}
      />
    </label>
  )
}

/**
 * After a block opens inside the panel, scroll just far enough to show what
 * opened, never so far that its own header leaves the top. Runs once the
 * height transition has settled, because before that there is nothing to show.
 */
export function revealOpened(element: HTMLElement | null) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.setTimeout(
    () => {
      const scroller = element?.closest<HTMLElement>("[data-settings-scroll]")
      if (!element || !scroller) return
      const view = scroller.getBoundingClientRect()
      const box = element.getBoundingClientRect()
      const hidden = box.bottom - view.bottom
      if (hidden <= 0) return
      scroller.scrollBy({ top: Math.min(hidden, box.top - view.top), behavior: reduce ? "auto" : "smooth" })
    },
    reduce ? 0 : 320,
  )
}

/**
 * A collapsible block. The panel holds four of these instead of four tab pages:
 * one scroll, everything reachable, and nothing hidden behind a page switch.
 */
export function SettingsGroup({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const sectionRef = useRef<HTMLElement>(null)

  return (
    <section ref={sectionRef} className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) revealOpened(sectionRef.current)
          setOpen(!open)
        }}
        className="group flex min-h-11 w-full items-center gap-2 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        {summary ? <span className="truncate text-[11px] text-ink-muted">{summary}</span> : null}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            "ml-auto shrink-0 text-ink-muted transition-transform duration-250 ease-[var(--ease-spring)]",
            open && "rotate-180",
          )}
        />
      </button>
      <Collapse open={open}>
        <div className="pb-4">{children}</div>
      </Collapse>
    </section>
  )
}
