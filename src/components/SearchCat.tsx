import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react"
import { EyeClosed } from "reicon-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

/** 换 cat-typing.webp 的内容时 +1，否则浏览器会继续用缓存里的旧图。 */
const TYPING_ASSET_VERSION = "3"

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

type Rim = {
  /** Pixels per unit of `--cat-spot`: how far 0 is from 1. */
  track: number
  /** Stretches of the rim, as spot ranges, where the cat would sit on the clock. */
  blocked: [number, number][]
}

/**
 * The flat top of the pill the cat can sit on, in the same inset and track
 * index.css positions it with, minus whatever is marked `data-cat-avoid` (the
 * clock): the cat should never come to rest on the time.
 */
function measureRim(button: HTMLElement, shell: HTMLElement): Rim {
  const rim = shell.getBoundingClientRect()
  const cat = button.getBoundingClientRect()
  const inset = Number.parseFloat(getComputedStyle(button).getPropertyValue("--cat-inset")) || 22
  const start = rim.left + inset
  const track = Math.max(1, rim.width - 2 * inset - cat.width)
  // The band the cat occupies above the rim, plus room for a hop.
  const top = rim.top - cat.height - 18
  const blocked = [...document.querySelectorAll<HTMLElement>("[data-cat-avoid]")]
    .filter((element) => !element.closest("[inert]"))
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.bottom > top && box.top < rim.top)
    // 20px of air: the time's digits are not all one width, so it breathes by ~16px as it ticks.
    .map((box): [number, number] => [
      (box.left - 20 - cat.width - start) / track,
      (box.right + 20 - start) / track,
    ])
  return { track, blocked }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const isFree = (rim: Rim, spot: number) => rim.blocked.every(([lo, hi]) => spot <= lo || spot >= hi)

/** Where a cat let go over the clock slides to: the closest free spot. */
function nearestFree(rim: Rim, spot: number) {
  const candidates = [spot, ...rim.blocked.flat()].map(clamp01).filter((value) => isFree(rim, value))
  if (!candidates.length) return 0
  return candidates.reduce((best, value) => (Math.abs(value - spot) < Math.abs(best - spot) ? value : best))
}

/** Where the egg comes up: anywhere free along the rim. */
function randomFree(rim: Rim) {
  const free = Array.from({ length: 41 }, (_, step) => step / 40).filter((value) => isFree(rim, value))
  return free.length ? free[Math.floor(Math.random() * free.length)] : 0
}

/**
 * The cat on the hero search bar. Click to make it hop; drag it, or use the
 * arrow keys, to move it along the rim; right-click, or the switch in
 * settings, to send it away. It leaves by rolling along the rim and sinking
 * into the pill, and comes back by hatching from an egg the pill pushes up
 * somewhere along the rim.
 *
 * Everything moves with the Web Animations API on transform and opacity only,
 * and the egg exists only while it is on screen.
 */
export function SearchCat({
  visible,
  typing,
  onHide,
  spot,
  onSpot,
  shellRef,
  fieldRef,
}: {
  visible: boolean
  /** Someone is typing in the field: the cat sits up and types along. */
  typing: boolean
  onHide: () => void
  /** Where along the rim it sits, 0 to 1; remembered, so it stays where it was put. */
  spot: number
  onSpot: (spot: number) => void
  /** The pill: it squashes as it swallows the cat or pushes the egg out. */
  shellRef: RefObject<HTMLElement | null>
  /** Where keyboard focus goes once the cat it was on has gone. */
  fieldRef: RefObject<HTMLInputElement | null>
}) {
  const calm = usePrefersReducedMotion()
  const [present, setPresent] = useState(visible)
  // Loaded on the first keystroke, not with the page: it is the bigger of the two.
  const [typingSrc, setTypingSrc] = useState<string | null>(null)
  // 图还没解码完就切过去，静止那张已经淡出、新的还没画出来，会闪一下空白。
  const [typingReady, setTypingReady] = useState(false)
  const [phase, setPhase] = useState<Phase>("rest")
  const [hopping, setHopping] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const eggRef = useRef<HTMLSpanElement>(null)
  const settled = useRef(visible)
  const spotRef = useRef(spot)
  const drag = useRef<{
    pointer: number
    startX: number
    from: number
    rim: Rim
    moved: boolean
    lastX: number
    lastAt: number
    still: number
  } | null>(null)
  const dragged = useRef(false)
  const hiding = useRef(false)
  const fromKeyboard = useRef(false)

  // 第一次敲键盘才去取：它比静止那张大，不该占首屏。
  // 文件名不变时浏览器会一直用缓存里的旧图，换素材就把版本号 +1。
  useEffect(() => {
    if (!typing || calm || typingSrc) return
    setTypingSrc(`${import.meta.env.BASE_URL}cat-typing.webp?v=${TYPING_ASSET_VERSION}`)
  }, [typing, calm, typingSrc])

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
      const next = shell ? randomFree(measureRim(button, shell)) : 0
      spotRef.current = next
      button.style.setProperty("--cat-spot", String(next))
      onSpot(next)

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
    // onSpot only stores the value: it is left out so a new function never restarts the hatch.
  }, [phase, present, calm, shellRef, fieldRef])

  useLayoutEffect(() => {
    if (!drag.current) spotRef.current = spot
  }, [spot])

  // Restart the hop even when it is clicked mid-air: drop the flag, then set it
  // on the next frame so the animation runs from the top again.
  function hop() {
    if (dragged.current) {
      dragged.current = false
      return
    }
    if (phase !== "rest") return
    setHopping(false)
    requestAnimationFrame(() => setHopping(true))
  }

  /**
   * Put the cat down at `target`. `from` is where it visibly is now, so a cat
   * dropped over the clock slides the rest of the way instead of jumping, and
   * `lifted` lands it with a small squash.
   */
  function settle(target: number, from: number, track: number, lifted: boolean) {
    const button = buttonRef.current
    const img = imgRef.current
    if (!button || !img) return
    spotRef.current = target
    button.style.setProperty("--cat-spot", String(target))
    onSpot(target)
    if (calm) return
    const shift = (from - target) * track
    const tilt = button.style.getPropertyValue("--cat-tilt") || "0deg"
    img.animate(
      lifted
        ? [
            { transform: `translate(${shift}px, -6px) rotate(${tilt}) scale(1.04)` },
            { transform: "translate(0, 1px) rotate(0deg) scale(1.06, 0.92)", offset: 0.62 },
            { transform: "translate(0, 0) rotate(0deg) scale(1)" },
          ]
        : [{ transform: `translate(${shift}px, 0)` }, { transform: "translate(0, 0)" }],
      { duration: (lifted ? 260 : 180) + Math.min(Math.abs(shift), 160), easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    )
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const shell = shellRef.current
    // A touch drag may never be followed by a click, so the last drag must not eat this one.
    dragged.current = false
    if (phase !== "rest" || !shell || (event.pointerType === "mouse" && event.button !== 0)) return
    // Captured straight away: a quick flick can leave the cat before the first move arrives.
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      from: spotRef.current,
      rim: measureRim(event.currentTarget, shell),
      moved: false,
      lastX: event.clientX,
      lastAt: event.timeStamp,
      still: 0,
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = drag.current
    const button = event.currentTarget
    if (!state || state.pointer !== event.pointerId) return
    const dx = event.clientX - state.startX
    if (!state.moved) {
      // A click wobbles a pixel or two; only a real pull picks the cat up.
      if (Math.abs(dx) < 4) return
      state.moved = true
      button.dataset.drag = "true"
    }
    const next = clamp01(state.from + dx / state.rim.track)
    spotRef.current = next
    button.style.setProperty("--cat-spot", String(next))
    // Lean into the pull, harder the faster it goes, and straighten up when it stops.
    const speed = (event.clientX - state.lastX) / Math.max(8, event.timeStamp - state.lastAt)
    button.style.setProperty("--cat-tilt", `${Math.max(-14, Math.min(14, speed * 9))}deg`)
    state.lastX = event.clientX
    state.lastAt = event.timeStamp
    window.clearTimeout(state.still)
    state.still = window.setTimeout(() => button.style.setProperty("--cat-tilt", "0deg"), 90)
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    drag.current = null
    window.clearTimeout(state.still)
    if (!state.moved) return
    dragged.current = true
    const button = event.currentTarget
    const from = spotRef.current
    // Measured again at the drop: the clock may have changed width since the pick-up.
    const rim = shellRef.current ? measureRim(button, shellRef.current) : state.rim
    settle(nearestFree(rim, from), from, rim.track, true)
    delete button.dataset.drag
    button.style.removeProperty("--cat-tilt")
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const shell = shellRef.current
    if (phase !== "rest" || !shell || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    const rim = measureRim(event.currentTarget, shell)
    const dir = event.key === "ArrowRight" ? 1 : -1
    const from = spotRef.current
    let next = clamp01(from + dir * 0.05)
    // Step over the clock rather than onto it.
    const across = rim.blocked.find(([lo, hi]) => next > lo && next < hi)
    if (across) next = clamp01(dir > 0 ? across[1] : across[0])
    if (!isFree(rim, next) || next === from) return
    settle(next, from, rim.track, false)
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
          aria-keyshortcuts="ArrowLeft ArrowRight"
          data-phase={phase === "rest" ? undefined : phase}
          data-typing={typing && typingReady && phase === "rest" ? "true" : undefined}
          style={{ "--cat-spot": spot } as CSSProperties}
          onClick={hop}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
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
            className="search-cat-img search-cat-rest"
          />
          {typingSrc ? (
            <img
              src={typingSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              onLoad={() => setTypingReady(true)}
              className="search-cat-img search-cat-typing"
            />
          ) : null}
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
