/**
 * How a site's icon sits on its tile, decided from the artwork itself.
 *
 * An icon that brings its own square (most app-style icons) fills the plate; a
 * bare logo on transparency gets a plate tinted from its own main colour, so it
 * reads as a tile instead of a sticker on white. The idea, and the thresholds,
 * follow lumno's shortcut icon plates.
 *
 * Only pixels the page may read can be measured: shipped files, uploads, and
 * anything same-origin. Icon services send no CORS headers, so their icons keep
 * the plain white mount unless the user picks a plate by hand.
 */

export type Rgb = [number, number, number]

export type IconShape = {
  /** See-through along the edge: a logo, not a tile. */
  transparent: boolean
  /** Close enough to 1:1 that filling the plate crops nothing that matters. */
  square: boolean
  accent: Rgb | null
  palette: Rgb[]
}

export type PlateMode = "on" | "off"

export type IconLook = { chip: "light" | "tint"; fit: "inset" | "fill"; plate?: string }

const SAMPLE = 32
const CLEAR_ALPHA = 24
const SOLID_ALPHA = 128
/** A rounded square leaves only its corners clear; a logo leaves most of the rim. */
const MIN_CLEAR_RIM = 0.4
const MAX_COVERAGE = 0.9
/** Yellow on a pale tint still reads; white on white does not. */
const MIN_PLATE_CONTRAST = 1.6
const MAX_PALETTE = 3
const MIN_SHARE = 0.12
const MIN_DISTANCE = 96

const WHITE: Rgb = [255, 255, 255]
/** The dark mount in index.css, as sRGB. */
const INK: Rgb = [37, 40, 47]

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  [0, 1, 2].map((i) => clamp(from[i] + (to[i] - from[i]) * amount)) as Rgb
const distance = (a: Rgb, b: Rgb) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
const nearWhite = (rgb: Rgb) => Math.min(...rgb) > 232

function saturation([r, g, b]: Rgb) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === min) return 0
  return (max - min) / (1 - Math.abs(max + min - 1))
}

function luminance(rgb: Rgb) {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const toHex = (rgb: Rgb) => `#${rgb.map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase()

export function fromHex(value: unknown): Rgb | null {
  const match = /^#([\da-f]{6})$/i.exec(String(value ?? "").trim())
  if (!match) return null
  return [0, 2, 4].map((at) => parseInt(match[1].slice(at, at + 2), 16)) as Rgb
}

/** RGBA pixels of a SAMPLE x SAMPLE draw, plus the source's aspect ratio. */
export function shapeOf(data: ArrayLike<number>, aspect: number): IconShape {
  let rim = 0
  let clearRim = 0
  let solid = 0
  const buckets = new Map<number, { weight: number; count: number; sum: Rgb }>()

  for (let y = 0; y < SAMPLE; y += 1) {
    for (let x = 0; x < SAMPLE; x += 1) {
      const at = (y * SAMPLE + x) * 4
      const alpha = data[at + 3]
      if (x < 2 || y < 2 || x >= SAMPLE - 2 || y >= SAMPLE - 2) {
        rim += 1
        if (alpha < CLEAR_ALPHA) clearRim += 1
      }
      if (alpha < SOLID_ALPHA) continue
      solid += 1
      const rgb: Rgb = [data[at], data[at + 1], data[at + 2]]
      // Colour outweighs white and grey detail: a white glyph on orange is orange.
      const weight = (alpha / 255) * (nearWhite(rgb) ? 0.08 : 0.3 + saturation(rgb))
      const key = ((rgb[0] >> 5) << 6) | ((rgb[1] >> 5) << 3) | (rgb[2] >> 5)
      const bucket = buckets.get(key) ?? { weight: 0, count: 0, sum: [0, 0, 0] }
      bucket.weight += weight
      bucket.count += 1
      bucket.sum = [bucket.sum[0] + rgb[0], bucket.sum[1] + rgb[1], bucket.sum[2] + rgb[2]]
      buckets.set(key, bucket)
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.weight - a.weight)
  const total = ranked.reduce((sum, bucket) => sum + bucket.weight, 0)
  const palette: Rgb[] = []
  for (const bucket of ranked) {
    const rgb = bucket.sum.map((c) => clamp(c / bucket.count)) as Rgb
    // Real parts of the artwork only, not the blends along anti-aliased edges.
    if (palette.length >= MAX_PALETTE || bucket.weight / total < MIN_SHARE || nearWhite(rgb)) continue
    if (palette.some((color) => distance(color, rgb) < MIN_DISTANCE)) continue
    palette.push(rgb)
  }
  const top = ranked[0] ? (ranked[0].sum.map((c) => clamp(c / ranked[0].count)) as Rgb) : null

  return {
    transparent: solid > 0 && clearRim / rim >= MIN_CLEAR_RIM && solid / (SAMPLE * SAMPLE) <= MAX_COVERAGE,
    square: Math.abs(aspect - 1) < 0.08,
    accent: palette[0] ?? top,
    palette,
  }
}

/** Null when the pixels are off limits (a cross-origin icon) or the image is not loaded. */
export function readShape(image: HTMLImageElement): IconShape | null {
  if (!image.complete || !image.naturalWidth) return null
  try {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = SAMPLE
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0, SAMPLE, SAMPLE)
    const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE)
    return shapeOf(data, image.naturalWidth / image.naturalHeight)
  } catch {
    return null
  }
}

/** Ink for a small glyph drawn on a plate colour. */
export function inkOn(hex: string) {
  const rgb = fromHex(hex)
  return rgb && luminance(rgb) < 0.4 ? "#FFFFFF" : toHex(INK)
}

/** The first candidate the artwork stays legible on, else the best of them. */
function legibleOn(accent: Rgb, candidates: Rgb[]): Rgb {
  let best = candidates[0]
  let bestRatio = 0
  for (const candidate of candidates) {
    const ratio = contrast(candidate, accent)
    if (ratio >= MIN_PLATE_CONTRAST) return candidate
    if (ratio > bestRatio) [best, bestRatio] = [candidate, ratio]
  }
  return best
}

/**
 * A pale tint of the main colour; grey and black artwork get plain white. When
 * no pale tint holds the artwork (a white logo), the plate goes deep instead:
 * the colour pushed most of the way to the dark mount.
 */
export function autoPlate(accent: Rgb | null): string {
  if (!accent) return toHex(WHITE)
  return toHex(legibleOn(accent, [mix(accent, WHITE, 0.88 - 0.1 * saturation(accent)), mix(accent, INK, 0.82)]))
}

/** What the dialog offers: tints of the artwork's colours, then white and the dark mount. */
export function plateChoices(shape: IconShape | null): string[] {
  const candidates: Rgb[] = []
  shape?.palette.forEach((rgb, index) => {
    candidates.push(legibleOn(rgb, [mix(rgb, WHITE, 0.86), mix(rgb, INK, 0.6)]))
    if (index === 0) candidates.push(legibleOn(rgb, [mix(rgb, WHITE, 0.66), mix(rgb, INK, 0.4)]))
  })
  candidates.push(WHITE, INK)
  const choices: Rgb[] = []
  for (const rgb of candidates) {
    if (!choices.some((color) => distance(color, rgb) < 24)) choices.push(rgb)
  }
  return choices.map(toHex)
}

/**
 * The look a tile renders. No choice (`plate` unset) means: fill when the icon
 * is its own square, a tint when it is see-through, the white mount when the
 * pixels could not be read.
 */
export function resolveLook({
  shape,
  plate,
  plateColor,
}: {
  shape?: IconShape | null
  plate?: PlateMode
  plateColor?: string
}): IconLook {
  if (shape && !shape.transparent && shape.square) return { chip: "light", fit: "fill" }
  const mode = plate ?? (shape?.transparent ? "on" : "off")
  if (mode === "off") return { chip: "light", fit: "inset" }
  const custom = fromHex(plateColor)
  return { chip: "tint", fit: "inset", plate: custom ? toHex(custom) : autoPlate(shape?.accent ?? null) }
}

export function isShape(value: unknown): value is IconShape {
  if (typeof value !== "object" || value === null) return false
  const shape = value as Record<string, unknown>
  const rgb = (item: unknown) => Array.isArray(item) && item.length === 3 && item.every((c) => typeof c === "number")
  return (
    typeof shape.transparent === "boolean" &&
    typeof shape.square === "boolean" &&
    (shape.accent === null || rgb(shape.accent)) &&
    Array.isArray(shape.palette) &&
    shape.palette.every(rgb)
  )
}
