import { useEffect, useRef, useState } from "react"
import { ArrowRight, ChevronDown, Search, X } from "reicon-react"

import { Mark } from "@/components/Mark"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { defaultEngineId, engines, findEngine, resolveQuery } from "@/data/engines"

const ENGINE_KEY = "yourtj-nav-engine"

function readEngine(): string {
  try {
    return window.localStorage.getItem(ENGINE_KEY) ?? defaultEngineId
  } catch {
    return defaultEngineId
  }
}

/** An animated decoration should hold still when the system asks for calm. */
function usePrefersReducedMotion() {
  const [calm, setCalm] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = (event: MediaQueryListEvent) => setCalm(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return calm
}

type SearchBarProps = {
  /** `compact` is the one that moves into the nav bar once the hero scrolls away. */
  variant?: "hero" | "compact"
  /** Only the field that is actually on screen should answer "/" and Cmd+K. */
  shortcuts?: boolean
  /** Hero width in px, from the appearance settings. */
  width?: number
}

export function SearchBar({ variant = "hero", shortcuts = true, width }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [engineId, setEngineId] = useState(readEngine)
  const engine = findEngine(engineId)
  const compact = variant === "compact"
  const inputId = compact ? "tj-search-compact" : "tj-search"
  const calm = usePrefersReducedMotion()
  const [hopping, setHopping] = useState(false)

  // Restart the hop even when it is clicked mid-air: drop the flag, then set it
  // on the next frame so the animation runs from the top again.
  function hop() {
    setHopping(false)
    requestAnimationFrame(() => setHopping(true))
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(ENGINE_KEY, engineId)
    } catch {
      // Choice stays in memory when storage is unavailable.
    }
  }, [engineId])

  // "/" or Cmd/Ctrl+K jumps into the field from anywhere on the page.
  useEffect(() => {
    if (!shortcuts) return

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)

      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }

      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [shortcuts])

  function clear() {
    setQuery("")
    inputRef.current?.focus()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = resolveQuery(query, engine)
    if (target) window.location.assign(target)
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onMouseDown={(event) => {
        // Clicking the padding or the gap inside the pill should feel like clicking the field.
        if (event.target === event.currentTarget) {
          event.preventDefault()
          inputRef.current?.focus()
        }
      }}
      className={
        compact
          ? "glass-shell search-shell relative flex h-9 w-full cursor-text items-center gap-0.5 rounded-full p-1"
          : "glass-shell search-shell relative mx-auto flex h-14 w-full cursor-text items-center gap-0.5 rounded-full p-1.5"
      }
      style={compact ? undefined : { maxWidth: width ?? 608 }}
    >
      <label htmlFor={inputId} className="sr-only">
        搜索或输入网址
      </label>

      {/*
        modal={false}: the modal default locks body scroll, which removes the
        scrollbar and widens the page by its width. The fixed wallpaper rescales
        with `cover` at that moment, so the photo visibly jumps sideways.
      */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`搜索引擎：${engine.name}`}
            className={
              compact
                ? "flex h-7 shrink-0 items-center gap-1 rounded-full pl-1.5 pr-1 text-[11.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98]"
                : "flex h-11 shrink-0 items-center gap-1.5 rounded-full pl-2 pr-2 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] sm:pl-2.5 sm:pr-2.5"
            }
          >
            <span
              aria-hidden="true"
              className={compact ? "grid size-4 place-items-center" : "grid size-[18px] place-items-center"}
            >
              <Mark mark={engine.mark} size={compact ? 15 : 17} />
            </span>
            <span className={compact ? "hidden" : "hidden sm:inline"}>{engine.name}</span>
            <ChevronDown size={compact ? 11 : 13} aria-hidden="true" className="opacity-55" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={compact ? 8 : 10} className="min-w-[11.5rem]">
          <DropdownMenuLabel>搜索引擎</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={engineId} onValueChange={setEngineId}>
            {engines.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                <span aria-hidden="true" className="grid size-[18px] shrink-0 place-items-center">
                  <Mark mark={item.mark} size={16} />
                </span>
                {item.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        id={inputId}
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setQuery("")
            inputRef.current?.blur()
          }
        }}
        placeholder={compact ? "搜索" : "搜索，或输入网址"}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        inputMode="search"
        className={
          compact
            ? "h-7 flex-1 bg-transparent px-1.5 text-[12.5px] outline-none focus-visible:outline-none"
            : "h-11 flex-1 bg-transparent px-2 text-[15px] outline-none focus-visible:outline-none"
        }
      />

      <div className="flex shrink-0 items-center">
        {/*
          Clear appears only once there is something to clear; the submit arrow
          takes the place of the magnifier, so the field never resizes.
        */}
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="清空"
            className={
              compact
                ? "grid size-6 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                : "grid size-8 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            }
          >
            <X size={compact ? 12 : 14} aria-hidden="true" />
          </button>
        ) : null}

        {query ? (
          <Button
            type="submit"
            size="icon-sm"
            aria-label="搜索"
            className={compact ? "size-7" : "size-10"}
          >
            <ArrowRight size={compact ? 13 : 16} aria-hidden="true" />
          </Button>
        ) : (
          <div
            className={
              compact
                ? "grid size-7 place-items-center"
                : "grid size-10 place-items-center pr-0.5"
            }
          >
            <Search
              size={compact ? 13 : 16}
              aria-hidden="true"
              className="text-ink-muted opacity-70"
            />
          </div>
        )}
      </div>

      {/*
        Last in the form on purpose: it is an easter egg, so Tab should reach the
        field, the engine and the submit button first.
      */}
      {compact ? null : (
        <button
          type="button"
          aria-label="摸摸猫"
          data-hop={hopping ? "true" : undefined}
          onClick={hop}
          onAnimationEnd={() => setHopping(false)}
          className="search-cat"
        >
          <img
            src={`${import.meta.env.BASE_URL}${calm ? "cat-still.png" : "cat.webp"}`}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className="search-cat-img"
          />
        </button>
      )}
    </form>
  )
}
