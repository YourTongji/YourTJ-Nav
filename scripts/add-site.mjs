#!/usr/bin/env node
/*
 * Turns an "Add site / 补充站点" issue into an entry in src/data/sites.ts.
 *
 * Reads the issue form from ISSUE_BODY (GitHub renders forms as `### label`
 * sections), appends one entry to the chosen category, and reports what it did.
 * Idempotent: an address already in the file is skipped, so re-running the
 * workflow on an edited issue never duplicates a site.
 */
import { readFileSync, writeFileSync } from "node:fs"

const FILE = "src/data/sites.ts"

const CATEGORIES = {
  学校官网: "official",
  课程常用: "course",
  学术资源: "academic",
  人工智能: "ai",
  实用工具: "tools",
  正版申请: "software",
}

/** `### 标题\n\n值` → { 标题: 值 } */
function parseIssueForm(body) {
  const fields = {}
  const parts = body.split(/^### /m).slice(1)
  for (const part of parts) {
    const newline = part.indexOf("\n")
    if (newline === -1) continue
    const label = part.slice(0, newline).trim()
    const value = part
      .slice(newline + 1)
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim()
    if (!value || value === "_No response_") continue
    fields[label] = value
  }
  return fields
}

function fail(message) {
  console.error(`::error::${message}`)
  process.exit(1)
}

function slugify(title, url) {
  const fromUrl = (() => {
    try {
      return new URL(url).host.replace(/^www\./, "").split(".")[0]
    } catch {
      return ""
    }
  })()
  const base = (fromUrl || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return base || `site-${Date.now().toString(36)}`
}

function normalizeUrl(raw) {
  const value = raw.trim()
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function quote(text) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

const body = process.env.ISSUE_BODY ?? ""
if (!body.trim()) fail("没有拿到 Issue 内容（ISSUE_BODY 为空）")

const fields = parseIssueForm(body)
const title = fields["站点名称"]
const rawUrl = fields["站点地址"]
const category = fields["分类"]
const description = fields["一句话说明"] || ""
const iconInput = fields["图标地址（可选）"] || ""

if (!title) fail("缺少「站点名称」")
if (!rawUrl) fail("缺少「站点地址」")
if (!category || !CATEGORIES[category]) {
  fail(`分类「${category ?? ""}」不在允许列表里：${Object.keys(CATEGORIES).join(" / ")}`)
}

const url = normalizeUrl(rawUrl)
let host
try {
  host = new URL(url).host
} catch {
  fail(`地址解析失败：${url}`)
}

const icon = /^https?:\/\//i.test(iconInput)
  ? iconInput
  : `https://${host}/favicon.ico`

const source = readFileSync(FILE, "utf8")

// 地址已存在就跳过，避免编辑 Issue 后重复追加。
const existing = new Set(
  [...source.matchAll(/url:\s*"([^"]+)"/g)].map((match) =>
    match[1].replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase(),
  ),
)
const key = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase()
if (existing.has(key)) {
  console.log(`::notice::${url} 已经在清单里，跳过。`)
  process.exit(0)
}

let id = slugify(title, url)
if (source.includes(`id: "${id}"`)) id = `${id}-${Date.now().toString(36).slice(-4)}`

const entry = `  {
    id: "${id}",
    title: "${quote(title)}",
    description: "${quote(description)}",
    url: "${quote(url)}",
    mark: logo("${quote(icon)}", "light"),
  },
`

const arrayName = CATEGORIES[category]
const start = source.indexOf(`const ${arrayName}: Site[] = [`)
if (start === -1) fail(`找不到分类数组 ${arrayName}`)
const close = source.indexOf("\n]", start)
if (close === -1) fail(`分类数组 ${arrayName} 没有正常闭合`)

const next = `${source.slice(0, close + 1)}${entry}${source.slice(close + 1)}`
writeFileSync(FILE, next, "utf8")

console.log(`::notice::已把「${title}」加到「${category}」（id=${id}）`)
console.log(`SITE_TITLE=${title}`)
console.log(`SITE_URL=${url}`)
console.log(`SITE_CATEGORY=${category}`)
console.log(`SITE_ID=${id}`)
