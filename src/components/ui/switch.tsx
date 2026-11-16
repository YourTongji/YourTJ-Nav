import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A switch, not a checkbox: the row it sits in is a setting that takes effect
 * immediately, and `role="switch"` is what screen readers announce for that.
 */
export function Switch({
  checked,
  onChange,
  label,
  className,
  ...props
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
} & Omit<React.ComponentProps<"button">, "onChange">) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        // 38x22 with a 16px knob: the track keeps 3px of air on every side, which
        // is what made the first 36x20 version read as cramped.
        "relative h-[22px] w-[38px] shrink-0 rounded-full ring-1 ring-inset transition-[background-color,transform] duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.97]",
        checked
          ? "bg-brand ring-black/10 dark:ring-white/20"
          : "bg-[color-mix(in_oklab,var(--ink)_16%,transparent)] ring-black/5 dark:ring-white/10",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          // `left-[3px]` pins the travel: an absolutely positioned span with no
          // `left` inherits the button's centred static position instead.
          "absolute left-[3px] top-[3px] size-4 rounded-full",
          // The knob flips with the track, not with the theme: in dark mode the
          // brand is a light cyan, and a white knob on it would disappear.
          checked ? "bg-brand-ink" : "bg-white",
          "shadow-[0_1px_2px_rgba(9,14,25,0.28),0_0_0_0.5px_rgba(9,14,25,0.06)]",
          "transition-transform duration-200 ease-[var(--ease-spring)]",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  )
}
