import { useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { Link } from "reicon-react"

import type { SiteMark } from "@/data/sites"
import { clearMissing, isMissing, markMissing } from "@/lib/icon-cache"

/**
 * 品牌图标的品牌色如果是白的，画在白色底板上等于没画。Hugging Face 就是
 * `#FFFFFF`。这类图标改用底板的墨色，让它在板上显出来。
 */
function isPaleHex(hex: string): boolean {
  const value = hex.replace(/^#/, "")
  if (value.length !== 6) return false
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.75
}

/**
 * A macaron tint per glyph, derived from the icon itself so the same site keeps
 * the same colour between visits. Lightness and chroma are fixed and chosen so
 * every hue clears 4.5:1 on the white plate — pastel hues at their natural
 * lightness would sit around 2:1 and disappear.
 */
const MACARON = [
  { hue: 24, lightness: 0.568 },
  { hue: 52, lightness: 0.564 },
  { hue: 92, lightness: 0.551 },
  { hue: 146, lightness: 0.539 },
  { hue: 192, lightness: 0.512 },
  { hue: 228, lightness: 0.526 },
  { hue: 272, lightness: 0.56 },
  { hue: 320, lightness: 0.568 },
]

export function macaron(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000
  }
  const tone = MACARON[hash % MACARON.length]
  return `oklch(${tone.lightness} 0.16 ${tone.hue})`
}

/**
 * The plate attributes every tile needs: which surface the mark was drawn for,
 * and whether the file is meant to become the plate itself. Spreading these is
 * what keeps a `fill` logo from rendering as a 64px square inside a small plate.
 */
export function plateProps(mark: SiteMark) {
  return {
    "data-chip":
      mark.kind === "glyph" ? undefined : mark.kind === "letter" ? "light" : mark.chip,
    "data-fit": mark.kind === "logo" ? (mark.fit ?? "inset") : undefined,
    style:
      mark.kind === "logo" && mark.plate ? ({ "--plate": mark.plate } as CSSProperties) : undefined,
  }
}

type MarkProps = {
  mark: SiteMark
  size?: number
}

/**
 * One renderer for every kind of tile mark: a Reicon glyph, a shipped logo file,
 * or a mark from the Reicon brand set drawn in the brand's own colour.
 */
/** A logo that failed to load becomes a link glyph rather than a broken frame. */
function LogoImage({
  mark,
  size,
}: {
  mark: Extract<SiteMark, { kind: "logo" }>
  size: number
}) {
  // A remembered miss draws the fallback at once instead of after a failed request.
  const [broken, setBroken] = useState(() => isMissing(mark.src))
  const [ready, setReady] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  // Already in memory (warmed, or seen on another page): no fade, no frame
  // without it. Checked before paint, so a cached icon never blinks.
  useLayoutEffect(() => {
    const image = ref.current
    if (image?.complete && image.naturalWidth > 0) setReady(true)
  }, [])

  if (broken) {
    return <Link size={Math.round(size * 0.72)} weight="Filled" aria-hidden="true" className="plate-ink" />
  }

  const fill = mark.fit === "fill"
  return (
    <img
      ref={ref}
      src={mark.src}
      alt=""
      width={fill ? 64 : size}
      height={fill ? 64 : size}
      decoding="async"
      data-ready={ready}
      onLoad={() => {
        setReady(true)
        clearMissing(mark.src)
      }}
      onError={() => {
        markMissing(mark.src)
        setBroken(true)
      }}
      className={fill ? "tile-logo" : "tile-logo object-contain"}
      style={fill ? undefined : { width: size, height: size }}
    />
  )
}

export function Mark({ mark, size = 26 }: MarkProps) {
  if (mark.kind === "glyph") {
    const Icon = mark.Icon
    return (
      <Icon
        size={size}
        weight="Filled"
        aria-hidden="true"
        style={{ color: macaron(mark.Icon.displayName || mark.Icon.name || "icon") }}
      />
    )
  }

  if (mark.kind === "letter") {
    return (
      <span
        aria-hidden="true"
        className="text-[15px] font-semibold leading-none tracking-tight"
        style={{ color: macaron(mark.text) }}
      >
        {mark.text}
      </span>
    )
  }

  if (mark.kind === "logo") {
    // Keyed by address: a new icon is a new image, with its own load state.
    return <LogoImage key={mark.src} mark={mark} size={size} />
  }

  // 品牌色偏白时交给 CSS 的 currentColor，由 plate-ink 决定最终颜色。
  const pale = isPaleHex(mark.Icon.hex)

  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center [&>svg]:block${pale ? " plate-ink" : ""}`}
      dangerouslySetInnerHTML={{
        __html: mark.Icon.toSvg({ size, color: pale ? "currentColor" : `#${mark.Icon.hex}` }),
      }}
    />
  )
}
