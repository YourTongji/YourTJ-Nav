import { cn } from "@/lib/utils"

/**
 * Height-animated disclosure. Toggling a block in and out of the page is the
 * single biggest source of layout jumps here, so anything a switch controls
 * collapses through a 0fr grid row instead of disappearing.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-spring)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className={cn("min-h-0 overflow-hidden", !open && "pointer-events-none")}>{children}</div>
    </div>
  )
}
