export type WallpaperSourceId = "anime" | "landscape" | "custom"

export type WallpaperSource = {
  id: WallpaperSourceId
  label: string
  hint: string
  /**
   * Endpoints that answer with `{ url }`. Preferred over direct images because
   * the resolved address is a stable picture: the settings panel can show it as
   * a preview without the second request rolling a different image.
   */
  json: string[]
  /** Direct image endpoints, only used when every JSON endpoint fails. */
  fallback: string[]
}

export const wallpaperSources: WallpaperSource[] = [
  {
    id: "anime",
    label: "动漫",
    hint: "loliapi 插画",
    json: ["https://api.loliapi.com/acg/?type=json"],
    fallback: ["https://www.loliapi.com/acg/", "https://t.alcy.cc/moe"],
  },
  {
    id: "landscape",
    label: "风景",
    hint: "必应每日",
    // index 0 is today, 1..7 walk back a week; one is picked at random per roll.
    json: Array.from(
      { length: 8 },
      (_, index) => `https://bing.biturl.top/?resolution=1920&format=json&index=${index}`,
    ),
    fallback: ["https://t.alcy.cc/fj", "https://picsum.photos/1920/1080"],
  },
  {
    id: "custom",
    label: "自定义",
    hint: "本地图片",
    json: [],
    fallback: [],
  },
]

export const defaultSourceId: WallpaperSourceId = "anime"

export function findSource(id: WallpaperSourceId): WallpaperSource {
  return wallpaperSources.find((source) => source.id === id) ?? wallpaperSources[0]
}

export function bust(url: string): string {
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}_=${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export function pickOne<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}
