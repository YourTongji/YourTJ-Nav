import { Mark, plateProps } from "@/components/Mark"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Site } from "@/data/sites"
import { cn } from "@/lib/utils"

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function SiteTile({
  site,
  dense = false,
  dropTarget = false,
  onVisit,
}: {
  site: Site
  /** The 52px plate a phone-width grid packs five across, instead of 64px. */
  dense?: boolean
  dropTarget?: boolean
  onVisit?: () => void
}) {
  const { mark } = site
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          data-drop={dropTarget}
          onClick={() => onVisit?.()}
          className={cn(
            "nav-tile flex w-full flex-col items-center rounded-xl pt-0.5",
            dense ? "gap-1.5" : "gap-2",
          )}
        >
          <span
            className={cn(
              "nav-tile-plate grid place-items-center overflow-hidden",
              dense ? "size-13 rounded-[15px]" : "size-16 rounded-[18px]",
            )}
            {...plateProps(mark)}
          >
            <Mark mark={mark} size={dense ? 28 : 34} />
          </span>
          <span
            className={cn(
              "line-clamp-2 max-w-full text-balance text-center leading-[1.35] text-ink",
              dense ? "text-[11.5px]" : "text-[12px]",
            )}
          >
            {site.title}
          </span>
        </a>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        <span className="block text-[12px] font-medium text-ink">{site.title}</span>
        <span className="mt-0.5 block text-ink-muted">{site.description}</span>
        <span className="mt-1 block font-mono text-[10.5px] text-ink-muted">{hostOf(site.url)}</span>
      </TooltipContent>
    </Tooltip>
  )
}
