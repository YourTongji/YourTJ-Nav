import { ChatRoundDots, Image, Settings } from "reicon-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { feedbackUrl } from "@/data/project"
import type { WallpaperController } from "@/hooks/use-wallpaper"
import { cn } from "@/lib/utils"

/**
 * The page's own corner, not the nav's: these act on the page itself, so they
 * sit with it the way a new tab's controls do.
 */
export function CornerControls({
  wallpaper,
  onOpenSettings,
}: {
  wallpaper: WallpaperController
  onOpenSettings: () => void
}) {
  const loading = wallpaper.status === "loading"

  return (
    // On a phone the footer reserves the row these float in, so the last line
    // of the page never ends up under them.
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 sm:bottom-5 sm:right-5">
      {/*
        Feedback, after lumno's corner: the quietest of the three, a bare glyph
        that only takes on glass under the pointer, so it is there when wanted
        and never competes with the two controls that change the page.
      */}
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={feedbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="反馈问题或建议（GitHub Issue）"
            className="corner-button corner-ghost grid place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ChatRoundDots size={17} aria-hidden="true" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top">反馈问题或建议</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="chip"
            size="icon"
            onClick={wallpaper.refresh}
            aria-busy={loading}
            aria-label="换一张壁纸"
            className="corner-button relative rounded-full"
          >
            {/*
              A ring that fills and fades while the next wallpaper loads. It sits
              outside the button's 40px box, so the chip itself never resizes.
            */}
            {loading ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 48 48"
                className="wallpaper-ring pointer-events-none absolute -inset-1 size-[calc(100%+0.5rem)] text-brand"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
            <Image
              size={17}
              aria-hidden="true"
              className={cn(
                "transition-opacity duration-200",
                loading && "opacity-45",
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">换一张壁纸</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="chip"
            size="icon"
            onClick={onOpenSettings}
            aria-label="外观与站点设置"
            className="corner-button rounded-full"
          >
            <Settings size={17} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">外观与站点</TooltipContent>
      </Tooltip>
    </div>
  )
}
