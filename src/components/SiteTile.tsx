import { Mark, plateProps } from "@/components/Mark"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Site } from "@/data/sites"

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function SiteTile({
  site,
  dropTarget = false,
  onVisit,
}: {
  site: Site
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
          className="nav-tile flex w-full flex-col items-center gap-2 rounded-xl pt-0.5"
        >
          <span
            className="nav-tile-plate grid size-16 place-items-center overflow-hidden rounded-[18px]"
            {...plateProps(mark)}
          >
            <Mark mark={mark} size={34} />
          </span>
          <span className="line-clamp-2 max-w-full text-balance text-center text-[12px] leading-[1.35] text-ink">
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
