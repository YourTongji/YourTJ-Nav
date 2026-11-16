import { Check } from "reicon-react"

import { materials, type MaterialId } from "@/data/materials"
import { cn } from "@/lib/utils"

/**
 * The material picker, as three live samples rather than three words. Each
 * card is a small scene with hard-edged shapes behind a real plate: setting
 * `data-material` on the scene scopes the tokens to it, so what the card shows
 * is exactly how blur, tint and rim come out on the page.
 */
export function MaterialGallery({
  value,
  onChange,
}: {
  value: MaterialId
  onChange: (material: MaterialId) => void
}) {
  return (
    <div role="radiogroup" aria-label="材质" className="grid grid-cols-3 gap-2">
      {materials.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active ? "true" : "false"}
            onClick={() => onChange(item.id)}
            className="group flex flex-col gap-2 rounded-[12px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span
              data-material={item.id}
              className="material-scene relative block aspect-[3/2] w-full overflow-hidden rounded-[10px] ring-1 ring-inset ring-black/10 transition-transform duration-150 group-active:scale-[0.97] dark:ring-white/12"
            >
              <span aria-hidden="true" className="glass-shell absolute inset-x-[14%] top-[34%] h-[32%] rounded-full" />
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
            {/* The sample says what the material is; the caption only names it. */}
            <span
              className={cn(
                "px-0.5 text-[11.5px] leading-tight transition-colors",
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
