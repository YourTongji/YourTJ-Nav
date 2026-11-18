import { useEffect, type RefObject } from "react"

/**
 * 置顶栏的 Dock 缩放。
 *
 * 鼠标横着划过时，离指针近的那几个放大、远的保持原样，整排还会被撑开一点——
 * 和 macOS 程序坞是同一套数学：影响按距离做高斯衰减，被撑开的宽度从中间往两边摊。
 *
 * 顺滑的关键不在公式，在于每一帧别碰布局：
 *   - 位置全部预先量好缓存起来（图标中心、整排原点），指针进来只做减法。
 *   - 以前每帧都在循环里读 `offsetLeft`，而上一帧刚写过样式——读写交替会逼浏览器
 *     每帧同步重排一次，指针一快就掉帧。
 *   - 值没变的图标不重写样式，减少无效的样式失效。
 *
 * 另外两个细节：
 *   - 只放大图标，不放大下面的文字。文字跟着放大到 1.4 倍就没法看了。
 *   - 拖拽排序时不装：指针要横穿整排，放大只会让落点一直漂。
 */

/** 影响半径（像素）。86 大约是「左右各一两个图标」的手感。 */
const SIGMA = 86

/** 最大放大倍数减一。1.38 倍：再大就会顶到上面的搜索框。 */
const BOOST = 0.38

/** 图标的布局宽度，撑开的量按它算。 */
const PLATE = 44

/** 指针离开之后，回位动画走多久。 */
const SETTLE_MS = 240

/** 变化小于这个值就不写样式了，省掉一次样式失效。 */
const EPSILON = 0.0005

type Item = { node: HTMLElement; face: HTMLElement; center: number; scale: number; shift: number }

export function useDockMagnify(listRef: RefObject<HTMLUListElement | null>, enabled: boolean) {
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const scroller = list.parentElement
    let items: Item[] = []

    const reset = () => {
      for (const item of items) {
        item.node.style.transform = ""
        item.face.style.transform = ""
        item.scale = 1
        item.shift = 0
      }
    }

    // 触摸没有「划过」，减少动效的人也不该被动。两种情况都直接不装。
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const still = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!enabled || !fine.matches || still.matches) {
      for (const node of list.querySelectorAll<HTMLElement>("[data-dock-item]")) {
        node.style.transform = ""
        node.querySelector<HTMLElement>(".dock-scale")?.style.removeProperty("transform")
      }
      return
    }

    /*
      量一次就够：图标在布局里的位置不会因为缩放而改变（transform 不参与布局），
      只有滚动和尺寸变化会让它动，那两种情况各挂一个监听重新量。
    */
    const measure = () => {
      const left = list.getBoundingClientRect().left
      items = Array.from(list.querySelectorAll<HTMLElement>("[data-dock-item]")).flatMap((node) => {
        const face = node.querySelector<HTMLElement>(".dock-scale")
        if (!face) return []
        return [{
          node,
          face,
          center: left + node.offsetLeft + node.offsetWidth / 2,
          /*
            用 -1 当「还不知道」：重新量过之后缓存和 DOM 里写的值可能对不上
            （增删置顶时节点还在、行内样式还在），拿 -1 保证下一帧一定重写一遍。
          */
          scale: -1,
          shift: -1,
        }]
      })
    }

    let frame = 0
    let pointerX: number | null = null
    let settle = 0

    const apply = () => {
      frame = 0
      if (pointerX === null) return

      const scales: number[] = []
      const growth: number[] = []
      let total = 0

      for (const item of items) {
        const distance = pointerX - item.center
        const pull = Math.exp(-(distance * distance) / (SIGMA * SIGMA))
        const scale = 1 + BOOST * pull
        scales.push(scale)
        const grow = (scale - 1) * PLATE
        growth.push(grow)
        total += grow
      }

      const offset = -total / 2
      let walked = 0

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]
        const shift = walked + growth[index] / 2 + offset
        walked += growth[index]

        /*
          直接写 transform，不走自定义属性。自定义属性会被继承，改一个 li 会让它整棵子树
          重新算样式；这里只改这两个元素自己。实测样式重算的时间砍了一半。
        */
        if (Math.abs(item.scale - scales[index]) > EPSILON) {
          item.face.style.transform = `scale(${scales[index].toFixed(4)})`
          item.scale = scales[index]
        }
        if (Math.abs(item.shift - shift) > EPSILON) {
          item.node.style.transform = `translateX(${shift.toFixed(2)}px)`
          item.shift = shift
        }
      }
    }

    const onMove = (event: PointerEvent) => {
      // 放大期间不渐隐：边缘那颗图标正在被看，压暗它没有道理。
      scroller?.setAttribute("data-dock-active", "true")
      if (settle) {
        window.clearTimeout(settle)
        settle = 0
        scroller?.removeAttribute("data-dock-settling")
      }
      pointerX = event.clientX
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onLeave = () => {
      pointerX = null
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      scroller?.removeAttribute("data-dock-active")
      // 回位的过渡挂在滚动容器上，标记就得打在同一层，否则选择器匹配不到。
      scroller?.setAttribute("data-dock-settling", "true")
      for (const item of items) {
        item.node.style.transform = ""
        item.face.style.transform = ""
        item.scale = 1
        item.shift = 0
      }
      settle = window.setTimeout(() => {
        settle = 0
        scroller?.removeAttribute("data-dock-settling")
      }, SETTLE_MS)
    }

    measure()

    /*
      `pointerrawupdate` 比 `pointermove` 更早拿到输入，Chrome 系能少压一帧；
      不支持的浏览器没有这个事件名，自动退回 pointermove。每帧仍然只算一次。
    */
    const raw = "onpointerrawupdate" in window ? "pointerrawupdate" : "pointermove"
    list.addEventListener(raw, onMove as EventListener, { passive: true })
    list.addEventListener("pointerleave", onLeave, { passive: true })

    const observer = new ResizeObserver(measure)
    observer.observe(list)
    if (scroller) observer.observe(scroller)

    // 滚动会改变图标在视口里的位置，重新量；每帧最多一次。
    let scrollFrame = 0
    const onScroll = () => {
      if (scrollFrame) return
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0
        measure()
      })
    }
    scroller?.addEventListener("scroll", onScroll, { passive: true })

    const mutations = new MutationObserver(measure)
    mutations.observe(list, { childList: true })

    return () => {
      list.removeEventListener(raw, onMove as EventListener)
      list.removeEventListener("pointerleave", onLeave)
      scroller?.removeEventListener("scroll", onScroll)
      observer.disconnect()
      mutations.disconnect()
      if (frame) cancelAnimationFrame(frame)
      if (scrollFrame) cancelAnimationFrame(scrollFrame)
      if (settle) window.clearTimeout(settle)
      scroller?.removeAttribute("data-dock-settling")
      scroller?.removeAttribute("data-dock-active")
      reset()
    }
  }, [listRef, enabled])
}
