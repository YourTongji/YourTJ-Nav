import { useState } from "react"
import { Github, Qq } from "reicon-brands"
import { ChatRoundDots, Envelope } from "reicon-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { feedbackEmail, feedbackQqUrl, feedbackUrl } from "@/data/project"

const channels = [
  {
    id: "github",
    title: "GitHub Issues",
    description: "推荐使用GitHub反馈",
    href: feedbackUrl,
    external: true,
    brand: Github,
  },
  {
    id: "email",
    title: "YourTJ团队邮箱",
    description: feedbackEmail,
    href: `mailto:${feedbackEmail}`,
    external: false,
    brand: null,
  },
  {
    id: "qq",
    title: "YourTJ反馈QQ群",
    description: "726096994",
    href: feedbackQqUrl,
    external: true,
    brand: Qq,
  },
]

export function FeedbackMenu() {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={(next) => {
      setOpen(next)
      setTooltipOpen(false)
    }}>
      <Tooltip open={!open && tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="chip"
              size="icon"
              className="corner-button rounded-full"
              aria-label="反馈渠道"
            >
              <ChatRoundDots size={17} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">反馈问题或建议</TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={12}
        collisionPadding={16}
        aria-label="反馈渠道"
        aria-orientation="horizontal"
        className="flex min-w-0 gap-1.5 rounded-2xl p-1.5 motion-reduce:animate-none"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
          event.preventDefault()
          const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>("a"))
          const current = links.indexOf(document.activeElement as HTMLAnchorElement)
          const step = event.key === "ArrowRight" ? 1 : -1
          const next = current < 0 ? (step === 1 ? 0 : links.length - 1) : (current + step + links.length) % links.length
          links[next]?.focus()
        }}
      >
        {channels.map((channel) => (
          <Tooltip key={channel.id} delayDuration={180}>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                asChild
                className="feedback-chip shrink-0 justify-center rounded-full bg-[var(--mat-raised)] p-0 text-ink focus:bg-[var(--mat-raised-hover)] focus:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <a
                  href={channel.href}
                  target={channel.external ? "_blank" : undefined}
                  rel={channel.external ? "noopener noreferrer" : undefined}
                  aria-label={channel.title}
                >
                  {channel.brand ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none grid place-items-center [&>svg]:block"
                      dangerouslySetInnerHTML={{ __html: channel.brand.toSvg({ size: 16 }) }}
                    />
                  ) : <Envelope size={16} aria-hidden="true" />}
                </a>
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              collisionPadding={16}
              className="max-w-56 px-3 py-2.5 motion-reduce:animate-none"
              onEscapeKeyDown={() => setOpen(false)}
            >
              <p className="text-[13px] font-medium text-ink">{channel.title}</p>
              <p className="mt-1 break-words text-[12px] leading-relaxed text-ink-muted">{channel.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
