import { useState } from "react"
import { Link } from "reicon-react"

import type { SiteMark } from "@/data/sites"

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
  const [broken, setBroken] = useState(false)

  if (broken) {
    return <Link size={Math.round(size * 0.72)} weight="Filled" aria-hidden="true" className="plate-ink" />
  }

  if (mark.fit === "fill") {
    return (
      <img
        src={mark.src}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <img
      src={mark.src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="object-contain"
      style={{ width: size, height: size }}
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
    return <LogoImage mark={mark} size={size} />
  }

  return (
    <span
      aria-hidden="true"
      className="grid place-items-center [&>svg]:block"
      dangerouslySetInnerHTML={{
        __html: mark.Icon.toSvg({ size, color: `#${mark.Icon.hex}` }),
      }}
    />
  )
}
