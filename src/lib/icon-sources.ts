/**
 * Where a custom site's icon can come from. Services only ever learn the site's
 * origin, never the page: a path or query can carry ids or tokens.
 */

export type IconSourceId = "site" | "google" | "faviconis"

export const iconSources: readonly { id: IconSourceId; label: string; hint: string }[] = [
  {
    id: "site",
    label: "浏览器缓存",
    hint: "读站点自己的图标：去过的站点直接从浏览器缓存出，不经第三方",
  },
  { id: "google", label: "Google", hint: "Google 图标服务的国内节点 gstatic.cn" },
  { id: "faviconis", label: "favicon.is", hint: "第三方图标服务，尺寸较大" },
]

function originOf(url: string) {
  try {
    const parsed = new URL(url)
    return /^https?:$/.test(parsed.protocol) ? parsed : null
  } catch {
    return null
  }
}

/** Addresses to try for one source, best first. */
export function candidatesFor(source: IconSourceId, url: string): string[] {
  const parsed = originOf(url)
  if (!parsed) return []
  const { origin, hostname } = parsed
  if (source === "site") return [`${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`]
  if (source === "google") {
    const query = new URLSearchParams({
      client: "SOCIAL",
      type: "FAVICON",
      fallback_opts: "TYPE,SIZE,URL",
      url: `${origin}/`,
      size: "128",
    })
    return [`https://t2.gstatic.cn/faviconV2?${query}`]
  }
  return [`https://favicon.is/${hostname}?larger=true`]
}

/** Which source an icon address came from, for reopening the dialog. */
export function sourceOf(icon: string, url: string): IconSourceId | null {
  for (const source of iconSources) {
    if (candidatesFor(source.id, url).includes(icon)) return source.id
  }
  return null
}

/** Google answers an unknown site with a 16px globe instead of an error. */
const PLACEHOLDER_MAX = 16

function load(src: string, timeout: number) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    const timer = window.setTimeout(() => finish(null), timeout)
    function finish(result: HTMLImageElement | null) {
      window.clearTimeout(timer)
      image.onload = image.onerror = null
      resolve(result)
    }
    image.decoding = "async"
    image.onload = () => finish(image.naturalWidth > 0 ? image : null)
    image.onerror = () => finish(null)
    image.src = src
  })
}

/** The first candidate that loads as a real icon, or null. */
export async function probe(source: IconSourceId, url: string, timeout = 5000) {
  for (const src of candidatesFor(source, url)) {
    const image = await load(src, timeout)
    if (!image) continue
    if (source === "google" && image.naturalWidth <= PLACEHOLDER_MAX) continue
    return { src, image }
  }
  return null
}

/**
 * An uploaded file as a 128px data URL. That is twice the largest plate, and a
 * few kilobytes in localStorage; WebP keeps transparency where it is supported.
 */
export async function readUpload(file: File, size = 128): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return null
  const blobUrl = URL.createObjectURL(file)
  try {
    const image = await load(blobUrl, 8000)
    if (!image) return null
    const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext("2d")
    if (!context) return null
    context.imageSmoothingQuality = "high"
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const webp = canvas.toDataURL("image/webp", 0.92)
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
