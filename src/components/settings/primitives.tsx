import { useState } from "react"
import { ChevronDown } from "reicon-react"

import { Collapse } from "@/components/Collapse"
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
      className="grid gap-1 rounded-full border border-hairline-strong bg-glass p-1"
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
              "h-8 rounded-full text-[12px] font-medium transition-[background-color,color,box-shadow] duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-popover text-ink shadow-[0_1px_3px_-1px_var(--shade)]"
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

export function SwitchRow({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink">{title}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
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

  return (
    <section className="border-b border-hairline last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group flex w-full items-center gap-2 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
