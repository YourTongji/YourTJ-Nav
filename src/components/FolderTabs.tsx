import { useEffect, useRef, useState } from "react"
import { Check, Plus } from "reicon-react"

import type { Folder } from "@/hooks/use-sites"
import { cn } from "@/lib/utils"

type FolderTabsProps = {
  folders: Folder[]
  active: string
  onChange: (id: string) => void
  onCreate: (label: string) => void
}

export function FolderTabs({ folders, active, onChange, onCreate }: FolderTabsProps) {
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  // Which ends still hide tabs. On a phone six folders do not fit, and a row
  // cut flush at the edge reads as complete; the hidden side fades instead.
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const max = list.scrollWidth - list.clientWidth
      setEdges((previous) => {
        const next = { start: list.scrollLeft > 2, end: list.scrollLeft < max - 2 }
        return previous.start === next.start && previous.end === next.end ? previous : next
      })
    }
    measure()
    list.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => {
      list.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [folders.length])

  // The chosen tab is always fully in view, with room to see the next one.
  useEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>(`[data-folder="${active}"]`)
    if (!list || !tab) return
    const margin = 32
    const left = tab.offsetLeft - list.offsetLeft
    const right = left + tab.offsetWidth
    let target = list.scrollLeft
    if (left - margin < list.scrollLeft) target = left - margin
    else if (right + margin > list.scrollLeft + list.clientWidth) target = right + margin - list.clientWidth
    if (target === list.scrollLeft) return
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    list.scrollTo({ left: Math.max(0, target), behavior: calm ? "auto" : "smooth" })
  }, [active])

  function commit() {
    const value = label.trim()
    if (value) onCreate(value)
    setLabel("")
    setCreating(false)
  }

  function move(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const next = folders[(index + (event.key === "ArrowRight" ? 1 : -1) + folders.length) % folders.length]
    if (!next) return
    onChange(next.id)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-folder="${next.id}"]`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="文件夹"
      data-fade-start={edges.start ? "true" : undefined}
      data-fade-end={edges.end ? "true" : undefined}
      className="scroll-fade flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {folders.map((folder, index) => {
        const selected = folder.id === active
        return (
          <button
            key={folder.id}
            type="button"
            role="tab"
            data-folder={folder.id}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(folder.id)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-[background-color,color,box-shadow] duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              // The selected tab is the same glass as every chip on the page.
              // Unselected labels sit straight on the photo, where muted ink measured
              // 4.1:1 at worst; the plate, not the ink, is what marks the choice.
              selected ? "nav-chip text-ink" : "text-ink hover:bg-glass",
            )}
          >
            {folder.label}
            <span className="text-[10.5px] tabular-nums opacity-70">{folder.sites.length}</span>
          </button>
        )
      })}

      {creating ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-hairline-strong bg-glass px-2 py-1">
          <input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit()
              if (event.key === "Escape") {
                setLabel("")
                setCreating(false)
              }
            }}
            onBlur={commit}
            placeholder="文件夹名称"
            aria-label="新文件夹名称"
            className="h-5 w-24 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            aria-label="创建文件夹"
            onMouseDown={(event) => event.preventDefault()}
            onClick={commit}
            className="grid size-5 place-items-center rounded-full text-ink-muted hover:text-ink"
          >
            <Check size={12} aria-hidden="true" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          aria-label="新建文件夹"
          onClick={() => setCreating(true)}
          className="grid size-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-glass hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
