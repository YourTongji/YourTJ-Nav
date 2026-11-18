/**
 * 设置的第二份存储。
 *
 * 手机浏览器把标签页杀掉之后，`localStorage` 有时整片回到默认（夸克就是）。原因有两条，
 * 分开看：
 *
 *   A. 写入还没落盘进程就没了。引擎是批量异步写的，被杀就丢最后一段。
 *   B. 浏览器退出时清掉了这个站点的数据，那就一条不剩。
 *
 * 表现上 A 只会丢最近一次改动，B 是全部归位。用户报的是全部归位，所以按 B 兜。
 *
 * 网页侧能拿到的最耐久的一份存储是 cookie：由网络栈在设置时就写，而且各家「清除缓存」
 * 默认不动 cookie。所以这里把设置镜像一份进 cookie——读的时候 localStorage 空了就用它补，
 * 写的时候顺手同步过去。
 *
 * 不改任何组件的读写方式：包一层 `Storage.prototype.setItem`，现有的调用点一行不动。
 */

const PREFIX = "yourtj-nav-"
const COOKIE = "ytj-prefs"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * 这些键可能很大，不塞进 cookie：自定义壁纸是 data URL，自定义站点 / 最近访问 / 搜索历史
 * 会随使用一直长，图标探测缓存也没有还原的价值。
 */
const SKIP = new Set([
  "yourtj-nav-wallpaper-custom",
  "yourtj-nav-sites",
  "yourtj-nav-recent",
  "yourtj-nav-search-history",
  "yourtj-nav-icon-miss",
  "yourtj-nav-touch",
])

/** 单条超过这个长度的也不镜像——一条 4KB 的 cookie 会被整块顶掉。 */
const MAX_VALUE = 512
const MAX_COOKIE = 3000

type Mirror = Record<string, string>

function readMirror(): Mirror {
  try {
    const hit = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${COOKIE}=`))
    if (!hit) return {}
    const parsed: unknown = JSON.parse(decodeURIComponent(hit.slice(COOKIE.length + 1)))
    if (!parsed || typeof parsed !== "object") return {}
    const out: Mirror = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key.startsWith(PREFIX) && typeof value === "string") out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

function writeMirror(data: Mirror) {
  try {
    const encoded = encodeURIComponent(JSON.stringify(data))
    if (encoded.length > MAX_COOKIE) return
    document.cookie = `${COOKIE}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
  } catch {
    // 隐私模式下 cookie 也会被拒，那就只剩 localStorage 这一份。
  }
}

export function installPersistence() {
  if (typeof window === "undefined") return

  const proto = Storage.prototype
  const setItem = proto.setItem
  const removeItem = proto.removeItem

  // ---- 1. 先把丢掉的那份补回来 ----
  const mirror = readMirror()
  for (const [key, value] of Object.entries(mirror)) {
    try {
      if (window.localStorage.getItem(key) === null) setItem.call(window.localStorage, key, value)
    } catch {
      // 存不进去就算了，别把首屏拖垮。
    }
  }

  // ---- 2. 写穿到 cookie ----
  let pending: Mirror | null = null
  let timer: number | null = null

  const flushMirror = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    if (pending) {
      writeMirror(pending)
      pending = null
    }
  }

  const scheduleMirror = () => {
    if (timer !== null) return
    timer = window.setTimeout(() => {
      timer = null
      flushMirror()
    }, 120)
  }

  const sync = (key: string) => {
    if (!key.startsWith(PREFIX) || SKIP.has(key)) return
    let value: string | null = null
    try {
      value = window.localStorage.getItem(key)
    } catch {
      return
    }
    if (value !== null && value.length > MAX_VALUE) return

    const next = pending ?? readMirror()
    if (value === null) delete next[key]
    else next[key] = value
    pending = next
    scheduleMirror()
  }

  proto.setItem = function (this: Storage, key: string, value: string) {
    setItem.call(this, key, value)
    if (this === window.localStorage) sync(key)
  }

  proto.removeItem = function (this: Storage, key: string) {
    removeItem.call(this, key)
    if (this === window.localStorage) sync(key)
  }

  /*
    故意不拦 `clear()`：浏览器清站点数据走的是外部流程，根本不会调到 JS；能调到 `clear()`
    的只有我们自己，而这个项目没有「全部清空」的入口（清最近访问走的是 `removeItem`，
    已经同步过了）。拦下来只会把 cookie 里那份一起抹掉，等于自断后路。
  */

  // ---- 3. 走之前逼一次落盘 ----
  //
  // 同一个值重写一遍是空操作（规范里写明了 oldValue === value 时什么也不做），
  // 所以拿一个每次都变的哨兵键把整块存储弄脏，引擎才会把积压的写入刷下去。
  const flushStorage = () => {
    flushMirror()
    try {
      setItem.call(window.localStorage, "yourtj-nav-touch", String(Date.now()))
    } catch {
      // 配额满或者隐私模式，忽略。
    }
  }

  window.addEventListener("pagehide", flushStorage)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushStorage()
  })
}
