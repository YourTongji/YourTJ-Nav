import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Check, ChevronDown, Image, Pen, Plus, Trash, X } from "reicon-react"

import { Collapse } from "@/components/Collapse"
import { ClockSection } from "@/components/settings/ClockSection"
import { SortableSites } from "@/components/settings/SortableSites"
import { FieldLabel, SettingsGroup, SwitchRow, revealOpened } from "@/components/settings/primitives"
import { MaterialGallery } from "@/components/MaterialGallery"
import { ThemeGallery } from "@/components/ThemeGallery"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import type { Site } from "@/data/sites"
import { wallpaperSources, type WallpaperSourceId } from "@/data/wallpapers"
import type { AppearanceController } from "@/hooks/use-appearance"
import type { ClockController } from "@/hooks/use-clock-prefs"
import type { ThemeMode } from "@/hooks/use-theme"
import type { SitesController } from "@/hooks/use-sites"
import type { WallpaperController } from "@/hooks/use-wallpaper"
import type { MaterialId } from "@/data/materials"
import { cn } from "@/lib/utils"

type SettingsPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallpaper: WallpaperController
  appearance: AppearanceController
  sites: SitesController
  themeMode: ThemeMode
  onThemeMode: (mode: ThemeMode) => void
  quoteVisible: boolean
  onQuoteVisible: (visible: boolean) => void
  searchWidth: number
  onSearchWidth: (width: number) => void
  clock: ClockController
  material: MaterialId
  onMaterial: (material: MaterialId) => void
  minimal: boolean
  onMinimal: (minimal: boolean) => void
  onEditSite: (site: Site, folderId: string) => void
  onAddSite: (folderId: string) => void
}

function WallpaperSection({
  wallpaper,
  appearance,
}: Pick<SettingsPanelProps, "wallpaper" | "appearance">) {
  const fileRef = useRef<HTMLInputElement>(null)
  const picture = wallpaper.current
  // A picture from a random-redirect endpoint has no address to preview: asking
  // for it again would render a different photo.
  const previewSrc = picture?.exact && !picture.fallback ? picture.url : null
  const isCustom = wallpaper.source === "custom"

  function pickSource(id: WallpaperSourceId) {
    // Switching to "自定义" shows what is already uploaded; it does not force a
    // new file dialog the way a single-slot store had to.
    wallpaper.setSource(id)
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel hint={wallpaperSources.find((source) => source.id === wallpaper.source)?.hint}>
          来源
        </FieldLabel>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-[var(--mat-well)] p-1">
          {wallpaperSources.map((source) => {
            const active = source.id === wallpaper.source
            return (
              <button
                key={source.id}
                type="button"
                aria-pressed={active}
                onClick={() => pickSource(source.id)}
                className={cn(
                  "h-8 rounded-full text-[12.5px] font-medium transition-colors duration-150 pointer-coarse:h-10",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  active
                    ? "bg-[var(--mat-raised)] text-ink shadow-[var(--mat-raised-edge)]"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {source.label}
              </button>
            )
          })}
        </div>
      </div>

      {isCustom ? (
        <div>
          <div className="grid grid-cols-3 gap-2">
            {wallpaper.customs.map((item) => {
              const active = item.id === wallpaper.activeCustom
              return (
                <div key={item.id} className="group relative">
                  <button
                    type="button"
                    aria-pressed={active}
                    aria-label="使用这张壁纸"
                    onClick={() => wallpaper.selectCustom(item.id)}
                    className="relative block aspect-[4/3] w-full overflow-hidden rounded-[10px] ring-1 ring-inset ring-black/10 transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:ring-white/12"
                  >
                    <img src={item.url} alt="" className="size-full object-cover" />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0 rounded-[10px] border-2 transition-colors duration-150",
                        active ? "border-brand" : "border-transparent",
                      )}
                    />
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1 right-1 grid size-4 place-items-center rounded-full bg-brand text-brand-ink"
                      >
                        <Check size={9} aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                  {/* Sibling, not a child: a button cannot nest inside a button. */}
                  <button
                    type="button"
                    aria-label="删除这张壁纸"
                    onClick={() => void wallpaper.removeCustom(item.id)}
                    className={cn(
                      "absolute right-1 top-1 grid size-[18px] place-items-center rounded-full bg-[rgba(17,24,39,0.76)] text-white opacity-0 transition-opacity duration-150 hover:bg-[rgba(17,24,39,0.9)] focus-visible:opacity-100 group-hover:opacity-100",
                      // No hover on touch, so the button is simply there, with a finger-sized target.
                      "[@media(hover:none)]:size-6 [@media(hover:none)]:opacity-100 after:absolute after:-inset-2 after:content-['']",
                    )}
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="添加壁纸"
              className="grid aspect-[4/3] w-full place-items-center rounded-[10px] border border-dashed border-hairline-strong text-ink-muted transition-colors duration-150 hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          {wallpaper.customs.length ? null : (
            <p className="mt-2 text-[11px] text-ink-muted">还没有自定义图片，点上面的 + 添加</p>
          )}
        </div>
      ) : (
        <>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-hairline-strong bg-muted">
            {previewSrc ? (
              <img src={previewSrc} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center px-6 text-center text-[12px] text-ink-muted">
                随机图片，切到页面上查看
              </div>
            )}
            {wallpaper.status === "loading" ? (
              <div
                aria-hidden="true"
                className="absolute inset-x-3 bottom-3 h-[2px] overflow-hidden rounded-full bg-[oklch(1_0_0_/_0.22)]"
              >
                {/* An indeterminate sweep, not a pulsing block: it reads as "fetching". */}
                <span className="wallpaper-sweep block h-full w-1/3 rounded-full bg-[linear-gradient(90deg,transparent,oklch(1_0_0_/_0.95),transparent)]" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="glass" size="sm" onClick={wallpaper.refresh}>
              <Image size={14} aria-hidden="true" />
              换一张
            </Button>
          </div>
        </>
      )}

      <div className="space-y-1 pt-1">
        <FieldLabel hint={`${appearance.appearance.overlay}%`}>遮罩</FieldLabel>
        <Slider
          aria-label="遮罩强度"
          min={0}
          max={80}
          step={5}
          value={[appearance.appearance.overlay]}
          onValueChange={([value]) => appearance.setOverlay(value)}
        />
      </div>

      <div className="space-y-1">
        <FieldLabel hint={`${appearance.appearance.blur}px`}>模糊</FieldLabel>
        <Slider
          aria-label="模糊程度"
          min={0}
          max={20}
          step={1}
          value={[appearance.appearance.blur]}
          onValueChange={([value]) => appearance.setBlur(value)}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void wallpaper.upload(file)
        }}
      />
    </section>
  )
}

function SitesSection({
  sites,
  onEditSite,
  onAddSite,
}: Pick<SettingsPanelProps, "sites" | "onEditSite" | "onAddSite">) {
  const [renaming, setRenaming] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const idBase = useId()

  function toggle(folderId: string, element: HTMLElement | null) {
    const next = new Set(expanded)
    if (next.delete(folderId)) {
      setExpanded(next)
      return
    }
    next.add(folderId)
    setExpanded(next)
    revealOpened(element)
  }

  const action = cn(
    "relative grid size-7 place-items-center rounded-full text-ink-muted transition-colors hover:bg-accent pointer-coarse:size-10",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
  )

  return (
    <section className="space-y-3">
      <p id="sortable-hint" className="sr-only">
        拖动把手调整顺序，或者按上下方向键
      </p>
      <div className="space-y-1.5">
        {sites.folders.map((folder) => {
          const open = expanded.has(folder.id)
          const labelId = `${idBase}-${folder.id}`
          return (
            <div key={folder.id} className="rounded-xl border border-hairline bg-glass">
              {/*
                The row toggles the folder, and its buttons sit beside the toggle
                rather than inside it: a <summary> full of buttons announced as
                one button, and Space in the rename field folded the folder.
              */}
              <div className="relative flex min-h-10 items-center gap-1.5 pl-3 pr-1.5 text-[12.5px] text-ink pointer-coarse:min-h-12">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-labelledby={labelId}
                  onClick={(event) => toggle(folder.id, event.currentTarget.parentElement?.parentElement ?? null)}
                  className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                {renaming === folder.id ? (
                  <input
                    autoFocus
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        sites.renameFolder(folder.id, label)
                        setRenaming(null)
                      }
                      if (event.key === "Escape") setRenaming(null)
                    }}
                    onBlur={() => {
                      sites.renameFolder(folder.id, label)
                      setRenaming(null)
                    }}
                    aria-label="文件夹名称"
                    className="relative h-7 w-32 rounded-md border border-hairline-strong bg-popover px-1.5 text-[12.5px] text-ink outline-none"
                  />
                ) : (
                  <span id={labelId} className="pointer-events-none flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate font-medium">{folder.label}</span>
                    <span className="text-[11px] tabular-nums text-ink-muted">{folder.sites.length}</span>
                  </span>
                )}

                <span className="relative ml-auto flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`向 ${folder.label} 添加站点`}
                    onClick={() => onAddSite(folder.id)}
                    className={cn(action, "hover:text-ink")}
                  >
                    <Plus size={13} aria-hidden="true" />
                  </button>
                  {folder.custom ? (
                    <>
                      <button
                        type="button"
                        aria-label={`重命名 ${folder.label}`}
                        onClick={() => {
                          setLabel(folder.label)
                          setRenaming(folder.id)
                        }}
                        className={cn(action, "hover:text-ink")}
                      >
                        <Pen size={12} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`删除文件夹 ${folder.label}`}
                        onClick={() => sites.removeFolder(folder.id)}
                        className={cn(action, "hover:text-destructive")}
                      >
                        <Trash size={12} aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                </span>
                <ChevronDown
                  size={12}
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none mr-1 shrink-0 text-ink-muted transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </div>

              <Collapse open={open}>
                <SortableSites
                  sites={folder.sites}
                  customOrder={sites.hasOrder(folder.id)}
                  onReorder={(ids) => sites.reorderFolder(folder.id, ids)}
                  onResetOrder={() => sites.resetOrder(folder.id)}
                  onEdit={(site) => onEditSite(site, folder.id)}
                  onRemove={sites.removeSite}
                />
              </Collapse>
            </div>
          )
        })}
      </div>

      {creating ? (
        <div className="flex min-h-9 items-center gap-1.5 rounded-xl border border-hairline-strong bg-glass px-2 py-1.5 pointer-coarse:min-h-11">
          <input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sites.addFolder(label)
                setLabel("")
                setCreating(false)
              }
              if (event.key === "Escape") {
                setLabel("")
                setCreating(false)
              }
            }}
            placeholder="文件夹名称"
            aria-label="新文件夹名称"
            className="h-6 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            aria-label="创建文件夹"
            onClick={() => {
              sites.addFolder(label)
              setLabel("")
              setCreating(false)
            }}
            className={cn(action, "hover:text-ink")}
          >
            <Check size={13} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" className="flex-1 pointer-coarse:h-10" onClick={() => setCreating(true)}>
            <Plus size={14} aria-hidden="true" />
            新建文件夹
          </Button>
          {sites.isCustomized ? (
            <Button variant="ghost" size="sm" className="text-ink-muted pointer-coarse:h-10" onClick={sites.resetSites}>
              恢复默认
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}

export function SettingsPanel({
  open,
  onOpenChange,
  wallpaper,
  appearance,
  sites,
  onEditSite,
  onAddSite,
  themeMode,
  onThemeMode,
  quoteVisible,
  onQuoteVisible,
  searchWidth,
  onSearchWidth,
  clock,
  material,
  onMaterial,
  minimal,
  onMinimal,
}: SettingsPanelProps) {
  /*
    Opening this from the context menu used to flash and close: the menu's
    teardown hands focus back to the page a frame later, and the panel reads
    that as "focus left me". Anything in the first half second is that echo,
    not the user.
  */
  const openedAt = useRef(0)
  useEffect(() => {
    if (open) openedAt.current = performance.now()
  }, [open])

  // The header rule only appears once something has scrolled under it.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!open) setScrolled(false)
  }, [open])

  /*
    On a phone the panel is a bottom sheet, and a sheet is closed by pulling it
    down. The header is the grip; the list below keeps its own scrolling.
  */
  const contentRef = useRef<HTMLDivElement>(null)
  const pull = useRef<{ pointer: number; startY: number; startAt: number; distance: number } | null>(null)

  function startPull(event: ReactPointerEvent<HTMLDivElement>) {
    if (!window.matchMedia("(max-width: 39.999rem)").matches) return
    if ((event.target as Element).closest("button")) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pull.current = { pointer: event.pointerId, startY: event.clientY, startAt: performance.now(), distance: 0 }
  }

  function movePull(event: ReactPointerEvent<HTMLDivElement>) {
    const state = pull.current
    const panel = contentRef.current
    if (!state || state.pointer !== event.pointerId || !panel) return
    state.distance = Math.max(0, event.clientY - state.startY)
    panel.style.transition = "none"
    panel.style.translate = `0 ${state.distance}px`
  }

  function endPull(cancelled: boolean) {
    const state = pull.current
    const panel = contentRef.current
    pull.current = null
    if (!state || !panel) return
    const speed = state.distance / Math.max(1, performance.now() - state.startAt)
    if (!cancelled && (state.distance > 96 || (state.distance > 24 && speed > 0.6))) {
      // Leave the offset in place: the exit animation carries on from here.
      onOpenChange(false)
      return
    }
    panel.style.transition = "translate 240ms var(--ease-spring)"
    panel.style.translate = ""
  }

  return (
    /*
      Non-modal on purpose: the panel's job is to change what is behind it, so
      the page must stay visible and scrollable. Modal would also lock body
      scroll, and losing the scrollbar shifts the whole layout by its width.
    */
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        ref={contentRef}
        withOverlay={false}
        side="float"
        className="flex flex-col"
        onInteractOutside={(event) => {
          if (performance.now() - openedAt.current < 500) {
            event.preventDefault()
            return
          }
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-slot="dialog-content"]')) event.preventDefault()
        }}
      >
        <SheetHeader
          data-scrolled={scrolled ? "true" : undefined}
          onPointerDown={startPull}
          onPointerMove={movePull}
          onPointerUp={() => endPull(false)}
          onPointerCancel={() => endPull(true)}
          className="relative border-transparent transition-colors duration-150 data-[scrolled=true]:border-hairline max-sm:touch-none max-sm:pt-5"
        >
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-[color-mix(in_oklab,var(--ink)_22%,transparent)] sm:hidden"
          />
          <div>
            <SheetTitle>外观与站点</SheetTitle>
            <p className="mt-0.5 text-[11px] text-ink-muted">改动即时生效，保存在这台设备上</p>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="关闭设置"
              className="pointer-coarse:-mr-1.5 pointer-coarse:size-11"
            >
              <X size={15} aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div
          data-settings-scroll
          onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-1"
        >
          <SettingsGroup title="外观" summary="主题 · 材质 · 简洁模式" defaultOpen>
            <div className="space-y-4">
              <SwitchRow title="简洁模式" hint="只留导航，所有文件夹一屏铺开" checked={minimal} onChange={onMinimal} />

              <ThemeGallery mode={themeMode} onChange={onThemeMode} />

              <div className="space-y-1.5">
                <FieldLabel>材质</FieldLabel>
                <MaterialGallery value={material} onChange={onMaterial} />
              </div>

              <div className="space-y-1">
                <FieldLabel hint={`${searchWidth}px`}>搜索框宽度</FieldLabel>
                <Slider
                  aria-label="搜索框宽度"
                  min={420}
                  max={900}
                  step={20}
                  value={[searchWidth]}
                  onValueChange={([width]) => onSearchWidth(width)}
                />
              </div>

              <SwitchRow title="显示一言" checked={quoteVisible} onChange={onQuoteVisible} />
            </div>
          </SettingsGroup>

          <SettingsGroup title="时间" summary="字形 · 字号 · 秒">
            <ClockSection clock={clock} />
          </SettingsGroup>

          <SettingsGroup title="壁纸" summary="来源 · 遮罩">
            <WallpaperSection wallpaper={wallpaper} appearance={appearance} />
          </SettingsGroup>

          <SettingsGroup title="站点" summary="文件夹 · 排序">
            <SitesSection sites={sites} onEditSite={onEditSite} onAddSite={onAddSite} />
          </SettingsGroup>
        </div>
      </SheetContent>
    </Sheet>
  )
}
