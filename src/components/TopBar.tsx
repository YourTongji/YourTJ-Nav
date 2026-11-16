import { useEffect, useState } from "react"
import { ArrowUpRight, Bubble } from "reicon-react"

import { SearchBar } from "@/components/SearchBar"
import { cn } from "@/lib/utils"

export function TopBar({ compactSearch }: { compactSearch: boolean }) {
  const [compact, setCompact] = useState(false)

  // IntersectionObserver rather than a scroll listener: the nav only needs to know
  // whether the top sentinel is still on screen.
  useEffect(() => {
    const sentinel = document.getElementById("page-top")
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { rootMargin: "64px 0px 0px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={cn(
        "sticky top-3 z-40 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-[1180px] items-center justify-between gap-3 rounded-full pl-3 pr-2",
        "origin-top transition-[transform,opacity,background-color,border-color,box-shadow] duration-[420ms] ease-out",
        compact ? "glass-shell scale-[0.97] opacity-95 lg:scale-100" : "border border-transparent",
      )}
    >
      <a
        href="https://yourtj.de"
        aria-label="YourTJ 首页"
        className="flex min-w-0 items-center gap-2.5 rounded-full pr-1 transition-[opacity,transform] duration-200 hover:opacity-75 active:scale-[0.96]"
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
        The hero field hands over to this one the moment it scrolls away, so the
        search is always one keystroke from where the eye already is. It is
        centred on the header itself rather than on the space between the logo
        and the pill, otherwise it would sit 40px off the axis the hero used.
      */}
      {compactSearch ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[min(21rem,calc(100%-15rem))] -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 slide-in-from-top-1 duration-200 md:block">
          <div className="pointer-events-auto">
            <SearchBar variant="compact" />
          </div>
        </div>
      ) : null}

      <nav
        aria-label="页面操作"
        className={cn(
          "shrink-0 items-center gap-1.5",
          compactSearch ? "hidden lg:flex" : "flex",
        )}
      >
        {/*
          The flagship, as a nav item rather than a banner: a glass pill with the
          brand colour on the glyph only, so it leads without shouting.
        */}
        <a
          href="https://f.yourtj.de"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-chip group flex h-8 items-center gap-1.5 rounded-full pl-2.5 pr-2 text-[12px] font-medium text-ink transition-[background-color,border-color] duration-150 hover:border-[color-mix(in_oklab,var(--brand)_45%,var(--hairline-strong))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]"
        >
          <Bubble size={13} aria-hidden="true" className="text-brand" />
          <span className="whitespace-nowrap">YourTJ 社区</span>
          <ArrowUpRight
            size={11}
            aria-hidden="true"
            className="text-ink-muted transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px"
          />
        </a>

      </nav>
    </header>
  )
}
