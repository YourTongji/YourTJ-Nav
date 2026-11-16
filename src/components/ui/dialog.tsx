import * as DialogPrimitive from "@radix-ui/react-dialog"
import type * as React from "react"

import { cn } from "@/lib/utils"

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-[oklch(0.12_0.01_262_/_0.32)] backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        )}
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2",
          "rounded-[20px] border border-hairline-strong mat-panel p-5 shadow-[0_40px_80px_-32px_var(--shade)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[14px] font-semibold tracking-tight text-ink", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("mt-0.5 text-[11.5px] text-ink-muted", className)}
      {...props}
    />
  )
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle }
