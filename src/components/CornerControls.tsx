import { Image, Settings } from "reicon-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 sm:bottom-5 sm:right-5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="chip"
            size="icon"
            onClick={wallpaper.refresh}
            aria-busy={loading}
            aria-label="换一张壁纸"
            className="relative size-10 rounded-full shadow-[0_10px_28px_-16px_var(--shade)]"
          >
            {/*
              A ring that fills and fades while the next wallpaper loads. It sits
              outside the button's 40px box, so the chip itself never resizes.
            */}
            {loading ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 48 48"
                className="wallpaper-ring pointer-events-none absolute -inset-1 size-12 text-brand"
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
            className="size-10 rounded-full shadow-[0_10px_28px_-16px_var(--shade)]"
          >
            <Settings size={17} aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">外观与站点</TooltipContent>
      </Tooltip>
    </div>
  )
}
