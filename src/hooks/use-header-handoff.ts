import { useEffect, useState, type RefObject } from "react"

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** How far ahead of the first hero content the plate starts to fade in, in px. */
const FLOAT_LEAD = 24

/**
 * Drives the nav bar from the scroll position instead of two on/off switches.
 *
 *   --float    0 to 1 over the last 24px before hero content reaches the bar's
 *              bottom edge: the glass plate is fully in before anything can
 *              slide under it, and fully out again at the top of the page.
 *   --handoff  0 to 1 while the hero search slides under the bar: the hero
 *              field fades out over the same pixels the compact one fades in.
 *
 * Both are pure functions of the scroll offset, so there is no threshold to
 * flicker around: scrolling back and forth near it simply scrubs the blend.
 * They are written straight onto the elements every frame; React only hears
 * about the one moment the compact field takes over the keyboard.
 */
export function useHeaderHandoff({
  header,
  hero,
  search,
}: {
  header: RefObject<HTMLElement | null>
  /** The hero section: its first child is the first thing that can go under the bar. */
  hero: RefObject<HTMLElement | null>
  search: RefObject<HTMLElement | null>
}) {
  const [handedOff, setHandedOff] = useState(false)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const bar = header.current
      const field = search.current
      if (!bar || !field) return

      // The nav floats over the page, so "covered" is measured against its own
      // bottom edge, not the viewport's top.
      const edge = bar.getBoundingClientRect().bottom
      const first = hero.current?.firstElementChild ?? field
      const float = clamp01((edge - first.getBoundingClientRect().top + FLOAT_LEAD) / FLOAT_LEAD)
      const box = field.getBoundingClientRect()
      const handoff = clamp01((edge - box.top) / box.height)

      bar.style.setProperty("--float", float.toFixed(3))
      bar.style.setProperty("--handoff", handoff.toFixed(3))
      field.style.setProperty("--handoff", handoff.toFixed(3))
      bar.dataset.float = float > 0 ? "true" : "false"
      bar.dataset.handoff = handoff > 0 ? "true" : "false"
      setHandedOff(handoff > 0.5)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    // The clock and the quote collapse in and out above the field, which moves
    // it without any scroll event.
    const observer = new ResizeObserver(schedule)
    if (hero.current) observer.observe(hero.current)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [header, hero, search])

  return handedOff
}
