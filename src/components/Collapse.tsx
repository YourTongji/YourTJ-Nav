import { cn } from "@/lib/utils"

/**
 * Height-animated disclosure. Toggling a block in and out of the page is the
 * single biggest source of layout jumps here, so anything a switch controls
 * collapses through a 0fr grid row instead of disappearing.
 *
 * Closed means `inert`, not just `aria-hidden`: hidden controls must also drop
 * out of the tab order, or Tab walks through settings nobody can see.
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
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[240ms] ease-[var(--ease-collapse)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
