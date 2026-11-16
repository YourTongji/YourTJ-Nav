import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ExternalDrive, Plus, Star } from "reicon-react"

import { Mark, plateProps } from "@/components/Mark"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { Site } from "@/data/sites"
import { useDraggingSiteId } from "@/hooks/use-site-drag"
import { isSiteDrag, readDraggedId, writeDragData, endSiteDrag, beginSiteDrag } from "@/lib/drag"
import { cn } from "@/lib/utils"

type Marker = { x: number; y: number; h: number }

/**
 * The pinned row sits directly under the search field and is the user's own
 * list: drag within it to reorder, drag a site down from the grid to pin it,
 * right-click to unpin, "+" to add.
 */
export function PinnedBar({
  pins,
  onVisit,
  onRemove,
  onMove,
  onPin,
  onOpenPicker,
}: {
  pins: Site[]
  onVisit: (id: string) => void
  onRemove: (id: string) => void
  onMove: (from: number, to: number) => void
  onPin: (id: string, index?: number) => void
  onOpenPicker: () => void
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const draggingId = useDraggingSiteId()
  const [scrollable, setScrollable] = useState(false)
  // 哪一侧还有内容没露出来，决定箭头往哪边渐显
  const [edges, setEdges] = useState({ left: false, right: false })
  const [marker, setMarker] = useState<Marker | null>(null)
  const [ctxSite, setCtxSite] = useState<{ site: Site; index: number } | null>(null)

  // One row, always: past a handful of pins the row scrolls sideways instead
  // of pushing the hero down another line on a phone.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const measure = () => {
      const max = scroller.scrollWidth - scroller.clientWidth
      setScrollable(max > 1)
      setEdges({ left: scroller.scrollLeft > 2, right: scroller.scrollLeft < max - 2 })
    }

    measure()
    scroller.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => {
      scroller.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [pins.length])

  /*
    纵向滚轮在置顶栏上转成横向滚动。React 的 onWheel 是 passive 的，拦不住默认行为，
    所以直接挂原生监听。滚到头之后不再拦，页面照常往下滚。
  */
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const onWheel = (event: WheelEvent) => {
      const max = scroller.scrollWidth - scroller.clientWidth
      if (max <= 1) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

      const goingRight = event.deltaY > 0
      const blocked = goingRight ? scroller.scrollLeft >= max - 1 : scroller.scrollLeft <= 1
      if (blocked) return

      event.preventDefault()
      scroller.scrollLeft += event.deltaY
    }

    scroller.addEventListener("wheel", onWheel, { passive: false })
    return () => scroller.removeEventListener("wheel", onWheel)
  }, [])

  function nudge(direction: -1 | 1) {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: "smooth" })
  }

  const pinnedIds = new Set(pins.map((site) => site.id))
  const isExternal = draggingId !== null && !pinnedIds.has(draggingId)

  /** Where a drop at this x would land, and where to draw the insertion bar. */
  function locate(clientX: number) {
    const list = listRef.current
    if (!list) return null
    const box = list.getBoundingClientRect()
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-pin-id]"))

    if (items.length === 0) return { index: 0, marker: null }

    let index = items.length
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect()
      if (clientX < rect.left + rect.width / 2) {
        index = i
        break
      }
    }

    const edge =
      index === 0
        ? items[0].getBoundingClientRect()
        : items[Math.min(index, items.length) - 1].getBoundingClientRect()

    const x = index === 0 ? edge.left - box.left - 3 : edge.right - box.left + 1
    return { index, marker: { x, y: edge.top - box.top, h: edge.height } }
  }

  function clear() {
    setMarker(null)
  }

  return (
    <section aria-label="置顶站点" className="relative mt-6">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative">
            <div className="relative">
            <div
              ref={scrollerRef}
              data-scrollable={scrollable ? "true" : undefined}
              className="pinned-row overflow-x-auto overscroll-x-contain"
            >
            <ul
              ref={listRef}
              data-drop={isExternal && marker ? "true" : undefined}
              onContextMenuCapture={(event) => {
                const tile = (event.target as HTMLElement).closest("[data-pin-id]")
                const id = tile?.getAttribute("data-pin-id") ?? null
                const index = pins.findIndex((site) => site.id === id)
                setCtxSite(index === -1 ? null : { site: pins[index], index })
              }}
              onDragOver={(event) => {
                if (!isSiteDrag(event)) return
                event.preventDefault()
                event.dataTransfer.dropEffect = isExternal ? "copy" : "move"
                const spot = locate(event.clientX)
                if (spot) setMarker(spot.marker)
                // Drag past either edge and the row follows.
                const scroller = scrollerRef.current
                if (scroller && scroller.scrollWidth > scroller.clientWidth) {
                  const box = scroller.getBoundingClientRect()
                  if (event.clientX < box.left + 48) scroller.scrollLeft -= 12
                  else if (event.clientX > box.right - 48) scroller.scrollLeft += 12
                }
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return
                clear()
              }}
              onDrop={(event) => {
                if (!isSiteDrag(event)) return
                event.preventDefault()
                const spot = locate(event.clientX)
                const id = readDraggedId(event)
                clear()
                endSiteDrag()
                if (!id || !spot) return

                const from = pins.findIndex((site) => site.id === id)
                if (from === -1) {
                  onPin(id, spot.index)
                  return
                }
                // The dragged tile is still in the list while dropping, so an
                // insertion point to its right is one slot lower once it moves.
                onMove(from, spot.index > from ? spot.index - 1 : spot.index)
              }}
              className={cn(
                "relative flex w-max min-w-full items-start justify-center gap-1 rounded-2xl transition-colors duration-150",
                isExternal && marker && "bg-[color-mix(in_oklab,var(--background)_38%,transparent)]",
              )}
            >
              {pins.map((site) => (
                <li
                  key={site.id}
                  data-pin-id={site.id}
                  draggable
                  onDragStart={(event) => {
                    writeDragData(event, site.id)
                    beginSiteDrag(site.id)
                  }}
                  onDragEnd={() => {
                    endSiteDrag()
                    clear()
                  }}
                  className={cn(
                    "w-[64px] rounded-[14px] transition-opacity duration-150",
                    draggingId === site.id && "opacity-35",
                  )}
                >
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onVisit(site.id)}
                    className="group flex cursor-grab flex-col items-center gap-1.5 rounded-[14px] px-1 py-1.5 transition-colors hover:bg-[color-mix(in_oklab,var(--background)_45%,transparent)] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span
                      className="nav-tile-plate grid size-11 place-items-center overflow-hidden rounded-[13px] transition-transform duration-150 group-hover:-translate-y-0.5"
                      {...plateProps(site.mark)}
                    >
                      <Mark mark={site.mark} size={22} />
                    </span>
                    <span className="w-full truncate text-center text-[10.5px] leading-tight text-ink-muted transition-colors group-hover:text-ink">
                      {site.title}
                    </span>
                  </a>
                </li>
              ))}

              <li>
                <button
                  type="button"
                  onClick={onOpenPicker}
                  aria-label={pins.length ? "添加置顶站点" : "选择置顶站点"}
                  className="group flex w-[64px] flex-col items-center gap-1.5 rounded-[14px] px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="grid size-11 place-items-center rounded-[13px] border border-dashed border-hairline-strong text-ink-muted transition-colors group-hover:border-brand group-hover:text-ink">
                    {pins.length ? (
                      <Plus size={16} aria-hidden="true" />
                    ) : (
                      <Star size={17} aria-hidden="true" />
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[10.5px] leading-tight text-ink-muted transition-colors group-hover:text-ink">
                    {pins.length ? "添加" : "置顶常用"}
                  </span>
                </button>
              </li>

              {marker ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute w-[3px] rounded-full bg-brand shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_22%,transparent)]"
                  style={{ left: marker.x, top: marker.y, height: marker.h }}
                />
              ) : null}
            </ul>
            </div>

            {/* 只有那一侧还有内容时才渐显，不做按钮外观，就一个箭头 */}
            <button
              type="button"
              aria-label="向左滚动置顶"
              tabIndex={edges.left ? 0 : -1}
              aria-hidden={!edges.left}
              onClick={() => nudge(-1)}
              data-visible={edges.left ? "true" : undefined}
              className="pinned-arrow pinned-arrow-left"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="向右滚动置顶"
              tabIndex={edges.right ? 0 : -1}
              aria-hidden={!edges.right}
              onClick={() => nudge(1)}
              data-visible={edges.right ? "true" : undefined}
              className="pinned-arrow pinned-arrow-right"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
            </div>

            {isExternal ? (
              <p
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-ink-muted"
              >
                松手置顶
              </p>
            ) : null}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {ctxSite ? (
            <>
              <ContextMenuLabel>{ctxSite.site.title}</ContextMenuLabel>
              <ContextMenuItem asChild>
                <a href={ctxSite.site.url} target="_blank" rel="noopener noreferrer">
                  <ExternalDrive size={14} aria-hidden="true" />
                  打开
                </a>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onMove(ctxSite.index, ctxSite.index - 1)}>
                前移一位
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onMove(ctxSite.index, ctxSite.index + 1)}>
                后移一位
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onRemove(ctxSite.site.id)}>
                取消置顶
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem onSelect={onOpenPicker}>添加置顶站点…</ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </section>
  )
}
