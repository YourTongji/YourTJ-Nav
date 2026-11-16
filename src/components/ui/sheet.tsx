import * as SheetPrimitive from "@radix-ui/react-dialog"
import type * as React from "react"

import { cn } from "@/lib/utils"

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[oklch(0.12_0.01_262_/_0.28)] backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Right-hand drawer. The page behind it is the thing being previewed, so the
 * panel floats over it with the same glass vocabulary instead of covering it
 * with an opaque sheet.
 */
function SheetContent({
  className,
  children,
  side = "right",
  withOverlay = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  /** `float` is a card hovering above the corner controls, not an edge drawer. */
  side?: "right" | "left" | "float"
  /** A non-modal panel stays out of the way: no scrim, page still interactive. */
  withOverlay?: boolean
}) {
  return (
    <SheetPrimitive.Portal>
      {withOverlay ? <SheetOverlay /> : null}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        /*
          A dialog opened from inside this panel (add/edit site) is portalled
          outside it, so its clicks read as "outside" and closed the panel.
        */
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-slot="dialog-content"]')) event.preventDefault()
        }}
        className={cn(
          "fixed z-50 flex flex-col outline-none",
          "mat-panel",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:duration-300 data-[state=closed]:duration-200",
          side === "float"
            ? cn(
                "right-4 bottom-[4.75rem] h-[min(calc(100dvh-7.5rem),42rem)] w-[min(26rem,calc(100vw-2rem))]",
                "rounded-[22px]",
                "origin-bottom-right",
                "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                "data-[state=open]:slide-in-from-bottom-3 data-[state=closed]:slide-out-to-bottom-2",
              )
            : side === "right"
              ? "inset-y-0 right-0 w-full sm:w-[23rem] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
              : "inset-y-0 left-0 w-full sm:w-[23rem] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex items-center justify-between gap-3 border-b border-hairline px-5 py-4",
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-[14px] font-semibold tracking-tight text-ink", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[12px] text-ink-muted", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetTrigger,
}
