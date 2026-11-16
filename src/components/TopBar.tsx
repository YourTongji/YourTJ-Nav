import type { RefObject } from "react"
import { ArrowUpRight, Bubble } from "reicon-react"

import { SearchBar } from "@/components/SearchBar"
import type { SearchController } from "@/hooks/use-search"

/**
 * The nav bar. Its glass plate and the compact search are not switched on and
 * off: `useHeaderHandoff` writes `--float` and `--handoff` onto it as the page
 * scrolls, and `.topbar` in index.css blends both from those two numbers.
 */
export function TopBar({
  headerRef,
  handedOff,
  search,
}: {
  headerRef: RefObject<HTMLElement | null>
  /** True once the compact field owns the search: it takes clicks and shortcuts. */
  handedOff: boolean
  search: SearchController
}) {
  return (
    <header
      ref={headerRef}
      className="topbar sticky top-3 z-40 mx-auto flex h-14 items-center justify-between gap-3 rounded-full px-2.5"
    >
      <span aria-hidden="true" className="topbar-plate glass-shell" />

      <a
        href="https://yourtj.de"
        aria-label="YourTJ 首页"
        className="relative flex shrink-0 items-center rounded-full transition-[opacity,scale] duration-200 hover:opacity-75 active:scale-[0.96]"
      >
        <img
          src={`${import.meta.env.BASE_URL}yourtj-logo.png`}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full bg-white object-contain ring-1 ring-black/10 dark:ring-white/10"
        />
      </a>

      {/*
        The hero field hands over to this one as it slides under the bar, so the
        search is always one keystroke from where the eye already is. It is
        centred on the header itself rather than on the space between the logo
        and the pill, otherwise it would sit off the axis the hero used.
        Always mounted: fading a field in is cheaper and calmer than mounting it.
      */}
      <div
        className="topbar-search absolute left-1/2 top-1/2"
        inert={!handedOff}
        aria-hidden={!handedOff}
      >
        <SearchBar variant="compact" search={search} shortcuts={handedOff} />
      </div>

      <nav aria-label="页面操作" className="relative flex shrink-0 items-center gap-1.5">
        {/*
          The flagship, as a nav item rather than a banner: a glass pill with the
          brand colour on the glyph only, so it leads without shouting.
        */}
        <a
          href="https://f.yourtj.de"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YourTJ 社区"
          className="nav-chip group flex size-9 items-center justify-center gap-1.5 rounded-full text-[12px] font-medium text-ink transition-[background-color,box-shadow,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.96] sm:w-auto sm:justify-start sm:pl-3 sm:pr-2.5"
        >
          {/*
            Below 640px the chip keeps its place as a 36px glyph instead of
            leaving the bar: the bar has the same three things at every width,
            and the compact search gets the room between them.
          */}
          <Bubble size={15} aria-hidden="true" className="text-brand sm:size-[13px]" />
          <span className="hidden whitespace-nowrap sm:inline">YourTJ 社区</span>
          <ArrowUpRight
            size={11}
            aria-hidden="true"
            className="hidden text-ink-muted transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px sm:block"
          />
        </a>
      </nav>
    </header>
  )
}
