import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react"
import { EyeClosed } from "reicon-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

/** An animated decoration should hold still when the system asks for calm. */
function usePrefersReducedMotion() {
  const [calm, setCalm] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = (event: MediaQueryListEvent) => setCalm(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return calm
}

type Phase = "rest" | "leaving" | "hatching"

/** The pill swallowing, or pushing something out: a quick squash, then settle. */
function gulp(shell: HTMLElement | null, amount: number, delay: number) {
  return shell?.animate(
    [
      { transform: "scale(1, 1)" },
      { transform: `scale(${1 + amount * 0.3}, ${1 - amount})`, offset: 0.3 },
      { transform: `scale(${1 - amount * 0.1}, ${1 + amount * 0.25})`, offset: 0.62 },
      { transform: "scale(1, 1)" },
    ],
    { duration: 420, delay, easing: "ease-out" },
  )
}

/**
 * Where the egg comes up, as a fraction of the rim the cat can sit on. Random,
 * but never under anything marked `data-cat-avoid` (the clock): the cat stays
 * where it hatched, and it should not sit on the time.
 */
function pickSpot(button: HTMLElement, shell: HTMLElement) {
  const rim = shell.getBoundingClientRect()
  const cat = button.getBoundingClientRect()
  // The same inset and track index.css positions the cat with.
  const inset = Number.parseFloat(getComputedStyle(button).getPropertyValue("--cat-inset")) || 22
  const start = rim.left + inset
  const track = Math.max(0, rim.width - 2 * inset - cat.width)
  // The band the cat occupies above the rim, plus room for a hop.
  const top = rim.top - cat.height - 18
  const blocked = [...document.querySelectorAll<HTMLElement>("[data-cat-avoid]")]
    .filter((element) => !element.closest("[inert]"))
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.bottom > top && box.top < rim.top)

  const free: number[] = []
  for (let step = 0; step <= 40; step += 1) {
    const left = start + (track * step) / 40
    const right = left + cat.width
    if (blocked.every((box) => right + 6 < box.left || left - 6 > box.right)) free.push(step / 40)
  }
  if (!free.length) return 0
  return free[Math.floor(Math.random() * free.length)]
}

/**
 * The cat on the hero search bar. Click to make it hop; right-click, or the
 * switch in settings, to send it away. It leaves by rolling along the rim and
 * sinking into the pill, and comes back by hatching from an egg the pill pushes
 * up somewhere along the rim.
 *
 * Everything moves with the Web Animations API on transform and opacity only,
 * and the egg exists only while it is on screen.
 */
export function SearchCat({
  visible,
  onHide,
  shellRef,
  fieldRef,
}: {
  visible: boolean
  onHide: () => void
  /** The pill: it squashes as it swallows the cat or pushes the egg out. */
  shellRef: RefObject<HTMLElement | null>
  /** Where keyboard focus goes once the cat it was on has gone. */
  fieldRef: RefObject<HTMLInputElement | null>
}) {
  const calm = usePrefersReducedMotion()
  const [present, setPresent] = useState(visible)
  const [phase, setPhase] = useState<Phase>("rest")
  const [spot, setSpot] = useState(0)
  const [hopping, setHopping] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const eggRef = useRef<HTMLSpanElement>(null)
  const settled = useRef(visible)
  const spotRef = useRef(0)
  const hiding = useRef(false)
  const fromKeyboard = useRef(false)

  // Follows the switch, not mounting: a page load shows the cat as it already is.
  useEffect(() => {
    if (settled.current === visible) return
    settled.current = visible
    if (visible) {
      setPresent(true)
      setPhase("hatching")
    } else {
      setPhase("leaving")
    }
  }, [visible])

  useLayoutEffect(() => {
    if (phase === "rest" || !present) return
    const button = buttonRef.current
    const img = imgRef.current
    const shell = shellRef.current
    if (!button || !img) return

    const running: Animation[] = []
    const keep = (animation: Animation | undefined) => {
      if (animation) running.push(animation)
      return animation
    }
    const play = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) =>
      keep(element.animate(frames, { fill: "both", ...options }))!

    let last: Animation

    if (phase === "leaving") {
      // Roll towards the middle of the pill, wherever the cat sits.
      const dir = spotRef.current > 0.5 ? -1 : 1
      const x = (px: number) => `${dir * px}px`
      const turn = (deg: number) => `${dir * deg}deg`
      last = calm
        ? play(img, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out" })
        : play(
            img,
            [
              { transform: "translate(0, 0) rotate(0deg) scale(1)" },
              // Crouch, then tuck into a ball.
              { transform: "translate(0, 2px) rotate(0deg) scale(1.06, 0.9)", offset: 0.14 },
              { transform: `translate(${x(6)}, -7px) rotate(${turn(70)}) scale(0.84)`, offset: 0.3 },
              // Roll along the rim...
              { transform: `translate(${x(40)}, 0) rotate(${turn(250)}) scale(0.8)`, offset: 0.62 },
              {
                transform: `translate(${x(62)}, 2px) rotate(${turn(360)}) scale(0.78)`,
                offset: 0.76,
                easing: "cubic-bezier(0.5, 0, 0.9, 0.4)",
              },
              // ...and sink into the pill, which clips it at the rim.
              { transform: `translate(${x(68)}, 48px) rotate(${turn(410)}) scale(0.66)` },
            ],
            { duration: 820 },
          )
      if (!calm) keep(gulp(shell, 0.045, 640))
      last.finished
        .then(() => {
          setPresent(false)
          setPhase("rest")
          if (fromKeyboard.current) fieldRef.current?.focus({ preventScroll: true })
          fromKeyboard.current = false
        })
        .catch(() => {})
    } else {
      // Chosen here, once the cat is laid out, so the rim and the clock can be measured.
      const next = shell ? pickSpot(button, shell) : 0
      spotRef.current = next
      button.style.setProperty("--cat-spot", String(next))
      setSpot(next)

      const egg = eggRef.current
      if (calm || !egg) {
        last = play(img, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
      } else {
        const side = Math.random() > 0.5 ? 1 : -1
        // The pill pushes the egg up through the rim; it rocks, then cracks.
        play(
          egg,
          [
            { transform: "translateY(36px) rotate(0deg)" },
            { transform: "translateY(-4px) rotate(0deg)", offset: 0.4, easing: "ease-in-out" },
            { transform: "translateY(0) rotate(0deg)", offset: 0.48 },
            { transform: "translateY(0) rotate(-11deg)", offset: 0.58 },
            { transform: "translateY(0) rotate(10deg)", offset: 0.68 },
            { transform: "translateY(0) rotate(-6deg)", offset: 0.78 },
            { transform: "translateY(0) rotate(3deg)", offset: 0.88 },
            { transform: "translateY(0) rotate(0deg)" },
          ],
          { duration: 820, easing: "ease-out" },
        )
        keep(gulp(shell, 0.03, 0))
        const [cap, cup] = egg.children
        play(
          cap,
          [
            { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
            { transform: `translate(${side * 10}px, -20px) rotate(${side * 38}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${side * 16}px, -6px) rotate(${side * 72}deg)`, opacity: 0 },
          ],
          { duration: 520, delay: 820, easing: "ease-out" },
        )
        play(
          cup,
          [
            { transform: "translateY(0)", opacity: 1 },
            { transform: "translateY(0)", opacity: 1, offset: 0.35 },
            { transform: "translateY(30px)", opacity: 0.6 },
          ],
          { duration: 520, delay: 820, easing: "ease-in" },
        )
        last = play(
          img,
          [
            { transform: "translateY(10px) scale(0.3)", opacity: 0 },
            { transform: "translateY(-12px) scale(0.92, 1.1)", opacity: 1, offset: 0.42 },
            { transform: "translateY(0) scale(1.08, 0.9)", offset: 0.7 },
            { transform: "translateY(0) scale(0.98, 1.02)", offset: 0.86 },
            { transform: "translateY(0) scale(1)", opacity: 1 },
          ],
          { duration: 560, delay: 800, easing: "ease-out" },
        )
      }
      last.finished.then(() => setPhase("rest")).catch(() => {})
    }

    return () => running.forEach((animation) => animation.cancel())
  }, [phase, present, calm, shellRef, fieldRef])

  // Restart the hop even when it is clicked mid-air: drop the flag, then set it
  // on the next frame so the animation runs from the top again.
  function hop() {
    if (phase !== "rest") return
    setHopping(false)
    requestAnimationFrame(() => setHopping(true))
  }

  if (!present) return null

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          aria-label="摸摸猫"
          data-hop={hopping ? "true" : undefined}
          data-phase={phase === "rest" ? undefined : phase}
          style={{ "--cat-spot": spot } as CSSProperties}
          onClick={hop}
          onContextMenu={(event) => {
            // Shift+F10 or the menu key: focus should land somewhere sensible after.
            fromKeyboard.current = event.currentTarget.matches(":focus-visible")
          }}
          onAnimationEnd={() => setHopping(false)}
          className="search-cat"
        >
          {phase === "hatching" && !calm ? (
            <span ref={eggRef} aria-hidden="true" className="search-egg">
              <span className="search-egg-shell" data-half="cap" />
              <span className="search-egg-shell" data-half="cup" />
            </span>
          ) : null}
          <img
            ref={imgRef}
            src={`${import.meta.env.BASE_URL}${calm ? "cat-still.png" : "cat.webp"}`}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className="search-cat-img"
          />
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(event) => {
          // The cat is about to leave; handing focus back to it would drop it on the floor.
          if (hiding.current) event.preventDefault()
          hiding.current = false
        }}
      >
        <ContextMenuItem
          onSelect={() => {
            hiding.current = true
            onHide()
          }}
        >
          <EyeClosed size={14} aria-hidden="true" />
          隐藏小猫
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
