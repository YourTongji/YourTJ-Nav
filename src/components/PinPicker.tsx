import { useMemo, useState } from "react"
import { Check, Search } from "reicon-react"

import { Mark, plateProps } from "@/components/Mark"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Folder } from "@/hooks/use-sites"
import { cn } from "@/lib/utils"

export function PinPicker({
  open,
  onOpenChange,
  folders,
  pinned,
  onToggle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: Folder[]
  pinned: string[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState("")

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return folders
      .map((folder) => ({
        id: folder.id,
        label: folder.label,
        sites: needle
          ? folder.sites.filter(
              (site) =>
                site.title.toLowerCase().includes(needle) ||
                site.description.toLowerCase().includes(needle) ||
                site.url.toLowerCase().includes(needle),
            )
          : folder.sites,
      }))
      .filter((group) => group.sites.length > 0)
  }, [folders, query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogTitle>置顶站点</DialogTitle>
        <DialogDescription>
          勾选的站点会出现在搜索栏下方。也可以直接拖动那一排来调整顺序。
        </DialogDescription>

        <div className="mt-3 flex h-9 items-center gap-2 rounded-[10px] border border-hairline-strong bg-glass px-2.5">
          <Search size={14} aria-hidden="true" className="shrink-0 text-ink-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称或地址"
            aria-label="搜索站点"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
          />
        </div>

        <div className="-mx-1 mt-2 max-h-[46vh] overflow-y-auto overscroll-contain px-1">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-ink-muted">没有匹配的站点</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="py-1">
                <p className="px-1 pb-1 pt-2 text-[11px] font-medium text-ink-muted">
                  {group.label}
                </p>
                {group.sites.map((site) => {
                  const on = pinned.includes(site.id)
                  return (
                    <button
                      key={site.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggle(site.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left transition-colors",
                        "hover:bg-glass-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      )}
                    >
                      <span
                        className="nav-tile-plate grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg"
                        {...plateProps(site.mark)}
                      >
                        <Mark mark={site.mark} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-ink">{site.title}</span>
                        <span className="block truncate text-[10.5px] text-ink-muted">
                          {site.description}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                          on
                            ? "border-brand bg-brand text-brand-ink"
                            : "border-hairline-strong text-transparent",
                        )}
                      >
                        <Check size={9} aria-hidden="true" />
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
