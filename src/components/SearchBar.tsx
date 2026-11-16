import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ArrowRight, ChevronDown, Search, X } from "reicon-react"

import { Mark } from "@/components/Mark"
import { SearchCat } from "@/components/SearchCat"
import { optionId, SearchSuggestions } from "@/components/SearchSuggestions"
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
import { engines, resolveQuery } from "@/data/engines"
import type { SearchController } from "@/hooks/use-search"
import { suggest, type SuggestSource } from "@/lib/suggest"

/** The hero has the room for a full list; the bar's field drops a shorter one. */
const LIMITS = {
  hero: { sites: 5, history: 3, idle: 6 },
  compact: { sites: 4, history: 2, idle: 5 },
}
/** Matches the panel's exit in index.css. */
const EXIT_MS = 120

/** Keeps a closing panel mounted long enough to fade, and reports which phase it is in. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open])
  return mounted ? (open ? "open" : "closing") : null
}

type SearchBarProps = {
  /** The draft and engine, shared with the other field on the page. */
  search: SearchController
  /** `compact` is the one that moves into the nav bar once the hero scrolls away. */
  variant?: "hero" | "compact"
  /** Only the field that is actually on screen should answer "/" and Cmd+K. */
  shortcuts?: boolean
  /** Hero width in px, from the appearance settings. */
  width?: number
  /** What the suggestion list draws from, besides the search history. */
  source: Omit<SuggestSource, "history">
  /** A site opened from the list, for 最近访问. */
  onVisit: (id: string) => void
  /** The cat on the hero's rim, and how to send it away from its own menu. */
  cat?: boolean
  onHideCat?: () => void
}

export function SearchBar({
  search,
  variant = "hero",
  shortcuts = true,
  width,
  source,
  onVisit,
  cat = false,
  onHideCat,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const { query, setQuery, engine, engineId, setEngineId } = search
  const compact = variant === "compact"
  const inputId = compact ? "tj-search-compact" : "tj-search"
  const listId = useId()

  const [focused, setFocused] = useState(false)
  // Escape closes the list until the text changes again.
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(-1)
  // A past search the arrow keys rest on shows in the field without replacing the draft.
  const [preview, setPreview] = useState<string | null>(null)

  const items = useMemo(
    () => suggest(query, { ...source, history: search.history }, LIMITS[variant]),
    [query, source, search.history, variant],
  )
  // `shortcuts` is also "this field is the one on screen": the other one never shows a list.
  const open = focused && shortcuts && !dismissed && items.length > 0
  const presence = usePresence(open)
  const selected = open && active >= 0 && active < items.length ? active : -1

  // A new draft is a new list: nothing selected, nothing previewed.
  useEffect(() => {
    setActive(-1)
    setPreview(null)
  }, [query])

  useEffect(() => {
    if (!shortcuts) {
      setFocused(false)
      setPreview(null)
    }
  }, [shortcuts])

  // Keep the selected row in view when the arrows walk past the list's edge.
  useEffect(() => {
    if (selected < 0) return
    document.getElementById(optionId(listId, selected))?.scrollIntoView({ block: "nearest" })
  }, [selected, listId])

  function close() {
    setDismissed(true)
    setActive(-1)
    setPreview(null)
  }

  function select(index: number) {
    setActive(index)
    const item = items[index]
    setPreview(item?.kind === "history" ? item.text : null)
  }

  function go(text: string, newTab = false) {
    const target = resolveQuery(text, engine)
    if (!target) return
    search.remember(text)
    close()
    if (newTab) window.open(target, "_blank", "noopener")
    else window.location.assign(target)
  }

  function pick(index: number, newTab: boolean) {
    const item = items[index]
    if (!item) return
    if (item.kind === "history") {
      setQuery(item.text)
      go(item.text, newTab)
      return
    }
    onVisit(item.site.id)
    close()
    if (newTab) window.open(item.site.url, "_blank", "noopener")
    else window.location.assign(item.site.url)
  }

  function onKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    // Chinese input: Enter and the arrows belong to the IME until it commits.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!items.length) return
      event.preventDefault()
      if (!open) {
        setDismissed(false)
        return
      }
      // The field itself is a stop on the loop: past either end, the draft comes back.
      const step = event.key === "ArrowDown" ? 1 : -1
      const next = selected + step
      if (next < -1 || next >= items.length) select(step === 1 ? -1 : items.length - 1)
      else if (next === -1) select(-1)
      else select(next)
      return
    }

    if (event.key === "Enter" && selected >= 0) {
      event.preventDefault()
      pick(selected, event.metaKey || event.ctrlKey)
      return
    }

    if (event.key === "Delete" && event.shiftKey && selected >= 0) {
      const item = items[selected]
      if (item.kind === "history") {
        event.preventDefault()
        search.forget(item.text)
        setPreview(null)
      }
      return
    }

    if (event.key === "Escape") {
      if (open) {
        event.preventDefault()
        close()
        return
      }
      setQuery("")
      inputRef.current?.blur()
    }
  }
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
    go(preview ?? query)
  }

  return (
    <div
      className={compact ? "relative w-full" : "relative mx-auto w-full"}
      style={compact ? undefined : { maxWidth: width ?? 608 }}
    >
    <form
      ref={formRef}
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
          : "glass-shell search-shell relative flex h-14 w-full cursor-text items-center gap-0.5 rounded-full p-1.5"
      }
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
        value={preview ?? query}
        onChange={(event) => {
          setDismissed(false)
          setQuery(event.target.value)
        }}
        onKeyDown={onKeys}
        // The list belongs to the text field, not to the engine menu or the buttons beside it.
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={() => {
          setFocused(false)
          setPreview(null)
          setActive(-1)
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={selected >= 0 ? optionId(listId, selected) : undefined}
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
        <SearchCat visible={cat} onHide={() => onHideCat?.()} shellRef={formRef} fieldRef={inputRef} />
      )}
    </form>

      {/*
        A sibling of the form, not a child: the form's own backdrop-filter would
        make it the panel's backdrop root, and the panel would blur nothing but
        the pill behind it.
      */}
      {presence ? (
        <SearchSuggestions
          id={listId}
          items={items}
          active={selected}
          compact={compact}
          idle={!query.trim()}
          state={presence}
          onHover={(index) => {
            setActive(index)
            setPreview(null)
          }}
          onPick={pick}
          onForget={search.forget}
          onClearHistory={search.clearHistory}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {open ? `${items.length} 条候选，上下方向键选择` : ""}
      </p>
    </div>
  )
}
