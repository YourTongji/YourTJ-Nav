import { useEffect, useRef, useState } from "react"
import { ArrowsRotate, Feather } from "reicon-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useHitokoto } from "@/hooks/use-hitokoto"
import { cn } from "@/lib/utils"

function attribution(from?: string, fromWho?: string) {
  return [fromWho, from].filter(Boolean).join(" · ")
}

/**
 * A hand-drawn squiggle under the line — the brush mark, not a border. The
 * periods are generated from the width, so a long quote gets a longer stroke
 * instead of a stub under the middle of it.
 */
function Wave({ width }: { width: number }) {
  const step = 11
  const periods = Math.max(2, Math.round((width - 1) / step))
  let path = "M1 3.6Q6.5 1.2 12 3.6"
  for (let index = 1; index < periods; index += 1) path += `T${12 + index * step} 3.6`
  const drawn = 1 + periods * step

  return (
    <svg
      aria-hidden="true"
      width={drawn}
      height="7"
      viewBox={`0 0 ${drawn} 7`}
      fill="none"
      data-wave=""
      className="mx-auto mt-[3px] block text-brand/55"
    >
      <path d={path} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function Hitokoto() {
  const { quote, status, refresh } = useHitokoto()
  const source = quote ? attribution(quote.from, quote.fromWho) : ""
  const textRef = useRef<HTMLParagraphElement>(null)
  const [waveWidth, setWaveWidth] = useState(72)

  // The rule follows the line: ~44% of its width, floored so a two-character
  // quote still reads as a stroke and capped so it never becomes an underline.
  useEffect(() => {
    const element = textRef.current
    if (!element) return
    const measure = () => {
      const width = element.getBoundingClientRect().width
      setWaveWidth(Math.round(Math.min(232, Math.max(48, width * 0.44))))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [quote?.text])

  if (!quote) {
    return (
      <div className="mx-auto flex w-full max-w-[36rem] flex-col items-center gap-2">
        <Skeleton className="h-[19px] w-64 max-w-[70vw]" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <div className="group relative mx-auto w-fit max-w-[36rem] text-center">
      {/*
        The quill hangs outside the line the way lumno's shuffle button does, so
        the quote itself stays optically centred on the search field above it.
      */}
      <Feather
        aria-hidden="true"
        data-quill=""
        size={13}
        className="absolute right-full top-[0.35rem] mr-2 hidden rotate-[-8deg] -scale-x-100 text-brand/70 sm:block"
      />

      <p
        ref={textRef}
        aria-live="polite"
        className="text-pretty font-kai text-[16.5px] leading-[1.7] tracking-[0.01em] text-ink sm:text-[17.5px]"
      >
        {quote.text}
      </p>

      <Wave width={waveWidth} />

      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        {source ? (
          <cite className="font-kai text-[11.5px] not-italic tracking-[0.02em] text-ink-muted">
            {source}
          </cite>
        ) : null}
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="换一句"
          className={cn(
            "grid size-5 place-items-center rounded-full text-ink-muted transition-[opacity,color] duration-150",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink",
            "max-sm:opacity-70",
          )}
        >
          <ArrowsRotate
            size={10}
            aria-hidden="true"
            className={cn("transition-transform", status === "loading" && "animate-spin")}
          />
        </button>
      </div>
    </div>
  )
}
