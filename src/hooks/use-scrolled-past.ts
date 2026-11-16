import { useEffect, useState, type RefObject } from "react"

/**
 * True once the element has gone behind the sticky nav bar.
 *
 * The trigger is the nav's own bottom edge, not the viewport's top: the nav
 * floats over the page, so a field can be completely hidden behind it while
 * still counting as "on screen". Waiting for the viewport edge left a ~100px
 * band where the search was already invisible but its replacement had not
 * appeared yet.
 */
export function useScrolledPast(ref: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    const measure = () => {
      frame = 0
      const header = document.querySelector<HTMLElement>("header")
      const covered = header ? header.getBoundingClientRect().bottom : 0
      setPast(element.getBoundingClientRect().bottom <= covered)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [ref])

  return past
}
