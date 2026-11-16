import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-soft)] select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.14)] hover:bg-primary/92",
        glass:
          "border border-hairline-strong bg-glass text-ink backdrop-blur-md hover:bg-glass-hover",
        chip: "nav-chip text-ink",
        ghost: "text-ink-muted hover:bg-accent hover:text-ink",
        outline: "border border-hairline-strong text-ink hover:bg-accent",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-6",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
