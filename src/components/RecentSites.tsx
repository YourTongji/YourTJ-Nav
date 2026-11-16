import { ArrowUpRight } from "reicon-react"

import { Mark, plateProps } from "@/components/Mark"
import type { Site } from "@/data/sites"
import { hostOf } from "@/lib/site-store"

type RecentSitesProps = {
  sites: Site[]
  onClear: () => void
}

export function RecentSites({ sites, onClear }: RecentSitesProps) {
  if (sites.length === 0) {
    // One quiet line rather than a box: on a fresh install the grid already
    // fills the fold, and a tall placeholder would only push the footer down.
    return (
      <section aria-labelledby="recent-heading" className="mt-7 px-0.5 sm:mt-8">
        <p className="text-[11.5px] text-ink-muted">
          <span id="recent-heading" className="font-medium text-ink-muted">
            最近访问
          </span>
          <span className="mx-1.5 opacity-50">·</span>
          点过的站点会出现在这里，最多记 12 个
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="recent-heading" className="mt-9 sm:mt-11">
      <div className="mb-3 flex items-baseline gap-2 px-0.5">
        <h2 id="recent-heading" className="text-[13px] font-semibold tracking-tight text-ink-muted">
          最近访问
        </h2>
        <span className="text-[11px] tabular-nums text-ink-muted">{sites.length}</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded-full px-2 py-0.5 text-[11px] text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          清空
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {sites.map((site) => (
          <li key={site.id}>
            {/*
              lumno's construction, one to one: a tinted board, a glass sheet
              mounted on it, and the URL printed on the board underneath the
              sheet - always visible, never hidden behind it.
            */}
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="recent-card group rounded-[25px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="recent-mat">
                <span className="recent-panel">
                  <span className="flex items-center gap-2">
                    <span
                      className="nav-tile-plate grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px]"
                      {...plateProps(site.mark)}
                    >
                      <Mark mark={site.mark} size={18} />
                    </span>
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">
                      {site.title}
                    </span>
                  </span>

                  <span className="recent-desc mt-2 text-[11.5px] leading-[1.55] text-ink-muted">
                    {site.description}
                  </span>
                </span>

                <span className="recent-url">
                  <span className="min-w-0 truncate font-mono text-[10px]">
                    {hostOf(site.url)}
                  </span>
                  <ArrowUpRight
                    size={11}
                    aria-hidden="true"
                    className="ml-auto shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
