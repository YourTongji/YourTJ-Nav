import { useCallback, useMemo, useState } from "react"

import { sections as shippedSections, type Site } from "@/data/sites"
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

function toSite(entry: AddedSite): Site {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    url: entry.url,
    mark: entry.icon
      ? { kind: "logo", src: entry.icon, chip: "light" }
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

    return [...shipped, ...custom].map((folder) => {
      const kept = folder.base
        .filter((site) => !store.hidden.includes(site.id))
        .map((site) => {
          const patch = store.overrides[site.id]
          return patch ? { ...site, ...patch } : site
        })
      // Newest first, so a site you just added is visible without paging.
      const added = store.added
        .filter((entry) => entry.folder === folder.id)
        .map(toSite)
        .reverse()
      const all = [...added, ...kept]

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
    (input: { title: string; description: string; url: string; icon?: string; folder: string }) => {
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

  const removeSite = useCallback(
    (id: string) => {
      update((current) => {
        if (current.added.some((entry) => entry.id === id)) {
          return { ...current, added: current.added.filter((entry) => entry.id !== id) }
        }
        return { ...current, hidden: [...new Set([...current.hidden, id])] }
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
        return {
          ...current,
          folders: current.folders.filter((folder) => folder.id !== folderId),
          added: current.added.filter((entry) => entry.folder !== folderId),
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
    store.folders.length > 0 ||
    Object.keys(store.overrides).length > 0 ||
    Object.keys(store.order).length > 0

  return {
    folders,
    allSites,
    addSite,
    editSite,
    removeSite,
    reorderFolder,
    addFolder,
    renameFolder,
    removeFolder,
    resetSites,
    isCustomized,
  }
}

export type SitesController = ReturnType<typeof useSites>
