import { useEffect, useState } from "react"

import type { WallpaperPicture } from "@/hooks/use-wallpaper"

type Layers = {
  a: WallpaperPicture | null
  b: WallpaperPicture | null
  active: 0 | 1
}

function Layer({
  src,
  visible,
  onReady,
  onFail,
}: {
  src: string | null
  visible: boolean
  onReady: () => void
  onFail: () => void
}) {
  /*
    The parent keys this component by src, so a new picture remounts it with
    `decoded` already false. Resetting that in an effect instead would race a
    cached image: load fires, then the effect clears the flag, and the layer
    never becomes visible.
  */
  const [decoded, setDecoded] = useState(false)

  useEffect(() => {
    if (decoded && visible) onReady()
  }, [decoded, visible, onReady])

  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      onLoad={() => setDecoded(true)}
      onError={() => {
        setDecoded(false)
        onFail()
      }}
      data-visible={visible && decoded}
      className="wallpaper-layer"
    />
  )
}

export function Wallpaper({
  layers,
  onReady,
  onFail,
}: {
  layers: Layers
  onReady: () => void
  onFail: () => void
}) {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 bg-background">
      <Layer
        key={layers.a?.url ?? "a"}
        src={layers.a?.url ?? null}
        visible={layers.active === 0}
        onReady={onReady}
        onFail={onFail}
      />
      <Layer
        key={layers.b?.url ?? "b"}
        src={layers.b?.url ?? null}
        visible={layers.active === 1}
        onReady={onReady}
        onFail={onFail}
      />
    </div>
  )
}
