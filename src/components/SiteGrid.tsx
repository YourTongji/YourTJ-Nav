import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "reicon-react"

import { SiteTile } from "@/components/SiteTile"
import { Button } from "@/components/ui/button"
import type { Folder } from "@/hooks/use-sites"
import { beginSiteDrag, endSiteDrag, writeDragData } from "@/lib/drag"
import { cn } from "@/lib/utils"

/** Three rows of eight on a desktop, so one folder rarely needs a second page. */
const PAGE_SIZE = { base: 12, sm: 16, lg: 24 }

function usePageSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return PAGE_SIZE.lg
    if (window.matchMedia("(min-width: 1024px)").matches) return PAGE_SIZE.lg
    if (window.matchMedia("(min-width: 640px)").matches) return PAGE_SIZE.sm
    return PAGE_SIZE.base
  })

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)")
    const medium = window.matchMedia("(min-width: 640px)")
    const update = () =>
      setSize(wide.matches ? PAGE_SIZE.lg : medium.matches ? PAGE_SIZE.sm : PAGE_SIZE.base)
    wide.addEventListener("change", update)
    medium.addEventListener("change", update)
    return () => {
      wide.removeEventListener("change", update)
      medium.removeEventListener("change", update)
    }
  }, [])

  return size
}

/** Replaces the slots a page occupies in the full order, leaving other pages alone. */
function mergePageOrder(all: string[], page: string[]): string[] {
  const onPage = new Set(page)
  let cursor = 0
  return all.map((id) => (onPage.has(id) ? page[cursor++] : id))
}

type SiteGridProps = {
  folder: Folder
  onReorder: (ids: string[]) => void
  onAdd: () => void
  onVisit: (id: string) => void
}

/**
 * How the next page arrives. Only a user's own move animates: a folder switch
 * fades, paging slides a few pixels the way it went, and the first render does
 * neither.
 */
type Motion = "none" | "fade" | "forward" | "back"

export function SiteGrid({ folder, onReorder, onAdd, onVisit }: SiteGridProps) {
  const [view, setView] = useState({ folder: folder.id, page: 0, motion: "none" as Motion })
  const pageSize = usePageSize()
  // Switching folders starts the new one on its first page. Adjusting state
  // during render, not in an effect, so the old folder's page never paints.
  if (view.folder !== folder.id) setView({ folder: folder.id, page: 0, motion: "fade" })
  const page = view.page
  // The id lives in a ref as well: dragstart and drop can land in the same
  // task, and a state update would not be visible to the drop handler yet.
  const dragIdRef = useRef<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Long folders scroll; dragging a tile near an edge should carry the page with it.
  useEffect(() => {
    if (!dragId) return
    let pointerY = 0
    let frame = 0
    const track = (event: DragEvent) => {
      pointerY = event.clientY
    }
    const tick = () => {
      const edge = 96
      if (pointerY && pointerY < edge) {
        window.scrollBy(0, -Math.ceil((edge - pointerY) / 5))
      } else if (pointerY && pointerY > window.innerHeight - edge) {
        window.scrollBy(0, Math.ceil((pointerY - (window.innerHeight - edge)) / 5))
      }
      frame = window.requestAnimationFrame(tick)
    }
    window.addEventListener("dragover", track)
    frame = window.requestAnimationFrame(tick)
    return () => {
      window.removeEventListener("dragover", track)
      window.cancelAnimationFrame(frame)
    }
  }, [dragId])

  const allIds = folder.sites.map((site) => site.id)
  const pages = Math.max(1, Math.ceil(folder.sites.length / pageSize))
  const current = Math.min(page, pages - 1)
  const pageSites = folder.sites.slice(current * pageSize, current * pageSize + pageSize)

  function turn(delta: -1 | 1) {
    const next = current + delta
    if (next < 0 || next >= pages) return
    setView({ folder: folder.id, page: next, motion: delta > 0 ? "forward" : "back" })
  }

  /*
    A short last page would pull the pager and everything under it upward, and
    the next click would land somewhere else. The tallest page seen in this
    folder holds the floor until the folder or the page size changes.
  */
  const listRef = useRef<HTMLUListElement>(null)
  const [floor, setFloor] = useState({ key: "", height: 0 })
  const floorKey = `${folder.id}:${pageSize}`
  useLayoutEffect(() => {
    const height = listRef.current?.offsetHeight ?? 0
    setFloor((previous) =>
      previous.key === floorKey
        ? height > previous.height
          ? { key: floorKey, height }
          : previous
        : { key: floorKey, height },
    )
  })
  const minHeight = pages > 1 && floor.key === floorKey ? floor.height : undefined

  function drop(targetId: string) {
    const moving = dragIdRef.current
    if (!moving || moving === targetId) return
    const ids = pageSites.map((site) => site.id)
    const from = ids.indexOf(moving)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    onReorder(mergePageOrder(allIds, ids))
  }

  if (folder.sites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline-strong px-6 py-12 text-center">
        <p className="text-[13px] text-ink">这个文件夹还是空的</p>
        <p className="mt-1 text-[12px] text-ink-muted">右键这里，或者点下面的按钮</p>
        <Button variant="glass" size="sm" className="mt-4" onClick={onAdd}>
          <Plus size={14} aria-hidden="true" />
          添加站点
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/*
        Keyed by page, so each move remounts the list and its one short entrance
        starts over: rapid clicks restart it instead of stacking.
      */}
      <ul
        key={`${folder.id}:${current}`}
        ref={listRef}
        data-motion={view.motion}
        style={{ minHeight }}
        className="site-page grid content-start grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-5 md:grid-cols-6 lg:grid-cols-8"
      >
        {pageSites.map((site) => (
          <li
            key={site.id}
            data-site-id={site.id}
            draggable
            onDragStart={(event) => {
              dragIdRef.current = site.id
              setDragId(site.id)
              writeDragData(event, site.id)
              beginSiteDrag(site.id)
            }}
            onDragEnd={() => {
              dragIdRef.current = null
              setDragId(null)
              setOverId(null)
              endSiteDrag()
            }}
            onDragOver={(event) => {
              // Only a drag that started in this grid reorders it; a site
              // dragged up from the pins must not light tiles up.
              if (!dragId) return
              event.preventDefault()
              if (overId !== site.id) setOverId(site.id)
            }}
            onDragLeave={() => setOverId((id) => (id === site.id ? null : id))}
            onDrop={(event) => {
              if (!dragIdRef.current) return
              event.preventDefault()
              drop(site.id)
              dragIdRef.current = null
              setDragId(null)
              setOverId(null)
            }}
            className={cn(
              "flex cursor-grab justify-center rounded-xl transition-[opacity,transform] duration-150 active:cursor-grabbing",
              dragId === site.id && "scale-95 opacity-35",
            )}
          >
            <SiteTile
              site={site}
              dropTarget={overId === site.id && dragId !== null && dragId !== site.id}
              onVisit={() => onVisit(site.id)}
            />
          </li>
        ))}
      </ul>

      {pages > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {/*
            aria-disabled rather than disabled: a disabled button drops focus to
            the body, so reaching the last page by keyboard would lose your place.
          */}
          <button
            type="button"
            aria-label="上一页"
            aria-disabled={current === 0}
            onClick={() => turn(-1)}
            className="grid size-7 place-items-center rounded-full text-ink-muted transition-[background-color,color,opacity] duration-150 hover:bg-glass hover:text-ink aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span aria-live="polite" className="min-w-10 text-center text-[11.5px] tabular-nums text-ink-muted">
            <span className="sr-only">第 </span>
            {current + 1} / {pages}
            <span className="sr-only"> 页</span>
          </span>
          <button
            type="button"
            aria-label="下一页"
            aria-disabled={current >= pages - 1}
            onClick={() => turn(1)}
            className="grid size-7 place-items-center rounded-full text-ink-muted transition-[background-color,color,opacity] duration-150 hover:bg-glass hover:text-ink aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
