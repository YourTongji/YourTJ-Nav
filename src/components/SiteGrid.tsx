import { useEffect, useRef, useState } from "react"
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

export function SiteGrid({ folder, onReorder, onAdd, onVisit }: SiteGridProps) {
  const [page, setPage] = useState(0)
  const pageSize = usePageSize()
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
      <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-5 md:grid-cols-6 lg:grid-cols-8">
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
          <button
            type="button"
            aria-label="上一页"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="grid size-7 place-items-center rounded-full text-ink-muted transition-colors hover:bg-glass hover:text-ink disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span className="min-w-10 text-center text-[11.5px] tabular-nums text-ink-muted">
            {current + 1} / {pages}
          </span>
          <button
            type="button"
            aria-label="下一页"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            className="grid size-7 place-items-center rounded-full text-ink-muted transition-colors hover:bg-glass hover:text-ink disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
