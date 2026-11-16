import { useState } from "react"
import { Check, ChevronDown } from "reicon-react"

import { IconPicker, type IconValue } from "@/components/IconPicker"
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
import type { SiteMark } from "@/data/sites"
import type { Folder } from "@/hooks/use-sites"
import { hostOf, normalizeUrl } from "@/lib/site-store"

export type SiteDraft = {
  id: string | null
  title: string
  url: string
  folder: string
  /** The shipped mark of a shipped site; null for one the user added. */
  base: SiteMark | null
} & IconValue

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
  const [icon, setIcon] = useState<IconValue>({
    icon: draft.icon,
    plate: draft.plate,
    plateColor: draft.plateColor,
    shape: draft.shape,
  })
  const [error, setError] = useState<string | null>(null)
  const normalizedUrl = normalizeUrl(url)

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
    onSubmit({ ...draft, title: title.trim(), url: normalized, folder, ...icon })
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
          onChange={(event) => setUrl(event.target.value)}
          placeholder="example.tongji.edu.cn"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="h-9 rounded-[10px] border border-hairline-strong bg-glass px-2.5 text-[13px]"
        />
      </label>

      <div className="space-y-1.5">
        <span className="block text-[12px] font-medium text-ink">图标</span>
        <IconPicker
          url={normalizedUrl}
          title={title}
          base={draft.base}
          initial={icon}
          fresh={draft.id === null}
          onChange={setIcon}
        />
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
        <DialogContent className="max-w-[25rem]">
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
  site: { id: string; title: string; url: string },
  folder: string,
  look: IconValue & { base: SiteMark | null },
): SiteDraft {
  return { id: site.id, title: site.title, url: site.url, folder, ...look }
}

export function draftForNew(folder: string): SiteDraft {
  return { id: null, title: "", url: "", icon: "", folder, base: null }
}

export { hostOf }
