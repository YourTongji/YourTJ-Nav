import { useEffect, useRef, useState } from "react"
import { Github, Qq } from "reicon-brands"
import { ChatRoundDots, Check, Copy, Envelope } from "reicon-react"

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
    copyValue: feedbackEmail,
    href: `mailto:${feedbackEmail}`,
    external: false,
    brand: null,
  },
  {
    id: "qq",
    title: "YourTJ反馈QQ群",
    description: "726096994",
    copyValue: "726096994",
    href: feedbackQqUrl,
    external: true,
    brand: Qq,
  },
]

/** 复制成功后的提示停留时间，够看清又不拖沓。 */
const COPIED_MS = 1400

/**
 * 提示卡片在 Portal 里，点它或把焦点移进去都会被菜单当成「到了外面」。
 * 复制失败时兜底用的临时 textarea 也会抢焦点，一起算进来。
 */
function insideTip(target: EventTarget | null): boolean {
  const element = target as Element | null
  return Boolean(element?.closest?.('[data-slot="tooltip-content"], [data-clipboard-helper]'))
}

export function FeedbackMenu() {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tipId, setTipId] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  /*
    Radix 的 tooltip 在焦点离开触发器时立刻关闭，而菜单项一悬停就会拿到焦点，
    指针往卡片上移一步就没了。这里自己管开合：离开后留 160ms 给指针跨过间隙。
  */
  function openTip(id: string) {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setTipId(id)
  }

  function scheduleCloseTip() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      // 焦点跑到卡片里的复制按钮上时不算离开。
      if (document.activeElement?.closest?.('[data-slot="tooltip-content"]')) return
      setTipId(null)
    }, 160)
  }

  async function copy(channel: { id: string; copyValue?: string }) {
    const value = channel.copyValue
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // http 或不给权限时退回到选中文本，至少让人能手动复制。
      const active = document.activeElement as HTMLElement | null
      const area = document.createElement("textarea")
      area.value = value
      area.setAttribute("readonly", "")
      area.dataset.clipboardHelper = ""
      area.style.position = "fixed"
      area.style.opacity = "0"
      document.body.append(area)
      area.select()
      document.execCommand("copy")
      area.remove()
      active?.focus()
    }
    setCopiedId(channel.id)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopiedId(null), COPIED_MS)
  }

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
        // 提示卡片在 Portal 里，点它或把焦点移进去都会被当成「到了菜单外面」，
        // 菜单一关卡片跟着没了，复制按钮也就点不到。
        onInteractOutside={(event) => {
          if (insideTip(event.target)) event.preventDefault()
        }}
        onFocusOutside={(event) => {
          if (insideTip(event.target)) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (insideTip(event.target)) event.preventDefault()
        }}
        onKeyDown={(event) => {
          // Tab 被菜单的 roving focus 圈住了，进不到 Portal 里的复制按钮，
          // 所以给键盘留一个 C 键，卡片里会显示这个提示。
          if ((event.key === "c" || event.key === "C") && !event.metaKey && !event.ctrlKey) {
            const id = (document.activeElement as HTMLElement | null)?.dataset.channel
            const channel = channels.find((item) => item.id === id)
            if (channel?.copyValue) {
              event.preventDefault()
              void copy(channel)
              return
            }
          }
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
          <Tooltip
            key={channel.id}
            open={tipId === channel.id}
            onOpenChange={() => {
              /* 开合由上面的指针/焦点处理，这里不让 Radix 自己关。 */
            }}
          >
            <TooltipTrigger asChild>
              <DropdownMenuItem
                asChild
                className="feedback-chip shrink-0 justify-center rounded-full bg-[var(--mat-raised)] p-0 text-ink focus:bg-[var(--mat-raised-hover)] focus:text-ink focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <a
                  href={channel.href}
                  target={channel.external ? "_blank" : undefined}
                  rel={channel.external ? "noopener noreferrer" : undefined}
                  aria-label={channel.title}
                  data-channel={channel.id}
                  onPointerEnter={() => openTip(channel.id)}
                  onPointerLeave={scheduleCloseTip}
                  onFocus={() => openTip(channel.id)}
                  onBlur={scheduleCloseTip}
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
              // 指针要能从图标移到卡片上，复制按钮才点得到。
              onPointerDownOutside={(event) => event.preventDefault()}
              onPointerEnter={() => openTip(channel.id)}
              onPointerLeave={scheduleCloseTip}
              onFocusCapture={() => openTip(channel.id)}
              onBlurCapture={(event) => {
                const next = event.relatedTarget as Node | null
                if (next && event.currentTarget.contains(next)) return
                scheduleCloseTip()
              }}
              onEscapeKeyDown={() => setOpen(false)}
            >
              <p className="text-[13px] font-medium text-ink">{channel.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] leading-relaxed text-ink-muted">
                {/*
                  文案换成「已复制」时保持原宽度：直接把字换掉会让卡片缩窄、
                  Radix 重新定位，指针就落到卡片外面，卡片当场关掉。
                */}
                <span className="relative break-words">
                  <span className={copiedId === channel.id ? "invisible" : undefined}>
                    {channel.description}
                  </span>
                  {copiedId === channel.id ? (
                    <span className="absolute inset-0 text-brand">已复制</span>
                  ) : null}
                </span>
                {channel.copyValue ? (
                  <kbd className="feedback-key" aria-hidden="true">
                    C
                  </kbd>
                ) : null}
                {channel.copyValue ? (
                  <button
                    type="button"
                    onClick={() => copy(channel)}
                    aria-label={`复制${channel.title}`}
                    className="feedback-copy grid size-5 shrink-0 place-items-center rounded-full"
                  >
                    {copiedId === channel.id ? (
                      <Check size={12} strokeWidth={2.4} aria-hidden="true" />
                    ) : (
                      <Copy size={12} aria-hidden="true" />
                    )}
                  </button>
                ) : null}
              </p>
              <span aria-live="polite" className="sr-only">
                {copiedId === channel.id ? "已复制" : ""}
              </span>
            </TooltipContent>
          </Tooltip>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
