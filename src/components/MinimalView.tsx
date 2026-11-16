import { useRef } from "react"

import { Mark, plateProps } from "@/components/Mark"
import type { Site } from "@/data/sites"
import { useGridShape } from "@/hooks/use-grid-shape"
import type { Folder } from "@/hooks/use-sites"

type Section = { id: string; label: string; sites: Site[] }

/**
 * Column floor for a row: an icon and about eight characters of a name, or six
 * on a phone, where two columns of short names beat one column of full ones.
 */
const MIN_ROW = 160
const MIN_ROW_NARROW = 136

/**
 * 简洁模式: navigation and nothing else. Every folder is on screen at once,
 * each site one 40px row, so a desktop shows the whole list without a tab or a
 * page in the way.
 *
 * The sections share one set of column tracks. A section spans as many tracks
 * as it has sites (all of them when it has more) and lays its rows on those
 * tracks through subgrid; `dense` packing lets a two-site folder sit beside a
 * four-site one instead of leaving most of a row empty.
 */
export function MinimalView({
  folders,
  pins,
  onVisit,
}: {
  folders: Folder[]
  pins: Site[]
  onVisit: (id: string) => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  // Same measuring as the main grid, with a row-sized track and no column cap.
  const { cols } = useGridShape(frameRef, {
    min: MIN_ROW,
    narrowMin: MIN_ROW_NARROW,
    gap: 8,
    maxCols: 12,
  })

  const sections: Section[] = [
    ...(pins.length ? [{ id: "pins", label: "置顶", sites: pins }] : []),
    ...folders.filter((folder) => folder.sites.length > 0),
  ]

  return (
    <div
      ref={frameRef}
      className="minimal-grid grid grid-flow-row-dense gap-x-2 gap-y-6 pb-[5.5rem] pt-4 sm:pb-10 sm:pt-6"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`minimal-${section.id}`}
          className="grid grid-cols-subgrid content-start gap-y-0.5"
          style={{ gridColumn: `span ${Math.min(section.sites.length, cols)}` }}
        >
          <h2
            id={`minimal-${section.id}`}
            className="col-span-full flex items-baseline gap-1.5 px-1.5 pb-1.5 text-[12px] font-semibold text-ink"
          >
            {section.label}
            {/* Weight, not a lighter grey, sets it apart: this sits on the bare wallpaper. */}
            <span className="text-[11px] font-normal tabular-nums">{section.sites.length}</span>
          </h2>
          {section.sites.map((site) => (
            <a
              key={site.id}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              title={site.title}
              data-site-id={site.id}
              data-folder-id={section.id === "pins" ? undefined : section.id}
              onClick={() => onVisit(site.id)}
              className="group flex h-10 min-w-0 items-center gap-2.5 rounded-[15px] px-1.5 text-[13px] text-ink transition-[background-color,scale] duration-150 hover:bg-glass active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {/* 28px plate with 6px around it: 9 + 6 = the row's 15px radius. */}
              <span
                className="nav-tile-plate grid size-7 shrink-0 place-items-center overflow-hidden rounded-[9px]"
                {...plateProps(site.mark)}
              >
                <Mark mark={site.mark} size={16} />
              </span>
              <span className="min-w-0 truncate">{site.title}</span>
            </a>
          ))}
        </section>
      ))}
    </div>
  )
}
