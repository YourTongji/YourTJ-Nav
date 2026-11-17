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

/*
 * 结果写到 RESULT_FILE，工作流读它决定下一步：
 *   added      已写入 sites.ts
 *   duplicate  地址已经在清单里
 *   error      校验没过，原因在 message 里
 */
const RESULT_FILE = process.env.RESULT_FILE || "/tmp/site-result.json"
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

function report(status, extra = {}) {
  writeFileSync(RESULT_FILE, JSON.stringify({ status, ...extra }), "utf8")
}

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
  report("error", { message })
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

/** 靠文件头判断真实类型：Content-Type 经常是错的，403 页面也会说自己 200。 */
function sniff(buffer) {
  const b = buffer
  const at = (offset, bytes) => bytes.every((v, i) => b[offset + i] === v)
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png"
  if (at(0, [0xff, 0xd8, 0xff])) return "jpeg"
  if (at(0, [0x47, 0x49, 0x46, 0x38])) return "gif"
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "webp"
  if (at(0, [0x00, 0x00, 0x01, 0x00])) return "ico"
  if (at(0, [0x42, 0x4d])) return "bmp"
  const head = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase()
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return "svg"
  return null
}

/** 抓一个图标，成功返回 { url, kind }，失败抛错。 */
async function fetchIcon(url) {
  let response
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": UA, accept: "image/*,*/*;q=0.8" },
    })
  } catch (error) {
    throw new Error(`请求失败（${error.name === "TimeoutError" ? "超时" : error.message}）`)
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 60) throw new Error(`内容太小（${buffer.length} 字节）`)

  const kind = sniff(buffer)
  if (!kind) {
    const type = response.headers.get("content-type") ?? "未知"
    throw new Error(`不是图片（content-type: ${type}）`)
  }
  return { url: response.url || url, kind, bytes: buffer.length }
}

/**
 * 表单留空时按常见路径挨个试。全失败就报错——宁可让人补一个图标地址，
 * 也不要合进去一条没有图标的站点。
 */
async function probeIcon(explicit, host) {
  const candidates = explicit
    ? [explicit]
    : [
        `https://${host}/favicon.ico`,
        `https://${host}/favicon.png`,
        `https://${host}/apple-touch-icon.png`,
      ]

  const problems = []
  for (const candidate of candidates) {
    try {
      const found = await fetchIcon(candidate)
      console.log(`::notice::图标可用：${found.url}（${found.kind}, ${found.bytes} 字节）`)
      return found
    } catch (error) {
      problems.push(`${candidate} → ${error.message}`)
    }
  }

  throw new Error(
    `没有取到可用的图标，试过 ${candidates.length} 个地址：${problems.join("；")}。` +
      `请在表单的「图标地址（可选）」里填一个能直接访问的图片地址。`,
  )
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

const iconCandidate = /^https?:\/\//i.test(iconInput) ? iconInput : ""

const source = readFileSync(FILE, "utf8")

// 地址已存在就跳过，避免编辑 Issue 后重复追加。
const existing = new Set(
  [...source.matchAll(/url:\s*"([^"]+)"/g)].map((match) =>
    match[1].replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase(),
  ),
)
const key = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase()
if (existing.has(key)) {
  report("duplicate", { url, title })
  console.log(`::notice::${url} 已经在清单里，跳过。`)
  process.exit(0)
}

// 图标探测放在这里：地址和分类都过了，只差确认图标拿得到。
let icon
try {
  icon = await probeIcon(iconCandidate, host)
} catch (error) {
  fail(error.message)
}

let id = slugify(title, url)
if (source.includes(`id: "${id}"`)) id = `${id}-${Date.now().toString(36).slice(-4)}`

const entry = `  {
    id: "${id}",
    title: "${quote(title)}",
    description: "${quote(description)}",
    url: "${quote(url)}",
    mark: logo("${quote(icon.url)}", "light"),
  },
`

const arrayName = CATEGORIES[category]
const start = source.indexOf(`const ${arrayName}: Site[] = [`)
if (start === -1) fail(`找不到分类数组 ${arrayName}`)
const close = source.indexOf("\n]", start)
if (close === -1) fail(`分类数组 ${arrayName} 没有正常闭合`)

const next = `${source.slice(0, close + 1)}${entry}${source.slice(close + 1)}`
writeFileSync(FILE, next, "utf8")

report("added", { id, title, url, category, icon: icon.url, iconKind: icon.kind })
console.log(`::notice::已把「${title}」加到「${category}」（id=${id}）`)
console.log(`SITE_TITLE=${title}`)
console.log(`SITE_URL=${url}`)
console.log(`SITE_CATEGORY=${category}`)
console.log(`SITE_ID=${id}`)
