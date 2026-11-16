import { ArrowRight, History, X } from "reicon-react"

import { Mark, plateProps } from "@/components/Mark"
import type { Ranges, Suggestion } from "@/lib/suggest"
import { cn } from "@/lib/utils"

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** The matched part carries weight, not a highlighter: the panel is already glass. */
function Highlighted({ text, ranges }: { text: string; ranges: Ranges }) {
  if (!ranges.length) return <>{text}</>
  const chars = [...text]
  const parts: { text: string; hit: boolean }[] = []
  let at = 0
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ text: chars.slice(at, start).join(""), hit: false })
    parts.push({ text: chars.slice(start, end).join(""), hit: true })
    at = end
  }
  if (at < chars.length) parts.push({ text: chars.slice(at).join(""), hit: false })
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? (
          <mark key={index} className="bg-transparent font-semibold text-ink">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

export const optionId = (listId: string, index: number) => `${listId}-${index}`

/**
 * The rows under a search field: matching sites (shipped and the user's own),
 * then past searches. Pure presentation; SearchBar owns the keyboard, the
 * selection and what a row does. Rows are not focusable: focus stays in the
 * field and the selection travels by `aria-activedescendant`, the way an
 * address bar works.
 */
export function SearchSuggestions({
  id,
  items,
  active,
  compact,
  idle,
  state,
  onHover,
  onPick,
  onForget,
  onClearHistory,
}: {
  id: string
  items: Suggestion[]
  active: number
  compact: boolean
  /** Nothing typed: the list is recent searches, with a way to clear them. */
  idle: boolean
  state: "open" | "closing"
  onHover: (index: number) => void
  onPick: (index: number, newTab: boolean) => void
  onForget: (text: string) => void
  onClearHistory: () => void
}) {
  const firstHistory = items.findIndex((item) => item.kind === "history")
  const hasSites = items[0]?.kind === "site"

  return (
    <div
      data-state={state}
      data-placement={compact ? "bar" : "hero"}
      // Clicking a row must not take focus from the field: the field is the control.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "suggest-panel mat-panel absolute top-full z-30 overflow-hidden",
        compact
          ? "left-1/2 mt-2.5 w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[18px] p-1.5"
          : "inset-x-0 mt-2 rounded-[22px] p-1.5",
      )}
    >
      <div
        id={id}
        role="listbox"
        aria-label="搜索候选"
        className="max-h-[min(62dvh,30rem)] overflow-y-auto overscroll-contain"
      >
        {items.map((item, index) => {
          const selected = index === active
          const label =
            index === 0 && hasSites ? "站点" : index === firstHistory ? (idle ? "最近搜索" : "搜索记录") : null
          return (
            <div key={item.kind === "site" ? `s:${item.site.id}` : `h:${item.text}`}>
              {label ? (
                <div
                  role="presentation"
                  className={cn(
                    "flex items-center justify-between px-2.5 pb-1 text-[11px] font-medium text-ink-muted",
                    index === 0 ? "pt-1" : "pt-2.5",
                  )}
                >
                  <span>{label}</span>
                  {idle && index === firstHistory ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={onClearHistory}
                      className="-my-1 rounded-full px-2 py-1 text-[11px] font-normal text-ink-muted transition-colors hover:bg-accent hover:text-ink"
                    >
                      清空
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div
                id={optionId(id, index)}
                role="option"
                aria-selected={selected}
                data-active={selected}
                onMouseMove={() => {
                  if (!selected) onHover(index)
                }}
                onClick={(event) => onPick(index, event.metaKey || event.ctrlKey)}
                onAuxClick={(event) => {
                  if (event.button === 1) onPick(index, true)
                }}
                className={cn(
                  "suggest-row group/row flex cursor-pointer items-center select-none",
                  compact ? "h-9 gap-2.5 rounded-[12px] pl-1.5 pr-1" : "h-11 gap-3 rounded-[16px] pl-2 pr-1.5",
                  selected && "bg-accent",
                )}
              >
                {item.kind === "site" ? (
                  <span
                    className={cn(
                      "nav-tile-plate grid shrink-0 place-items-center overflow-hidden",
                      compact ? "size-6 rounded-[7px]" : "size-7 rounded-[9px]",
                    )}
                    {...plateProps(item.site.mark)}
                  >
                    <Mark mark={item.site.mark} size={compact ? 14 : 16} />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn("grid shrink-0 place-items-center text-ink-muted", compact ? "size-6" : "size-7")}
                  >
                    <History size={compact ? 14 : 15} />
                  </span>
                )}

                <span
                  className={cn(
                    "flex min-w-0 flex-1 items-baseline gap-2",
                    compact ? "text-[12.5px]" : "text-[13.5px]",
                  )}
                >
                  <span className="min-w-0 shrink truncate text-ink">
                    <Highlighted text={item.kind === "site" ? item.site.title : item.text} ranges={item.ranges} />
                  </span>
                  {item.kind === "site" ? (
                    <span className="min-w-0 shrink-[2] truncate text-[11.5px] text-ink-muted">
                      {hostOf(item.site.url)}
                    </span>
                  ) : null}
                </span>

                {item.kind === "site" && item.local ? (
                  <span className="shrink-0 rounded-full bg-[var(--mat-well)] px-1.5 py-px text-[10.5px] text-ink-muted">
                    本地
                  </span>
                ) : null}

                {item.kind === "history" ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`删除搜索记录 ${item.text}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onForget(item.text)
                    }}
                    className={cn(
                      "suggest-forget grid shrink-0 place-items-center rounded-full text-ink-muted transition-[opacity,color,background-color] duration-150 hover:bg-[var(--mat-well)] hover:text-ink",
                      compact ? "size-6" : "size-7",
                    )}
                  >
                    <X size={compact ? 11 : 12} aria-hidden="true" />
                  </button>
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "suggest-go grid shrink-0 place-items-center text-ink-muted",
                      compact ? "size-6" : "size-7",
                    )}
                  >
                    <ArrowRight size={compact ? 12 : 13} />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {compact ? null : (
        <p
          aria-hidden="true"
          className="suggest-keys flex items-center gap-3 px-2.5 pb-0.5 pt-2 text-[10.5px] text-ink-muted"
        >
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>⌘/Ctrl ↵ 新标签页</span>
          <span className="ml-auto">Esc 关闭</span>
        </p>
      )}
    </div>
  )
}
