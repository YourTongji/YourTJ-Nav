import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Image, Pen, Plus, Trash, X } from "reicon-react"

import { Mark } from "@/components/Mark"
import { ClockSection } from "@/components/settings/ClockSection"
import { FieldLabel, SettingsGroup } from "@/components/settings/primitives"
import { MaterialGallery } from "@/components/MaterialGallery"
import { ThemeGallery } from "@/components/ThemeGallery"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { Site } from "@/data/sites"
import { wallpaperSources, type WallpaperSourceId } from "@/data/wallpapers"
import type { AppearanceController } from "@/hooks/use-appearance"
import type { ClockController } from "@/hooks/use-clock-prefs"
import type { ThemeMode } from "@/hooks/use-theme"
import type { SitesController } from "@/hooks/use-sites"
import type { WallpaperController } from "@/hooks/use-wallpaper"
import type { MaterialId } from "@/data/materials"
import { hostOf } from "@/lib/site-store"
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
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-ink">壁纸</h3>
        <span className="text-[11px] text-ink-muted">
          {wallpaperSources.find((source) => source.id === wallpaper.source)?.hint}
        </span>
      </div>

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
                "h-8 rounded-full text-[12.5px] font-medium transition-colors duration-150",
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
                    className="absolute right-1 top-1 grid size-[18px] place-items-center rounded-full bg-[rgba(17,24,39,0.76)] text-white opacity-0 transition-opacity duration-150 hover:bg-[rgba(17,24,39,0.9)] focus-visible:opacity-100 group-hover:opacity-100"
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
          <p className="mt-2 text-[11px] text-ink-muted">
            {wallpaper.customs.length
              ? `${wallpaper.customs.length} 张 · 点选切换，悬停右上角删除`
              : "还没有自定义图片，点上面的 + 添加"}
          </p>
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

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-ink">站点与文件夹</h3>
        {sites.isCustomized ? (
          <button
            type="button"
            onClick={sites.resetSites}
            className="rounded-full px-2 py-0.5 text-[11.5px] text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            恢复默认
          </button>
        ) : (
          <span className="text-[11px] text-ink-muted">
            {sites.folders.reduce((total, folder) => total + folder.sites.length, 0)} 个
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {sites.folders.map((folder) => (
          <details key={folder.id} className="group rounded-xl border border-hairline bg-glass">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[12.5px] text-ink">
              {renaming === folder.id ? (
                <input
                  autoFocus
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  onClick={(event) => event.preventDefault()}
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
                  className="h-6 w-28 rounded-md border border-hairline-strong bg-popover px-1.5 text-[12.5px] text-ink outline-none"
                />
              ) : (
                <span className="font-medium">{folder.label}</span>
              )}
              <span className="text-[11px] tabular-nums text-ink-muted">
                {folder.sites.length}
              </span>

              <span className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={`向 ${folder.label} 添加站点`}
                  onClick={(event) => {
                    event.preventDefault()
                    onAddSite(folder.id)
                  }}
                  className="grid size-6 place-items-center rounded-full text-ink-muted hover:bg-accent hover:text-ink"
                >
                  <Plus size={13} aria-hidden="true" />
                </button>
                {folder.custom ? (
                  <>
                    <button
                      type="button"
                      aria-label={`重命名 ${folder.label}`}
                      onClick={(event) => {
                        event.preventDefault()
                        setLabel(folder.label)
                        setRenaming(folder.id)
                      }}
                      className="grid size-6 place-items-center rounded-full text-ink-muted hover:bg-accent hover:text-ink"
                    >
                      <Pen size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`删除文件夹 ${folder.label}`}
                      onClick={(event) => {
                        event.preventDefault()
                        sites.removeFolder(folder.id)
                      }}
                      className="grid size-6 place-items-center rounded-full text-ink-muted hover:bg-accent hover:text-destructive"
                    >
                      <Trash size={12} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                <ChevronDown
                  size={12}
                  aria-hidden="true"
                  className="ml-1 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                />
              </span>
            </summary>

            <ul className="space-y-0.5 px-1.5 pb-1.5">
              {folder.sites.length === 0 ? (
                <li className="px-2 py-2 text-[11.5px] text-ink-muted">空文件夹</li>
              ) : null}
              {folder.sites.map((site) => (
                <li
                  key={site.id}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-popover">
                    <Mark mark={site.mark} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-ink">{site.title}</span>
                    <span className="block truncate text-[10.5px] text-ink-muted">
                      {hostOf(site.url)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`编辑 ${site.title}`}
                    onClick={() => onEditSite(site, folder.id)}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Pen size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${site.title}`}
                    onClick={() => sites.removeSite(site.id)}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Trash size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {creating ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-hairline-strong bg-glass px-2 py-1.5">
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
            className="grid size-6 place-items-center rounded-full text-ink-muted hover:text-ink"
          >
            <Check size={13} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Button variant="glass" size="sm" className="w-full" onClick={() => setCreating(true)}>
          <Plus size={14} aria-hidden="true" />
          新建文件夹
        </Button>
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

  return (
    /*
      Non-modal on purpose: the panel's job is to change what is behind it, so
      the page must stay visible and scrollable. Modal would also lock body
      scroll, and losing the scrollbar shifts the whole layout by its width.
    */
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
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
        <SheetHeader>
          <div>
            <SheetTitle>外观与站点</SheetTitle>
            <p className="mt-0.5 text-[11px] text-ink-muted">改动即时生效，保存在这台设备上</p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="关闭设置">
              <X size={15} aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-1">
          <SettingsGroup title="外观" summary="主题 · 材质 · 简洁模式" defaultOpen>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12.5px] font-medium text-ink">简洁模式</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">只留导航，所有文件夹一屏铺开</p>
                </div>
                <Switch checked={minimal} onChange={onMinimal} label="简洁模式" />
              </div>

              <ThemeGallery mode={themeMode} onChange={onThemeMode} />

              <div className="space-y-1.5">
                <FieldLabel>材质</FieldLabel>
                <MaterialGallery value={material} onChange={onMaterial} />
              </div>

              <div className="space-y-1 border-t border-hairline pt-3">
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

              <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
                <p className="text-[12.5px] text-ink">显示一言</p>
                <Switch checked={quoteVisible} onChange={onQuoteVisible} label="显示一言" />
              </div>
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
