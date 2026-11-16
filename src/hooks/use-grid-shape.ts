import { useLayoutEffect, useState, type RefObject } from "react"

/**
 * Tile tracks the grid packs to. Columns come from the width the grid actually
 * has, not from device presets: a 414px phone takes five, a 768px tablet seven,
 * and a page is always whole rows, so the last row of a page is never ragged.
 */
const NARROW = { min: 64, gap: 8, rowGap: 14 }
const WIDE = { min: 80, gap: 12, rowGap: 20 }
/** Past eight the row stops reading as one glance, so wide screens get air instead. */
const MAX_COLS = 8
/** Below this grid width the tiles switch to the 52px plate. */
const NARROW_BELOW = 600

export type GridShape = {
  cols: number
  rows: number
  pageSize: number
  narrow: boolean
  gap: number
  rowGap: number
}

export function shapeFor(width: number, viewport: number, maxCols = MAX_COLS): GridShape {
  const narrow = width < NARROW_BELOW
  const track = narrow ? NARROW : WIDE
  const cols = Math.max(3, Math.min(maxCols, Math.floor((width + track.gap) / (track.min + track.gap))))
  // Phones and tablets page by thumb and scroll anyway, so a page runs one row
  // deeper there; a desktop keeps three rows of eight above the fold.
  const rows = viewport < 1024 ? 4 : 3
  return { cols, rows, pageSize: cols * rows, narrow, gap: track.gap, rowGap: track.rowGap }
}

/** The page column's inner width, for the first render before anything is measured. */
function estimateWidth() {
  if (typeof window === "undefined") return 1116
  const viewport = window.innerWidth
  const gutter = viewport >= 640 ? 32 : 20
  return Math.min(viewport, 1180) - gutter * 2
}

export function useGridShape(ref: RefObject<HTMLElement | null>, maxCols = MAX_COLS) {
  const [shape, setShape] = useState(() =>
    shapeFor(estimateWidth(), typeof window === "undefined" ? 1440 : window.innerWidth, maxCols),
  )

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const next = shapeFor(element.clientWidth, window.innerWidth, maxCols)
      setShape((previous) =>
        previous.cols === next.cols && previous.rows === next.rows && previous.narrow === next.narrow
          ? previous
          : next,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, maxCols])

  return shape
}
