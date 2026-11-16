import { useCallback, useMemo, useState } from "react"

import { sections as shippedSections, type Site, type SiteMark } from "@/data/sites"
import { resolveLook } from "@/lib/icon-look"
import {
  EMPTY_SITE_STORE,
  newId,
  readSiteStore,
  writeSiteStore,
  type AddedSite,
  type SitePatch,
  type SiteStoreData,
} from "@/lib/site-store"

export type Folder = {
  id: string
  label: string
  /** True for folders the user created. */
  custom: boolean
  sites: Site[]
}

/** Each shipped site's own mark, for the dialog's "内置" choice. */
const shippedMarks = new Map(
  shippedSections.flatMap((section) => section.sites.map((site) => [site.id, site.mark])),
)

/** Where each shipped site lives before the user moves it. */
const shippedHome = new Map(
  shippedSections.flatMap((section) => section.sites.map((site) => [site.id, section.id as string])),
)

/** A chosen icon, with the plate its shape and the user's choices call for. */
function logoMark(entry: { icon: string } & Pick<AddedSite, "plate" | "plateColor" | "shape">): SiteMark {
  return { kind: "logo", src: entry.icon, ...resolveLook(entry) }
}

function toSite(entry: AddedSite): Site {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    url: entry.url,
    mark: entry.icon
      ? logoMark({ ...entry, icon: entry.icon })
      : { kind: "letter", text: entry.title.trim().slice(0, 1).toUpperCase() || "?" },
  }
}

/**
 * Shipped sites live in code (they carry real logos); the store only holds what
 * the user changed, so a shipped icon update still reaches everyone.
 */
export function useSites() {
  const [store, setStore] = useState<SiteStoreData>(readSiteStore)

  const update = useCallback((next: (current: SiteStoreData) => SiteStoreData) => {
    setStore((current) => {
      const value = next(current)
      writeSiteStore(value)
      return value
    })
  }, [])

  const folders: Folder[] = useMemo(() => {
    const shipped = shippedSections.map((section) => ({
      id: section.id as string,
      label: section.label,
      custom: false,
      base: section.sites,
    }))
    const custom = store.folders.map((folder) => ({
      id: folder.id,
      label: folder.label,
      custom: true,
      base: [] as Site[],
    }))

    const everyFolder = [...shipped, ...custom]
    const exists = new Set(everyFolder.map((folder) => folder.id))
    // A move into a folder that has since been deleted sends the site home.
    const filedUnder = (site: Site, home: string) => {
      const target = store.moved[site.id]
      return target && exists.has(target) ? target : home
    }
    const patched = (site: Site): Site => {
      const patch = store.overrides[site.id]
      if (!patch) return site
      const { icon, plate, plateColor, shape, ...text } = patch
      return {
        ...site,
        ...text,
        // Until an icon is picked, the shipped one (with its hand-set plate) stays.
        mark: icon ? logoMark({ icon, plate, plateColor, shape }) : site.mark,
      }
    }
    const visibleShipped = shipped.flatMap((folder) =>
      folder.base
        .filter((site) => !store.hidden.includes(site.id))
        .map((site) => ({ site: patched(site), folder: filedUnder(site, folder.id), home: folder.id })),
    )

    return everyFolder.map((folder) => {
      const kept = visibleShipped
        .filter((entry) => entry.folder === folder.id && entry.home === folder.id)
        .map((entry) => entry.site)
      // Moved-in sites lead, like added ones: the one you just filed is visible without paging.
      const movedIn = visibleShipped
        .filter((entry) => entry.folder === folder.id && entry.home !== folder.id)
        .map((entry) => entry.site)
        .reverse()
      // Newest first, so a site you just added is visible without paging.
      const added = store.added
        .filter((entry) => entry.folder === folder.id)
        .map(toSite)
        .reverse()
      const all = [...added, ...movedIn, ...kept]

      const order = store.order[folder.id]
      const sites = order
        ? [...all].sort((a, b) => {
            const ai = order.indexOf(a.id)
            const bi = order.indexOf(b.id)
            if (ai === -1 && bi === -1) return 0
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
          })
        : all

      return { id: folder.id, label: folder.label, custom: folder.custom, sites }
    })
  }, [store])

  /** Flat, de-duplicated list: what the pin picker searches over. */
  /** Sites the user added on this device, as opposed to the shipped list. */
  const localIds = useMemo(() => new Set(store.added.map((entry) => entry.id)), [store.added])

  const allSites = useMemo(() => {
    const seen = new Set<string>()
    const list: Site[] = []
    for (const folder of folders) {
      for (const site of folder.sites) {
        if (seen.has(site.id)) continue
        seen.add(site.id)
        list.push(site)
      }
    }
    return list
  }, [folders])

  const addSite = useCallback(
    (input: Omit<AddedSite, "id">) => {
      const id = newId("s")
      update((current) => {
        // A folder with a manual order needs the new id placed explicitly,
        // otherwise the sort would push it to the end of the list.
        const existing = current.order[input.folder]
        return {
          ...current,
          added: [...current.added, { ...input, id }],
          order: existing
            ? { ...current.order, [input.folder]: [id, ...existing] }
            : current.order,
        }
      })
    },
    [update],
  )

  /** The icon fields behind a site, as the edit dialog starts from them. */
  const iconOf = useCallback(
    (id: string) => {
      const added = store.added.find((entry) => entry.id === id)
      const fields = added ?? store.overrides[id] ?? {}
      return {
        icon: fields.icon ?? "",
        plate: fields.plate,
        plateColor: fields.plateColor,
        shape: fields.shape,
        base: added ? null : (shippedMarks.get(id) ?? null),
      }
    },
    [store],
  )

  const editSite = useCallback(
    (id: string, patch: SitePatch) => {
      update((current) => {
        if (current.added.some((entry) => entry.id === id)) {
          return {
            ...current,
            added: current.added.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry,
            ),
          }
        }
        return {
          ...current,
          overrides: { ...current.overrides, [id]: { ...current.overrides[id], ...patch } },
        }
      })
    },
    [update],
  )

  /**
   * Files a site under another folder. Shipped sites keep their entry in code
   * and only remember the new home; the site leaves every manual order and
   * leads the target's, so it shows up once, on the first page.
   */
  const moveSite = useCallback(
    (id: string, folderId: string) => {
      update((current) => {
        const order = Object.fromEntries(
          Object.entries(current.order).map(([key, ids]) => [key, ids.filter((item) => item !== id)]),
        )
        if (order[folderId]) order[folderId] = [id, ...order[folderId]]

        if (current.added.some((entry) => entry.id === id)) {
          return {
            ...current,
            added: current.added.map((entry) =>
              entry.id === id ? { ...entry, folder: folderId } : entry,
            ),
            order,
          }
        }

        const home = shippedHome.get(id)
        if (!home) return current
        const { [id]: _previous, ...moved } = current.moved
        return { ...current, moved: folderId === home ? moved : { ...moved, [id]: folderId }, order }
      })
    },
    [update],
  )

  const removeSite = useCallback(
    (id: string) => {
      update((current) => {
        if (current.added.some((entry) => entry.id === id)) {
          return { ...current, added: current.added.filter((entry) => entry.id !== id) }
        }
        const { [id]: _previous, ...moved } = current.moved
        return { ...current, hidden: [...new Set([...current.hidden, id])], moved }
      })
    },
    [update],
  )

  /** Persists a folder's full order, which is what a drag or a nudge produces. */
  const reorderFolder = useCallback(
    (folderId: string, ids: string[]) => {
      update((current) => ({ ...current, order: { ...current.order, [folderId]: ids } }))
    },
    [update],
  )

  /** Drops a folder's manual order: it goes back to the shipped order, new sites first. */
  const resetOrder = useCallback(
    (folderId: string) => {
      update((current) => {
        const { [folderId]: _dropped, ...order } = current.order
        return { ...current, order }
      })
    },
    [update],
  )

  const hasOrder = useCallback((folderId: string) => Boolean(store.order[folderId]), [store])

  const addFolder = useCallback(
    (label: string) => {
      const folder = { id: newId("f"), label: label.trim() || "新文件夹" }
      update((current) => ({ ...current, folders: [...current.folders, folder] }))
      return folder.id
    },
    [update],
  )

  const renameFolder = useCallback(
    (folderId: string, label: string) => {
      update((current) => ({
        ...current,
        folders: current.folders.map((folder) =>
          folder.id === folderId ? { ...folder, label: label.trim() || folder.label } : folder,
        ),
      }))
    },
    [update],
  )

  const removeFolder = useCallback(
    (folderId: string) => {
      update((current) => {
        const { [folderId]: _dropped, ...order } = current.order
        // Shipped sites filed here go back to where they came from.
        const moved = Object.fromEntries(
          Object.entries(current.moved).filter(([, target]) => target !== folderId),
        )
        return {
          ...current,
          folders: current.folders.filter((folder) => folder.id !== folderId),
          added: current.added.filter((entry) => entry.folder !== folderId),
          moved,
          order,
        }
      })
    },
    [update],
  )

  const resetSites = useCallback(() => {
    writeSiteStore(EMPTY_SITE_STORE)
    setStore(EMPTY_SITE_STORE)
  }, [])

  const isCustomized =
    store.added.length > 0 ||
    store.hidden.length > 0 ||
    Object.keys(store.moved).length > 0 ||
    store.folders.length > 0 ||
    Object.keys(store.overrides).length > 0 ||
    Object.keys(store.order).length > 0

  return {
    folders,
    allSites,
    localIds,
    addSite,
    editSite,
    iconOf,
    moveSite,
    removeSite,
    reorderFolder,
    resetOrder,
    hasOrder,
    addFolder,
    renameFolder,
    removeFolder,
    resetSites,
    isCustomized,
  }
}

export type SitesController = ReturnType<typeof useSites>
