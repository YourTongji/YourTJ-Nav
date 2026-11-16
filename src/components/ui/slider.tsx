import * as SliderPrimitive from "@radix-ui/react-slider"
import type * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      /*
        On touch the panel scrolls past a column of sliders, and a finger that
        meant to scroll would set whatever track it landed on. So touch drags
        the thumb only, and a vertical swipe over the track scrolls the panel.
      */
      onPointerDownCapture={(event) => {
        const target = event.target as Element
        if (event.pointerType === "touch" && !target.closest("[data-slot=slider-thumb]")) event.stopPropagation()
      }}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2 pointer-coarse:touch-pan-y pointer-coarse:py-3",
        "data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-brand" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={props["aria-label"]}
        className={cn(
          "relative block size-3.5 touch-none rounded-full border border-hairline-strong bg-popover",
          // The grab area stays 44px on touch while the knob itself stays small.
          "pointer-coarse:size-5 pointer-coarse:after:absolute pointer-coarse:after:-inset-3 pointer-coarse:after:content-['']",
          "shadow-[0_2px_6px_-2px_var(--shade)] outline-none transition-[transform,box-shadow] duration-150",
          "hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "active:scale-95",
        )}
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
