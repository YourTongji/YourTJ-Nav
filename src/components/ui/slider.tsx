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
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2",
        "data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-brand" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={props["aria-label"]}
        className={cn(
          "block size-3.5 rounded-full border border-hairline-strong bg-popover",
          "shadow-[0_2px_6px_-2px_var(--shade)] outline-none transition-[transform,box-shadow] duration-150",
          "hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "active:scale-95",
        )}
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
