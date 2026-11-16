import { useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { ExternalDrive, Widget, Pen, Plus, Settings, Trash } from "reicon-react"

import { CornerControls } from "@/components/CornerControls"
import { FolderTabs } from "@/components/FolderTabs"
import { PinPicker } from "@/components/PinPicker"
import { PinnedBar } from "@/components/PinnedBar"
import { Hitokoto } from "@/components/Hitokoto"
import { MinimalView } from "@/components/MinimalView"
import { RecentSites } from "@/components/RecentSites"
import { SearchBar } from "@/components/SearchBar"
import { SettingsPanel } from "@/components/SettingsPanel"
import { SiteDialog, draftForNew, draftFromSite, type SiteDraft } from "@/components/SiteDialog"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteGrid } from "@/components/SiteGrid"
import { TopBar } from "@/components/TopBar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Wallpaper } from "@/components/Wallpaper"
import type { Site } from "@/data/sites"
import { useAppearance } from "@/hooks/use-appearance"
import { useSites } from "@/hooks/use-sites"
import { useTheme } from "@/hooks/use-theme"
import { Clock } from "@/components/Clock"
import { defaultMaterialId, materialIds, type MaterialId } from "@/data/materials"
import { Collapse } from "@/components/Collapse"
import { useBoolPref } from "@/hooks/use-bool-pref"
import { useClockPrefs } from "@/hooks/use-clock-prefs"
import { useEnumPref } from "@/hooks/use-enum-pref"
import { useNumberPref } from "@/hooks/use-number-pref"
import { useHeaderHandoff } from "@/hooks/use-header-handoff"
import { useSearch } from "@/hooks/use-search"
import { usePins } from "@/hooks/use-pins"
import { useWallpaper } from "@/hooks/use-wallpaper"
import { warmIcons } from "@/lib/icon-cache"
import { clearRecent, pushRecent, readRecent } from "@/lib/recent-store"
import { hostOf } from "@/lib/site-store"

const FOLDER_KEY = "yourtj-nav-folder"
const views = ["full", "minimal"] as const
type View = (typeof views)[number]
const DEFAULT_FOLDER = "official"

function readFolder(): string {
  try {
    return window.localStorage.getItem(FOLDER_KEY) ?? DEFAULT_FOLDER
  } catch {
    return DEFAULT_FOLDER
  }
}

export default function App() {
  const { mode, setMode } = useTheme()
  const wallpaper = useWallpaper()
  const appearance = useAppearance()
  const sites = useSites()
  const search = useSearch()
  const pins = usePins()
  const [quoteVisible, , setQuoteVisible] = useBoolPref("yourtj-nav-quote", true)
  const clock = useClockPrefs()
  const [searchWidth, setSearchWidth] = useNumberPref("yourtj-nav-search-width", 608, 420, 900)
  const [material, setMaterial] = useEnumPref<MaterialId>(
    "yourtj-nav-material",
    materialIds,
    defaultMaterialId,
  )

  // One attribute drives every glass surface in index.css.
  useEffect(() => {
    document.documentElement.dataset.material = material
  }, [material])
  const [view, setView] = useEnumPref<View>("yourtj-nav-view", views, "full")
  const minimal = view === "minimal"
  const [pickerOpen, setPickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const [activeFolder, setActiveFolder] = useState(readFolder)
  const [ctx, setCtx] = useState<{ site: Site; folderId: string } | null>(null)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const headerRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const heroSearchRef = useRef<HTMLDivElement>(null)
  const handedOff = useHeaderHandoff({
    header: headerRef,
    hero: heroRef,
    search: heroSearchRef,
    enabled: !minimal,
  })

  const folders = sites.folders

  // Every logo, fetched and decoded at idle: switching folders paints from memory.
  useEffect(
    () => warmIcons(sites.allSites.flatMap((site) => (site.mark.kind === "logo" ? [site.mark.src] : []))),
    [sites.allSites],
  )
  const folder = folders.find((item) => item.id === activeFolder) ?? folders[0]

  useEffect(() => {
    try {
      window.localStorage.setItem(FOLDER_KEY, activeFolder)
    } catch {
      // Private mode: the choice holds for this session.
    }
  }, [activeFolder])

  // A folder can disappear from under us (deleted in the panel).
  useEffect(() => {
    if (folder && folder.id !== activeFolder) setActiveFolder(folder.id)
  }, [folder, activeFolder])

  // Pins are ids; a site that is gone (deleted or reset) loses its pin.
  const pinnedSites = pins.ids
    .map((id) => sites.allSites.find((site) => site.id === id))
    .filter((site): site is Site => Boolean(site))

  const recentSites = recent
    .map((id) => folders.flatMap((item) => item.sites).find((site) => site.id === id))
    .filter((site): site is Site => Boolean(site))
    // One row on a desktop; the list itself remembers more.
    .slice(0, 4)

  function editSite(site: Site, folderId: string) {
    setDraft(draftFromSite(site, folderId, sites.iconOf(site.id)))
  }

  function addSite(folderId: string) {
    setDraft(draftForNew(folderId))
  }

  /** Keyboard-accessible counterpart of dragging a tile. */
  function nudge(siteId: string, folderId: string, delta: number) {
    const target = folders.find((item) => item.id === folderId)
    if (!target) return
    const ids = target.sites.map((item) => item.id)
    const from = ids.indexOf(siteId)
    const to = from + delta
    if (from === -1 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    sites.reorderFolder(target.id, ids)
  }

  /** The site under a right-click and the folder it lives in, from any view. */
  function locate(id: string | null) {
    if (!id) return null
    for (const item of folders) {
      const site = item.sites.find((entry) => entry.id === id)
      if (site) return { site, folderId: item.id }
    }
    return null
  }

  /*
    The two views share the bar and nothing below it, so the swap is a page
    change: the View Transitions API cross-fades it where the browser has it,
    and it is instant everywhere else and under reduced motion.
  */
  function changeView(next: View) {
    const swap = () => {
      setView(next)
      window.scrollTo({ top: 0 })
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!document.startViewTransition || still) return swap()
    document.startViewTransition(() => flushSync(swap))
  }

  const visit = (id: string) => setRecent(pushRecent(id))

  // Everything the search list can offer besides past searches, shared by both fields.
  const suggestSource = useMemo(
    () => ({ sites: sites.allSites, localIds: sites.localIds, recent }),
    [sites.allSites, sites.localIds, recent],
  )

  return (
    <TooltipProvider>
      <Wallpaper layers={wallpaper.layers} onReady={wallpaper.markReady} onFail={wallpaper.fail} />
      <div className="page-scrim" aria-hidden="true" />
      <div className="page-overlay" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="relative z-10 flex min-h-dvh flex-col" data-view={view}>
        <TopBar
          headerRef={headerRef}
          handedOff={handedOff}
          search={search}
          source={suggestSource}
          onVisit={visit}
        />

        <main className="page-frame flex-1 pb-4">
          <h1 className="sr-only">YourTJ 校园导航</h1>

          {minimal ? null : (
            <section ref={heroRef} className="pb-7 pt-[clamp(1.25rem,6vh,4rem)] sm:pb-11">
              <Collapse open={clock.prefs.visible}>
                <div className="mb-5">
                  <Clock prefs={clock.prefs} />
                </div>
              </Collapse>
              {/* Above the pins and the grid: the suggestion list drops over them. */}
              <div ref={heroSearchRef} className="hero-search relative z-30">
                <SearchBar
                  search={search}
                  shortcuts={!handedOff}
                  width={searchWidth}
                  source={suggestSource}
                  onVisit={visit}
                />
              </div>
              <PinnedBar
                pins={pinnedSites}
                onVisit={visit}
                onRemove={pins.remove}
                onMove={pins.move}
                onPin={pins.add}
                onOpenPicker={() => setPickerOpen(true)}
              />
              <Collapse open={quoteVisible}>
                <div className="mt-4 sm:mt-5">
                  <Hitokoto />
                </div>
              </Collapse>
            </section>
          )}

          {/*
            One menu for the whole folder area, built from what was right-clicked.
            Nesting a menu per tile would open both; and scoping it here keeps the
            browser's own menu on the search field, where paste still matters.
          */}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                onContextMenuCapture={(event) => {
                  const tile = (event.target as HTMLElement).closest("[data-site-id]")
                  setCtx(locate(tile?.getAttribute("data-site-id") ?? null))
                }}
              >
                {minimal ? (
                  <MinimalView folders={folders} pins={pinnedSites} onVisit={visit} />
                ) : (
                  <>
                    <FolderTabs
                      folders={folders}
                      active={folder?.id ?? ""}
                      onChange={setActiveFolder}
                      onCreate={(label) => {
                        const id = sites.addFolder(label)
                        setActiveFolder(id)
                      }}
                    />

                    <div className="mt-4">
                      {folder ? (
                        <SiteGrid
                          folder={folder}
                          onReorder={(ids) => sites.reorderFolder(folder.id, ids)}
                          onAdd={() => addSite(folder.id)}
                          onVisit={visit}
                        />
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent>
              {ctx ? (
                <>
                  <ContextMenuLabel>{ctx.site.title}</ContextMenuLabel>
                  <ContextMenuItem asChild>
                    <a href={ctx.site.url} target="_blank" rel="noopener noreferrer">
                      <ExternalDrive size={14} aria-hidden="true" />
                      打开
                    </a>
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => editSite(ctx.site, ctx.folderId)}>
                    <Pen size={14} aria-hidden="true" />
                    编辑
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => nudge(ctx.site.id, ctx.folderId, -1)}>
                    前移一位
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => nudge(ctx.site.id, ctx.folderId, 1)}>
                    后移一位
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => sites.removeSite(ctx.site.id)}>
                    <Trash size={14} aria-hidden="true" />
                    删除
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              ) : null}
              <ContextMenuItem onSelect={() => addSite(ctx?.folderId ?? folder?.id ?? DEFAULT_FOLDER)}>
                <Plus size={14} aria-hidden="true" />
                添加站点
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => changeView(minimal ? "full" : "minimal")}>
                <Widget size={14} aria-hidden="true" />
                {minimal ? "退出简洁模式" : "简洁模式"}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings size={14} aria-hidden="true" />
                外观与站点
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {minimal ? null : (
            <RecentSites
              sites={recentSites}
              onClear={() => {
                clearRecent()
                setRecent([])
              }}
            />
          )}
        </main>

        {minimal ? null : <SiteFooter />}
      </div>

      <CornerControls wallpaper={wallpaper} onOpenSettings={() => setSettingsOpen(true)} />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        wallpaper={wallpaper}
        appearance={appearance}
        sites={sites}
        themeMode={mode}
        onThemeMode={setMode}
        quoteVisible={quoteVisible}
        onQuoteVisible={setQuoteVisible}
        searchWidth={searchWidth}
        onSearchWidth={setSearchWidth}
        clock={clock}
        material={material}
        onMaterial={setMaterial}
        minimal={minimal}
        onMinimal={(on) => changeView(on ? "minimal" : "full")}
        onEditSite={editSite}
        onAddSite={addSite}
      />

      <PinPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        folders={folders}
        pinned={pins.ids}
        onToggle={pins.toggle}
      />

      <SiteDialog
        draft={draft}
        folders={folders}
        onClose={() => setDraft(null)}
        onSubmit={(value) => {
          if (value.id) {
            sites.editSite(value.id, {
              title: value.title,
              url: value.url,
              description: hostOf(value.url),
              icon: value.icon,
              plate: value.plate,
              plateColor: value.plateColor,
              shape: value.shape,
            })
            // The form's folder is where the site was opened from; a new pick moves it,
            // and the view follows so the result is visible, as it does after adding.
            if (draft && value.folder !== draft.folder) {
              sites.moveSite(value.id, value.folder)
              setActiveFolder(value.folder)
            }
          } else {
            sites.addSite({
              title: value.title,
              url: value.url,
              description: hostOf(value.url),
              folder: value.folder,
              ...(value.icon
                ? { icon: value.icon, plate: value.plate, plateColor: value.plateColor, shape: value.shape }
                : {}),
            })
            setActiveFolder(value.folder)
          }
          setDraft(null)
        }}
      />
    </TooltipProvider>
  )
}
