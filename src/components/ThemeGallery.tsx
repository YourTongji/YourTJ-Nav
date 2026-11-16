import { Check } from "reicon-react"

import type { ThemeMode } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
  { id: "system", label: "跟随系统" },
]

/**
 * A miniature of this page rather than an abstract swatch, drawn as one SVG in
 * a 120x80 viewBox. Percentages inside a flex column used to squeeze the tiles
 * at small card widths; a fixed viewBox keeps every bar the same weight at any
 * size, and the card is `aspect-[3/2]` so the box never has to letterbox.
 */
function Mock({ tone }: { tone: "light" | "dark" }) {
  const dark = tone === "dark"
  const paper = dark ? "#1b1f26" : "#eef0f4"
  const surface = dark ? "#2b313a" : "#ffffff"
  const muted = dark ? "#3d444f" : "#dbdee5"

  return (
    <svg viewBox="0 0 120 80" className="size-full" aria-hidden="true">
      <rect width="120" height="80" fill={paper} />
      {/* nav pill */}
      <rect x="41" y="6" width="38" height="3" rx="1.5" fill={muted} />
      {/* search field */}
      <rect x="28" y="13" width="64" height="10" rx="5" fill={surface} />
      {/* the quote line under it */}
      <rect x="42" y="28" width="36" height="2" rx="1" fill={muted} opacity="0.7" />
      {/* two rows of site tiles */}
      {Array.from({ length: 8 }).map((_, index) => (
        <rect
          key={index}
          x={21 + (index % 4) * 21}
          y={40 + Math.floor(index / 4) * 21}
          width="15"
          height="15"
          rx="3.5"
          fill={surface}
        />
      ))}
    </svg>
  )
}

function SplitMock() {
  return (
    <>
      <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
        <span className="block h-full w-[200%]">
          <Mock tone="light" />
        </span>
      </span>
      <span className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
        <span className="absolute inset-y-0 right-0 block w-[200%]">
          <Mock tone="dark" />
        </span>
      </span>
    </>
  )
}

export function ThemeGallery({
  mode,
  onChange,
}: {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}) {
  return (
    <div role="radiogroup" aria-label="外观" className="grid grid-cols-3 gap-2">
      {MODES.map((item) => {
        const active = item.id === mode
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active ? "true" : "false"}
            onClick={() => onChange(item.id)}
            className="group flex flex-col gap-2 rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="relative block aspect-[3/2] w-full overflow-hidden rounded-[10px] ring-1 ring-inset ring-black/10 transition-transform duration-150 group-active:scale-[0.97] dark:ring-white/12">
              {item.id === "system" ? <SplitMock /> : <Mock tone={item.id} />}

              {/* Selection ring drawn inside the frame, so choosing never shifts layout. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[10px] border-2 border-transparent transition-colors duration-150 group-data-[active=true]:border-brand"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-1 right-1 grid size-4 scale-90 place-items-center rounded-full bg-brand text-brand-ink opacity-0 transition-[opacity,transform] duration-150 group-data-[active=true]:scale-100 group-data-[active=true]:opacity-100"
              >
                <Check size={9} aria-hidden="true" />
              </span>
            </span>
            <span
              className={cn(
                "px-0.5 text-left text-[11.5px] leading-tight transition-colors",
                active ? "font-medium text-ink" : "text-ink-muted",
              )}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
