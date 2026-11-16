# 设计系统

令牌都定义在 `src/index.css`。改颜色、材质或圆角，只改这一个文件。

## 颜色

用 OKLCH 表达，两套主题各一组。

| 令牌 | 用途 |
|---|---|
| `--background` | 页面底色，也是玻璃面的调色基 |
| `--ink` / `--ink-muted` | 文字只有两级。11 像素的字放在照片上，第三级灰撑不住 4.5:1 |
| `--hairline` / `--hairline-strong` | 1 像素描边，两级 |
| `--brand` / `--brand-ink` | 强调色，以及它上面的前景色 |
| `--scrim-from` / `--scrim-to` / `--veil` | 壁纸上的固定渐变，保证任何照片上文字都可读 |
| `--overlay-ink` | 用户遮罩滑块的颜色，跟着主题走 |

`--overlay-ink` 在浅色下接近白，深色下接近黑。往上拉时，效果是把照片推向当前主题的背景色。
反过来做（浅色压黑、深色提亮）会让正文对比度越拉越差。

## 材质

`<html data-material="...">` 一个属性，换掉所有玻璃面：搜索框、导航、chips、最近访问卡片、面板和菜单。

| 材质 | `backdrop-filter` | 面板不透明度 | 特征 |
|---|---|---|---|
| 磨砂 | `blur(24) saturate(165%) contrast(.76) brightness(1.06)` | 52% | 顶部落一道光 |
| 亚克力 | `blur(30) saturate(118%) contrast(.88) brightness(1.02)` | 80% | 加噪点，更实 |
| 液态玻璃 | `blur(42) saturate(200%) contrast(.70) brightness(1.10)` | 24% | 左上角高光，四边内反光 |

关键在 `contrast()`。它先把背景压平再上色，玻璃才有柔的质感。只堆模糊和不透明度，
出来的是灰塑料板。深色主题另有一套，写在 `[data-material].dark`，亮度收到 0.76 到 0.84。

令牌有 `--mat-filter`、`--mat-surface`、`--mat-chip`、`--mat-rim`、`--mat-panel`、
`--mat-card-*`、`--mat-sheen`、`--mat-noise`。使用方是 `.glass-shell`、`.mat-panel`、
`.nav-chip`、选中的文件夹标签、`.recent-mat`、`.recent-panel`。

`backdrop-filter` 只写标准属性，不要手写 `-webkit-` 前缀。构建用的 LightningCSS 会自己补前缀；
手写两份时它会把标准属性去掉，只留前缀版，结果在线上整片玻璃变成 `none`。

这些令牌必须写在 `@layer components` 外面。`--glass` 和 `--glass-hover` 在 `:root` 和 `.dark`
里是无层级声明的，无层级规则永远赢过有层级的，写在 layer 里的覆盖不会生效。

## 圆角与间距

三档同心：24、18、16，分别对应外层板、内层面板和小组件。

同心是硬约束：内层半径等于外层半径减去内边距。不这么做，两块圆角会互相顶出来。

## 动效

统一缓动 `--ease-spring: cubic-bezier(0.32, 0.72, 0, 1)`，时长 150 到 300 毫秒。

会改变布局的开关一律走 `<Collapse>`，用 `grid-template-rows` 从 0fr 过渡到 1fr，
不要靠挂载和卸载。开了 `prefers-reduced-motion` 时，猫不跳，卡片不倾斜，扫光不动。

## 字体

| 用途 | 字体 | 文件 |
|---|---|---|
| 正文与界面 | Geist Variable | `public/fonts/Geist-Variable.woff2` |
| 一言 | 霞鹜文楷 | `public/fonts/wenkai/`，97 个 unicode-range 分片 |
| 时钟 | Instrument Serif | `public/fonts/InstrumentSerif-Regular.woff2` |

字体一律本地打包，不走 CDN。国内加载 Google Fonts 会卡在首屏，打包进仓库就没有这个问题。

## 可访问性

- 文字对最坏背景（高频测试图加遮罩 0）实测都在 4.5:1 以上，多数超过 7:1。
- 图标等非文本元素要求 3:1。达不到时改结构，比如深色模式下把主体提亮，不加描边或辉光。
- 焦点态一律可见。搜索框用边框变化，其余用 `focus-visible:outline` 画 2 像素品牌色。
- 抽屉、对话框和菜单都用 Radix 原语，焦点陷阱和 `Esc` 由它们负责。
