import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowsRotate, Pen, Reorder, Sort, Trash } from "reicon-react"

import { Mark, plateProps } from "@/components/Mark"
import type { Site } from "@/data/sites"
import { hostOf } from "@/lib/site-store"
import { cn } from "@/lib/utils"

type Drag = { id: string; from: number; to: number; dy: number }

/** Pinyin order for Chinese names, so 教务 sorts under J and not by code point. */
const collator = new Intl.Collator("zh-Hans-CN-u-co-pinyin", { numeric: true, sensitivity: "base" })

/** How close to the panel's edge a drag has to get before the panel scrolls. */
const EDGE = 40

function scrollParent(element: HTMLElement | null) {
  let node = element?.parentElement ?? null
  while (node) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node
    node = node.parentElement
  }
  return null
}

/**
 * One folder's sites, in the order the grid shows them, reorderable three ways:
 * drag the handle (mouse or touch), press ↑/↓ on it, or sort the whole folder
 * by name. While dragging, the other rows step aside so the gap shows where
 * the site will land; on release it settles into that gap instead of jumping.
 */
export function SortableSites({
  sites,
  customOrder,
  onReorder,
  onResetOrder,
  onEdit,
  onRemove,
}: {
  sites: Site[]
  /** The folder has a manual order to undo. */
  customOrder: boolean
  onReorder: (ids: string[]) => void
  onResetOrder: () => void
  onEdit: (site: Site) => void
  onRemove: (id: string) => void
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [settle, setSettle] = useState<{ id: string; offset: number; still: boolean } | null>(null)
  const [message, setMessage] = useState("")
  const refocus = useRef<string | null>(null)
  const session = useRef<{
    pointer: number
    startY: number
    lastY: number
    startScroll: number
    row: number
    scroller: HTMLElement | null
    frame: number
  } | null>(null)

  const ids = sites.map((site) => site.id)

  // After a keyboard move React has re-ordered the rows; keep focus on the handle.
  useLayoutEffect(() => {
    const id = refocus.current
    if (!id) return
    refocus.current = null
    listRef.current?.querySelector<HTMLElement>(`[data-handle="${CSS.escape(id)}"]`)?.focus()
  })

  // Two frames: land the row where it was let go without transitions, then let it glide in.
  useEffect(() => {
    if (!settle?.still) return
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSettle((current) => (current ? { ...current, still: false } : null))),
    )
    return () => cancelAnimationFrame(frame)
  }, [settle])

  function commit(next: string[], id: string, place: number) {
    onReorder(next)
    const title = sites.find((site) => site.id === id)?.title ?? ""
    setMessage(`${title} 移到第 ${place + 1} 位，共 ${next.length} 个`)
  }

  function nudge(index: number, delta: number) {
    const to = index + delta
    if (to < 0 || to >= ids.length) return
    const next = [...ids]
    const [id] = next.splice(index, 1)
    next.splice(to, 0, id)
    refocus.current = id
    commit(next, id, to)
  }

  function track(clientY: number) {
    const state = session.current
    if (!state) return
    state.lastY = clientY
    const scrolled = (state.scroller?.scrollTop ?? 0) - state.startScroll
    const dy = clientY - state.startY + scrolled
    setDrag((current) =>
      current
        ? {
            ...current,
            dy,
            to: Math.max(0, Math.min(ids.length - 1, Math.round(current.from + dy / state.row))),
          }
        : null,
    )
  }

  // Near the panel's top or bottom edge the panel scrolls, and the row rides along.
  function autoscroll() {
    const state = session.current
    if (!state?.scroller) return
    const box = state.scroller.getBoundingClientRect()
    const speed =
      state.lastY < box.top + EDGE
        ? -Math.ceil((box.top + EDGE - state.lastY) / 4)
        : state.lastY > box.bottom - EDGE
          ? Math.ceil((state.lastY - box.bottom + EDGE) / 4)
          : 0
    if (speed) {
      state.scroller.scrollTop += speed
      track(state.lastY)
    }
    state.frame = requestAnimationFrame(autoscroll)
  }

  function start(event: React.PointerEvent<HTMLButtonElement>, id: string, index: number) {
    if (event.button !== 0 || sites.length < 2) return
    event.preventDefault()
    const rows = listRef.current?.children
    const first = rows?.[0] as HTMLElement | undefined
    const second = rows?.[1] as HTMLElement | undefined
    if (!first || !second) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const scroller = scrollParent(listRef.current)
    session.current = {
      pointer: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      startScroll: scroller?.scrollTop ?? 0,
      row: second.offsetTop - first.offsetTop,
      scroller,
      frame: requestAnimationFrame(autoscroll),
    }
    setSettle(null)
    setDrag({ id, from: index, to: index, dy: 0 })
  }

  function end(cancelled: boolean) {
    const state = session.current
    if (!state || !drag) return
    cancelAnimationFrame(state.frame)
    session.current = null
    setDrag(null)
    if (cancelled || drag.to === drag.from) {
      setSettle({ id: drag.id, offset: drag.dy, still: true })
      return
    }
    const next = [...ids]
    next.splice(drag.from, 1)
    next.splice(drag.to, 0, drag.id)
    setSettle({ id: drag.id, offset: drag.from * state.row + drag.dy - drag.to * state.row, still: true })
    commit(next, drag.id, drag.to)
  }

  function rowStyle(id: string, index: number): CSSProperties | undefined {
    if (drag) {
      if (id === drag.id) return { transform: `translateY(${drag.dy}px)`, transition: "none" }
      const row = session.current?.row ?? 0
      if (drag.from < drag.to && index > drag.from && index <= drag.to) return { transform: `translateY(${-row}px)` }
      if (drag.from > drag.to && index >= drag.to && index < drag.from) return { transform: `translateY(${row}px)` }
      return undefined
    }
    if (settle?.id === id && settle.still) return { transform: `translateY(${settle.offset}px)`, transition: "none" }
    return undefined
  }

  if (sites.length === 0) {
    return <p className="px-3.5 pb-2.5 pt-0.5 text-[11.5px] text-ink-muted">空文件夹</p>
  }

  return (
    <div className="px-1.5 pb-1.5">
      <ul
        ref={listRef}
        className="sortable-sites relative space-y-0.5"
        data-dragging={drag ? "true" : undefined}
        // Rows that stepped aside are already where the new order puts them.
        data-settling={settle?.still ? "true" : undefined}
      >
        {sites.map((site, index) => {
          const lifted = drag?.id === site.id
          return (
            <li
              key={site.id}
              style={rowStyle(site.id, index)}
              data-lifted={lifted || undefined}
              className={cn(
                "sortable-row relative flex items-center gap-1.5 rounded-[12px] py-1.5 pl-0.5 pr-1.5",
                lifted ? "z-10 bg-[var(--mat-raised)] shadow-[var(--lift-float)]" : "hover:bg-accent",
              )}
            >
              <button
                type="button"
                data-handle={site.id}
                aria-label={`调整 ${site.title} 的位置`}
                aria-describedby="sortable-hint"
                onPointerDown={(event) => start(event, site.id, index)}
                onPointerMove={(event) => {
                  if (session.current?.pointer === event.pointerId) track(event.clientY)
                }}
                onPointerUp={() => end(false)}
                onPointerCancel={() => end(true)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault()
                    nudge(index, event.key === "ArrowUp" ? -1 : 1)
                  }
                }}
                className={cn(
                  "grid h-7 w-5 shrink-0 touch-none place-items-center rounded-md text-ink-muted transition-colors hover:text-ink",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
                  lifted ? "cursor-grabbing text-ink" : "cursor-grab",
                )}
              >
                <Reorder size={14} aria-hidden="true" />
              </button>
              <span
                className="nav-tile-plate grid size-7 shrink-0 place-items-center overflow-hidden rounded-[9px]"
                {...plateProps(site.mark)}
              >
                <Mark mark={site.mark} size={16} />
              </span>
              <span className="ml-0.5 min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-ink">{site.title}</span>
                <span className="block truncate text-[10.5px] text-ink-muted">{hostOf(site.url)}</span>
              </span>
              <button
                type="button"
                aria-label={`编辑 ${site.title}`}
                onClick={() => onEdit(site)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Pen size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`删除 ${site.title}`}
                onClick={() => onRemove(site.id)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Trash size={13} aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      {sites.length > 1 ? (
        <div className="mt-1 flex items-center gap-1 px-0.5">
          <button
            type="button"
            onClick={() => {
              const next = [...sites].sort((a, b) => collator.compare(a.title, b.title)).map((site) => site.id)
              onReorder(next)
              setMessage("已按名称排列")
            }}
            className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] text-ink-muted transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Sort size={12} aria-hidden="true" />
            按名称排列
          </button>
          {customOrder ? (
            <button
              type="button"
              onClick={() => {
                onResetOrder()
                setMessage("已恢复默认顺序")
              }}
              className="flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] text-ink-muted transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ArrowsRotate size={12} aria-hidden="true" />
              恢复默认顺序
            </button>
          ) : null}
        </div>
      ) : null}

      <p role="status" className="sr-only">
        {message}
      </p>
    </div>
  )
}
