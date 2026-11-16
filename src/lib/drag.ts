/**
 * One drag channel for every place a site can be picked up. The custom MIME
 * type is what tells a drop target "this is a site", without needing a shared
 * React parent — `text/plain` is also set so a drop on the browser's own UI
 * still does something sensible.
 */
export const SITE_MIME = "application/x/tj-site"

let activeId: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function beginSiteDrag(id: string) {
  activeId = id
  emit()
}

export function endSiteDrag() {
  if (activeId === null) return
  activeId = null
  emit()
}

export function getDraggingId() {
  return activeId
}

export function subscribeDrag(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function writeDragData(event: React.DragEvent, id: string) {
  event.dataTransfer.setData(SITE_MIME, id)
  event.dataTransfer.setData("text/plain", id)
  event.dataTransfer.effectAllowed = "copyMove"
}

/** `getData` is empty during dragover; only `types` is readable there. */
export function isSiteDrag(event: React.DragEvent | DragEvent) {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes(SITE_MIME)
}

/** On drop the payload is readable again; the store is the fallback. */
export function readDraggedId(event: React.DragEvent | DragEvent) {
  const fromData = event.dataTransfer?.getData(SITE_MIME)
  return fromData || activeId
}
