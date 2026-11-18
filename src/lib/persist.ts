/**
 * 走之前把设置落一次盘。
 *
 * localStorage 的写入是引擎里批量异步刷盘的，进程被杀的时候最后一段会丢。页面进后台
 * （`visibilitychange` → hidden）和真正卸载（`pagehide`）是 JS 能拿到的最后两个时机，
 * 在这里写一次，能把「刚改完就切走」那一段的风险压下去。
 *
 * 这里只做这一件事。曾经想过把设置再镜像一份进 cookie 扛「浏览器清站点数据」，
 * 量完之后放弃了：
 *
 *   - 一个 1.3 KB 的偏好 cookie，实测一次首屏会跟着 17 个同源请求走一遍（`/brand/*.png`、
 *     `/cat.webp` 都算），合计 22 KB —— 为了几个字节的偏好，每次访问多传 22 KB
 *   - cookie 会随每个请求发给服务器，等于把用户的外观设置变成服务端日志里的一行
 *   - Safari 的 ITP 对脚本写入的存储（含 `document.cookie`）有 7 天上限，镜像并不能
 *     比 localStorage 活得更久
 *   - 而它想救的那个场景——无痕模式——cookie 同样是会话级的，根本救不了
 *
 * 结论：这不是一个值得付代价的兜底。真的被清空了（无痕、或者浏览器退出时清站点数据），
 * 网页侧没有任何办法，那是浏览器的决定，不该由页面偷偷绕过。
 */

const TOUCH_KEY = "yourtj-nav-touch"

/** 一秒内只写一次：来回切标签页不值得反复弄脏存储。 */
const MIN_INTERVAL = 1000

export function installPersistence() {
  if (typeof window === "undefined") return

  const storage = window.localStorage
  const setItem = Storage.prototype.setItem
  let last = 0

  const flush = () => {
    const now = Date.now()
    if (now - last < MIN_INTERVAL) return
    last = now
    try {
      /*
        不能「把当前值重写一遍」：规范里 oldValue === value 时 setItem 什么也不做，
        重写同值是空操作，根本不会弄脏存储。换一个每次都变的值才行。
      */
      setItem.call(storage, TOUCH_KEY, String(now))
    } catch {
      // 配额满或者隐私模式，忽略。
    }
  }

  window.addEventListener("pagehide", flush)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush()
  })
}
