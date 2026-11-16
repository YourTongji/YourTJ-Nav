import { useEffect, useRef, useState } from "react"
import { ExternalDrive, Pen, Plus, Settings, Trash } from "reicon-react"

import { CornerControls } from "@/components/CornerControls"
import { FolderTabs } from "@/components/FolderTabs"
import { PinPicker } from "@/components/PinPicker"
import { PinnedBar } from "@/components/PinnedBar"
import { Hitokoto } from "@/components/Hitokoto"
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
import { clearRecent, pushRecent, readRecent } from "@/lib/recent-store"
import { hostOf } from "@/lib/site-store"

const FOLDER_KEY = "yourtj-nav-folder"
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const [activeFolder, setActiveFolder] = useState(readFolder)
  const [ctxSite, setCtxSite] = useState<Site | null>(null)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const headerRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const heroSearchRef = useRef<HTMLDivElement>(null)
  const handedOff = useHeaderHandoff({ header: headerRef, hero: heroRef, search: heroSearchRef })

  const folders = sites.folders
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
    setDraft(draftFromSite(site, folderId))
  }

  function addSite(folderId: string) {
    setDraft(draftForNew(folderId))
  }

  /** Keyboard-accessible counterpart of dragging a tile. */
  function nudge(siteId: string, delta: number) {
    if (!folder) return
    const ids = folder.sites.map((item) => item.id)
    const from = ids.indexOf(siteId)
    const to = from + delta
    if (from === -1 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    sites.reorderFolder(folder.id, ids)
  }

  return (
    <TooltipProvider>
      <Wallpaper layers={wallpaper.layers} onReady={wallpaper.markReady} onFail={wallpaper.fail} />
      <div className="page-scrim" aria-hidden="true" />
      <div className="page-overlay" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <TopBar headerRef={headerRef} handedOff={handedOff} search={search} />

        <main className="page-frame flex-1 pb-4">
          <h1 className="sr-only">YourTJ 校园导航</h1>

          <section ref={heroRef} className="pb-9 pt-[clamp(1.75rem,8vh,4rem)] sm:pb-11">
            <Collapse open={clock.prefs.visible}>
              <div className="mb-5">
                <Clock prefs={clock.prefs} />
              </div>
            </Collapse>
            <div ref={heroSearchRef} className="hero-search">
              <SearchBar search={search} shortcuts={!handedOff} width={searchWidth} />
            </div>
            <PinnedBar
              pins={pinnedSites}
              onVisit={(id) => setRecent(pushRecent(id))}
              onRemove={pins.remove}
              onMove={pins.move}
              onPin={pins.add}
              onOpenPicker={() => setPickerOpen(true)}
            />
            <Collapse open={quoteVisible}>
              <div className="mt-5">
                <Hitokoto />
              </div>
            </Collapse>
          </section>

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
                  const id = tile?.getAttribute("data-site-id") ?? null
                  setCtxSite(id ? (folder?.sites.find((item) => item.id === id) ?? null) : null)
                }}
              >
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
                      key={folder.id}
                      folder={folder}
                      onReorder={(ids) => sites.reorderFolder(folder.id, ids)}
                      onAdd={() => addSite(folder.id)}
                      onVisit={(id) => setRecent(pushRecent(id))}
                    />
                  ) : null}
                </div>
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent>
              {ctxSite && folder ? (
                <>
                  <ContextMenuLabel>{ctxSite.title}</ContextMenuLabel>
                  <ContextMenuItem asChild>
                    <a href={ctxSite.url} target="_blank" rel="noopener noreferrer">
                      <ExternalDrive size={14} aria-hidden="true" />
                      打开
                    </a>
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => editSite(ctxSite, folder.id)}>
                    <Pen size={14} aria-hidden="true" />
                    编辑
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => nudge(ctxSite.id, -1)}>
                    前移一位
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => nudge(ctxSite.id, 1)}>
                    后移一位
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => sites.removeSite(ctxSite.id)}>
                    <Trash size={14} aria-hidden="true" />
                    删除
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              ) : null}
              <ContextMenuItem onSelect={() => folder && addSite(folder.id)}>
                <Plus size={14} aria-hidden="true" />
                添加站点
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings size={14} aria-hidden="true" />
                外观与站点
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <RecentSites
            sites={recentSites}
            onClear={() => {
              clearRecent()
              setRecent([])
            }}
          />
        </main>

        <SiteFooter />
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
              icon: value.icon,
              folder: value.folder,
            })
            setActiveFolder(value.folder)
          }
          setDraft(null)
        }}
      />
    </TooltipProvider>
  )
}
