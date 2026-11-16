import { useSyncExternalStore } from "react"

import { getDraggingId, subscribeDrag } from "@/lib/drag"

/** The site currently being dragged anywhere on the page, or null. */
export function useDraggingSiteId() {
  return useSyncExternalStore(subscribeDrag, getDraggingId, () => null)
}
