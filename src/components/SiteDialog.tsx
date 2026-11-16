import { useState } from "react"
import { ArrowsRotate, Check, ChevronDown } from "reicon-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Folder } from "@/hooks/use-sites"
import { hostOf, normalizeUrl } from "@/lib/site-store"

export type SiteDraft = {
  id: string | null
  title: string
  url: string
  icon: string
  folder: string
}

/** Where a site's own icon usually lives. No third party involved. */
export function faviconOf(url: string): string {
  try {
    return `${new URL(url).origin}/favicon.ico`
  } catch {
    return ""
  }
}

type SiteDialogProps = {
  draft: SiteDraft | null
  folders: Folder[]
  onClose: () => void
  onSubmit: (draft: SiteDraft) => void
}

function SiteForm({
  draft,
  folders,
  onClose,
  onSubmit,
}: {
  draft: SiteDraft
  folders: Folder[]
  onClose: () => void
  onSubmit: (draft: SiteDraft) => void
}) {
  const [title, setTitle] = useState(draft.title)
  const [url, setUrl] = useState(draft.url)
  const [folder, setFolder] = useState(draft.folder)
  const [icon, setIcon] = useState(draft.icon)
  // Once the address is typed by hand, the icon stops following the URL.
  const [iconTouched, setIconTouched] = useState(Boolean(draft.icon))
  const [retried, setRetried] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const host = (() => {
    try {
      return new URL(normalizeUrl(url) ?? url).host
    } catch {
      return ""
    }
  })()

  function changeUrl(next: string) {
    setUrl(next)
    if (iconTouched) return
    const normalized = normalizeUrl(next)
    setIcon(normalized ? faviconOf(normalized) : "")
    setRetried(false)
  }

  function deriveIcon() {
    const normalized = normalizeUrl(url)
    setIcon(normalized ? faviconOf(normalized) : "")
    setIconTouched(false)
    setRetried(false)
  }

  /** A site that does not serve /favicon.ico gets one try at a mirror. */
  function handleIconError() {
    if (retried || !host) return
    setRetried(true)
    setIcon(`https://favicon.im/${host}?larger=true`)
    setIconTouched(true)
  }

  const folderLabel = folders.find((item) => item.id === folder)?.label ?? "选择分类"

  function submit() {
    if (!title.trim()) {
      setError("填一个名称")
      return
    }
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setError("这个地址打不开，检查一下")
      return
    }
    setError(null)
    onSubmit({ ...draft, title: title.trim(), url: normalized, icon: icon.trim(), folder })
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-ink">名称</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="比如 教务系统"
          autoFocus
          className="h-9 rounded-[10px] border border-hairline-strong bg-glass px-2.5 text-[13px]"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-ink">地址</span>
        <Input
          value={url}
          onChange={(event) => changeUrl(event.target.value)}
          placeholder="example.tongji.edu.cn"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="h-9 rounded-[10px] border border-hairline-strong bg-glass px-2.5 text-[13px]"
        />
      </label>

      <div className="space-y-1.5">
        <span className="block text-[12px] font-medium text-ink">图标</span>
        <div className="flex items-center gap-2">
          <span
            className="nav-tile-plate grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px]"
            data-chip="light"
          >
            {icon ? (
              <img
                src={icon}
                alt=""
                className="size-full object-contain p-1.5"
                onError={handleIconError}
              />
            ) : (
              <span className="plate-ink text-[13px] font-semibold">
                {title.trim().slice(0, 1).toUpperCase() || "?"}
              </span>
            )}
          </span>
          <Input
            value={icon}
            onChange={(event) => {
              setIcon(event.target.value)
              setIconTouched(true)
            }}
            placeholder="自动获取，也可以粘贴图标地址"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="h-9 flex-1 rounded-[10px] border border-hairline-strong bg-glass px-2.5 text-[12.5px]"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="自动获取图标"
            onClick={deriveIcon}
          >
            <ArrowsRotate size={13} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-[12px] font-medium text-ink">分类</span>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-hairline-strong bg-glass px-2.5 text-left text-[13px] text-ink transition-colors hover:bg-glass-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {folderLabel}
              <ChevronDown size={13} aria-hidden="true" className="opacity-55" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="min-w-[12rem]">
            <DropdownMenuLabel>放进哪个文件夹</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={folder} onValueChange={setFolder}>
              {folders.map((item) => (
                <DropdownMenuRadioItem key={item.id} value={item.id}>
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error ? (
        <p role="alert" className="text-[11.5px] text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" size="sm">
          <Check size={14} aria-hidden="true" />
          {draft.id ? "保存" : "添加"}
        </Button>
      </div>
    </form>
  )
}

export function SiteDialog({ draft, folders, onClose, onSubmit }: SiteDialogProps) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => (open ? null : onClose())}>
      {draft ? (
        <DialogContent>
          <DialogTitle>{draft.id ? "编辑站点" : "添加站点"}</DialogTitle>
          <DialogDescription>
            {draft.id ? "改完保存，立刻生效" : `将加入「${folders.find((f) => f.id === draft.folder)?.label ?? ""}」`}
          </DialogDescription>
          <SiteForm
            key={draft.id ?? "new"}
            draft={draft}
            folders={folders}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

export function draftFromSite(
  site: { id: string; title: string; url: string; mark: { kind: string; src?: string } },
  folder: string,
): SiteDraft {
  return {
    id: site.id,
    title: site.title,
    url: site.url,
    icon: site.mark.kind === "logo" ? (site.mark.src ?? "") : "",
    folder,
  }
}

export function draftForNew(folder: string): SiteDraft {
  return { id: null, title: "", url: "", icon: "", folder }
}

export { hostOf }
