import { useEffect, useRef, useState } from "react"
import { ImagePlus, MagicStar, Minus, Palette } from "reicon-react"

import { Mark, plateProps } from "@/components/Mark"
import { Switch } from "@/components/ui/switch"
import type { SiteMark } from "@/data/sites"
import { clearMissing } from "@/lib/icon-cache"
import {
  autoPlate,
  inkOn,
  plateChoices,
  readShape,
  resolveLook,
  type IconShape,
  type PlateMode,
} from "@/lib/icon-look"
import {
  candidatesFor,
  iconSources,
  probe,
  readUpload,
  sourceOf,
  type IconSourceId,
} from "@/lib/icon-sources"
import { cn } from "@/lib/utils"

export type IconValue = {
  icon: string
  plate?: PlateMode
  plateColor?: string
  shape?: IconShape
}

/** "base" is the shipped icon for a shipped site, the first letter for one the user added. */
type Choice = "base" | IconSourceId | "upload" | "url"

type Probe = { state: "loading" | "ok" | "none"; src?: string; shape?: IconShape | null }

const PRIORITY: IconSourceId[] = ["site", "google", "faviconis"]

function initialChoice(icon: string, url: string): Choice {
  if (!icon) return "base"
  if (icon.startsWith("data:")) return "upload"
  return sourceOf(icon, url) ?? "url"
}

/** The pixels of an address the page may read, measured once it loads. */
function measure(src: string) {
  return new Promise<IconShape | null>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(readShape(image))
    image.onerror = () => resolve(null)
    image.src = src
  })
}

/**
 * Every place an icon can come from, side by side with what each one actually
 * returns for this address, so the choice is made by looking, not by guessing
 * which service knows the site. A new site takes the best one by itself until
 * the user picks.
 */
export function IconPicker({
  url,
  title,
  base,
  initial,
  fresh,
  onChange,
}: {
  /** Normalised address, or null while it does not parse. */
  url: string | null
  title: string
  /** The shipped mark, for a shipped site. */
  base: SiteMark | null
  initial: IconValue
  /** A site being added: the icon follows the best source until the user picks. */
  fresh: boolean
  onChange: (value: IconValue) => void
}) {
  const [choice, setChoice] = useState<Choice>(() => initialChoice(initial.icon, url ?? ""))
  // A new site follows the best result until the user picks; an edit keeps its icon.
  const [following, setFollowing] = useState(fresh)
  const [probes, setProbes] = useState<Partial<Record<IconSourceId, Probe>>>(() => {
    const seeded = initialChoice(initial.icon, url ?? "")
    return PRIORITY.includes(seeded as IconSourceId)
      ? { [seeded]: { state: "ok", src: initial.icon, shape: initial.shape ?? null } }
      : {}
  })
  const [upload, setUpload] = useState<{ src: string; shape: IconShape | null } | null>(() =>
    initial.icon.startsWith("data:") ? { src: initial.icon, shape: initial.shape ?? null } : null,
  )
  const [typed, setTyped] = useState(() =>
    initialChoice(initial.icon, url ?? "") === "url" ? initial.icon : "",
  )
  const [typedShape, setTypedShape] = useState<IconShape | null>(initial.shape ?? null)
  const [plate, setPlate] = useState<PlateMode | undefined>(initial.plate)
  const [plateColor, setPlateColor] = useState<string | undefined>(initial.plateColor)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Ask every source at once, a moment after typing stops. A result that is
  // still right for this address stays up while it is asked again.
  useEffect(() => {
    if (!url) {
      setProbes({})
      return
    }
    let live = true
    const timer = window.setTimeout(() => {
      setProbes((current) =>
        Object.fromEntries(
          PRIORITY.map((id) => {
            const kept = current[id]
            const valid = kept?.state === "ok" && candidatesFor(id, url).includes(kept.src ?? "")
            return [id, valid ? kept : { state: "loading" }]
          }),
        ),
      )
      for (const id of PRIORITY) {
        void probe(id, url).then((result) => {
          if (!live) return
          if (result) clearMissing(result.src)
          setProbes((current) => ({
            ...current,
            [id]: result ? { state: "ok", src: result.src, shape: readShape(result.image) } : { state: "none" },
          }))
        })
      }
    }, 350)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [url])

  // While following, the best source wins once everything ranked above it has answered.
  useEffect(() => {
    if (!following) return
    for (const id of PRIORITY) {
      const result = probes[id]
      if (!result || result.state === "loading") return
      if (result.state === "ok") {
        setChoice(id)
        return
      }
    }
    setChoice("base")
  }, [following, probes])

  useEffect(() => {
    if (choice !== "url" || !typed) return
    let live = true
    const timer = window.setTimeout(() => {
      void measure(typed).then((shape) => live && setTypedShape(shape))
    }, 350)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [choice, typed])

  const picked: { src: string; shape: IconShape | null } | null =
    choice === "base"
      ? null
      : choice === "upload"
        ? upload
        : choice === "url"
          ? typed
            ? { src: typed, shape: typedShape }
            : null
          : probes[choice]?.state === "ok"
            ? { src: probes[choice]!.src!, shape: probes[choice]!.shape ?? null }
            : null

  const value: IconValue = picked
    ? { icon: picked.src, plate, plateColor, shape: picked.shape ?? undefined }
    : { icon: "" }
  const signature = JSON.stringify(value)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    onChangeRef.current(JSON.parse(signature) as IconValue)
  }, [signature])

  function pick(next: Choice) {
    setFollowing(false)
    setChoice(next)
  }

  async function takeFile(file: File | undefined) {
    if (!file) return
    const src = await readUpload(file)
    if (!src) {
      setUploadError("读不了这个文件，换一张 4 MB 以内的图片")
      return
    }
    setUploadError(null)
    setUpload({ src, shape: await measure(src) })
    pick("upload")
  }

  const letter: SiteMark = { kind: "letter", text: title.trim().slice(0, 1).toUpperCase() || "?" }
  const shape = picked?.shape ?? null
  const look = resolveLook({ shape, plate, plateColor })
  const fills = Boolean(shape && !shape.transparent && shape.square)
  const plateOn = look.chip === "tint"
  const auto = autoPlate(shape?.accent ?? null)
  const choices = plateChoices(shape)

  const logo = (src: string, s: IconShape | null, own: boolean): SiteMark => ({
    kind: "logo",
    src,
    ...resolveLook(own ? { shape: s, plate, plateColor } : { shape: s }),
  })

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="图标来源" className="grid grid-cols-5 gap-1">
        <Option
          label={base ? "内置" : "首字母"}
          selected={choice === "base"}
          onSelect={() => pick("base")}
          mark={base ?? letter}
        />
        {iconSources.map((source) => {
          const result = probes[source.id]
          const selected = choice === source.id
          return (
            <Option
              key={source.id}
              label={source.label}
              hint={source.hint}
              selected={selected}
              state={url ? (result?.state ?? "loading") : "none"}
              onSelect={() => pick(source.id)}
              mark={result?.state === "ok" ? logo(result.src!, result.shape ?? null, selected) : null}
            />
          )
        })}
        <Option
          label={upload ? "本地图片" : "上传"}
          hint="PNG、JPG、WebP 或 SVG，存在这台设备上"
          selected={choice === "upload"}
          onSelect={() => (upload && choice !== "upload" ? pick("upload") : fileRef.current?.click())}
          mark={upload ? logo(upload.src, upload.shape, choice === "upload") : null}
          empty={<ImagePlus size={18} aria-hidden="true" className="plate-ink" />}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            void takeFile(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>

      <input
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value.trim())
          setTypedShape(null)
          if (event.target.value.trim()) pick("url")
        }}
        placeholder="或者粘贴一个图标地址"
        aria-label="图标地址"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-8 w-full rounded-[10px] border bg-glass px-2.5 text-[12px] text-ink placeholder:text-ink-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          choice === "url" ? "border-brand" : "border-hairline-strong",
        )}
      />

      {uploadError ? (
        <p role="alert" className="text-[11.5px] text-destructive">
          {uploadError}
        </p>
      ) : null}

      {picked ? (
        fills ? (
          <p className="text-[11.5px] text-ink-muted">图标自带方形底色，直接铺满图块</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12.5px] font-medium text-ink">给透明图标加底色</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {shape
                    ? shape.transparent
                      ? "检测到透明边缘，默认取图标的主色"
                      : "图标不是方形，放在白底上"
                    : "这个来源读不到像素，默认用白底"}
                </p>
              </div>
              <Switch checked={plateOn} onChange={(on) => setPlate(on ? "on" : "off")} label="给透明图标加底色" />
            </div>
            {plateOn ? (
              <div role="radiogroup" aria-label="底色" className="flex flex-wrap items-center gap-2">
                <Swatch
                  label="跟随图标"
                  color={auto}
                  selected={!plateColor}
                  onSelect={() => setPlateColor(undefined)}
                >
                  <MagicStar size={11} weight="Filled" aria-hidden="true" />
                </Swatch>
                {choices.map((color) => (
                  <Swatch
                    key={color}
                    label={color}
                    color={color}
                    selected={plateColor === color}
                    onSelect={() => setPlateColor(color)}
                  />
                ))}
                {plateColor && !choices.includes(plateColor) ? (
                  <Swatch label={plateColor} color={plateColor} selected onSelect={() => {}} />
                ) : null}
                <label
                  title="自定义颜色"
                  className="relative grid size-6 cursor-pointer place-items-center rounded-full bg-[var(--mat-well)] text-ink transition-[scale] duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand active:scale-[0.96]"
                >
                  <Palette size={13} aria-hidden="true" />
                  <input
                    type="color"
                    aria-label="自定义颜色"
                    value={plateColor ?? auto}
                    onChange={(event) => setPlateColor(event.target.value.toUpperCase())}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  )
}

function Option({
  label,
  hint,
  selected,
  state = "ok",
  mark,
  empty,
  onSelect,
}: {
  label: string
  hint?: string
  selected: boolean
  state?: Probe["state"]
  mark: SiteMark | null
  empty?: React.ReactNode
  onSelect: () => void
}) {
  const missing = state === "none" && !empty
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={missing || undefined}
      title={missing ? `${label}：没有找到图标` : hint}
      onClick={() => {
        if (!missing) onSelect()
      }}
      className="group flex min-w-0 flex-col items-center gap-1.5 rounded-[14px] pb-0.5 pt-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand aria-disabled:cursor-not-allowed"
    >
      <span
        className={cn(
          "nav-tile-plate grid size-11 place-items-center overflow-hidden rounded-[13px] outline-offset-2 transition-[scale,opacity] duration-150 group-active:scale-[0.96]",
          selected && "outline-2 outline-brand",
          missing && "opacity-45",
        )}
        {...(mark ? plateProps(mark) : { "data-chip": "light" })}
      >
        {mark ? (
          <Mark mark={mark} size={24} />
        ) : state === "loading" ? (
          <span className="size-2 rounded-full bg-[oklch(0.34_0.022_262_/_0.35)] animate-pulse motion-reduce:animate-none" />
        ) : (
          (empty ?? <Minus size={16} aria-hidden="true" className="plate-ink opacity-60" />)
        )}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[10.5px] leading-tight",
          selected ? "font-medium text-ink" : "text-ink-muted",
        )}
      >
        {label}
      </span>
    </button>
  )
}

function Swatch({
  label,
  color,
  selected,
  onSelect,
  children,
}: {
  label: string
  color: string
  selected: boolean
  onSelect: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      style={{ backgroundColor: color, color: inkOn(color) }}
      className={cn(
        "grid size-6 place-items-center rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0_/_0.12)] transition-[scale] duration-150 active:scale-[0.96]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        selected && "outline-2 outline-offset-2 outline-brand",
      )}
    >
      {children}
    </button>
  )
}
