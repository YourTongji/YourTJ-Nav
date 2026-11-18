# 架构与数据流

纯静态单页应用，没有后端。所有状态要么在 React 里，要么在浏览器存储里。

## 分层

```text
data/        出厂数据（站点、引擎、壁纸源、材质），纯常量，没有副作用
lib/         存储层：localStorage 和 IndexedDB 的读写与校验
hooks/       把存储层包成 React 状态，对外只暴露意图明确的方法
components/  界面。只有这里碰 DOM，data 和 lib 不认识 React
```

一条硬规则：组件不直接碰 `localStorage`。键名、解析和容错都在 `lib/*-store.ts`，
组件只调 hook。

## 出厂数据与用户改动

站点分成两份：

- `src/data/sites.ts` 是出厂清单，带真实图标，随代码发布。
- `yourtj-nav-sites` 存用户改动，只记差异：新增的站点、隐藏的 id、覆盖的字段、移到别处的出厂站点、文件夹、顺序。

渲染时依次合并：出厂清单，去掉隐藏项，应用覆盖，按 `moved` 归到新分类，追加新增，按 order 排序。

出厂站点换分类时只记 `moved[id] = 目标文件夹`，条目本身还在代码里。移回原分类就删掉这条记录；
目标文件夹被删时，站点回到原分类。自建站点直接改自己的 `folder`。

这样分的原因是，出厂站点换图标或改地址能直接推给所有人，用户自己的增删不会被覆盖。

## 存储

| 键 | 位置 | 内容 |
|---|---|---|
| `yourtj-nav-theme` | localStorage | `light` / `dark` / `system` |
| `yourtj-nav-material` | localStorage | `frosted` / `acrylic` / `liquid` |
| `yourtj-nav-appearance` | localStorage | 遮罩、模糊 |
| `yourtj-nav-wallpaper` | localStorage | 壁纸来源 |
| `yourtj-nav-wallpaper-last` | localStorage | 每个来源上次成功的地址和时间戳，6 小时有效 |
| `yourtj-nav-wallpaper-custom` | localStorage | 当前选中的自定义壁纸 id |
| `yourtj-nav-sites` | localStorage | 站点差异 |
| `yourtj-nav-pins` | localStorage | 置顶的站点 id 顺序 |
| `yourtj-nav-recent` | localStorage | 最近访问，最多 12 条 |
| `yourtj-nav-folder` | localStorage | 当前分类 |
| `yourtj-nav-view` | localStorage | `full` / `minimal`（简洁模式） |
| `yourtj-nav-icon-miss` | localStorage | 加载失败的图标地址和时间，三天后重试 |
| `yourtj-nav-engine` | localStorage | 搜索引擎 |
| `yourtj-nav-search-history` | localStorage | 搜索记录，最多 20 条 |
| `yourtj-nav-search-width` | localStorage | 搜索框宽度 |
| `yourtj-nav-quote` | localStorage | 一言开关 |
| `yourtj-nav-cat` | localStorage | 搜索栏小猫开关 |
| `yourtj-nav-cat-spot` | localStorage | 小猫在搜索框上沿的位置，0 到 1 |
| `yourtj-nav-clock` | localStorage | 时钟整组设置，一个 JSON |
| `yourtj-nav-touch` | localStorage | 落盘哨兵，每次进后台换一个时间戳 |
| `tj-nav` / `wallpaper` | IndexedDB | 自定义壁纸的 Blob 列表 |

壁纸放 IndexedDB，是因为一张照片有几 MB，localStorage 配额放不下，主线程编码还会卡。
偏好放 localStorage，是因为它小、同步可读，首屏内联脚本能在 React 起来之前读到。

### 落盘

localStorage 是批量异步刷盘的，进程被杀会丢最后一段。`lib/persist.ts` 在
`pagehide` 和 `visibilitychange:hidden` 时写一个每次都变的哨兵键（`yourtj-nav-touch`），
把存储弄脏，逼引擎刷一次。

之所以是哨兵键而不是「把当前值重写一遍」：规范里 `oldValue === value` 时 `setItem`
什么也不做，重写同值是空操作。

**没有做 cookie 镜像。** 试过，量完之后撤了：一个 1.3 KB 的偏好 cookie 会跟着一次首屏的
17 个同源请求走一遍（`/brand/*.png`、`/cat.webp` 都算），合计 22 KB；而且 cookie 随每个
请求发给服务器，等于把用户的外观设置写进服务端日志。Safari 的 ITP 对脚本写入的存储
（含 `document.cookie`）有 7 天上限，也活不过 localStorage。它想救的无痕模式，
cookie 同样是会话级的。

浏览器真要清（无痕、或者退出时清站点数据），网页侧没有办法，那是浏览器的决定。

## 首屏

`index.html` 里有一段内联脚本，在 React 挂载之前读 `yourtj-nav-theme`、`yourtj-nav-material`
和壁纸缓存，把 `.dark`、`data-material`、`--boot-wall` 直接写到 `<html>` 上。

不这么做的话，刷新时会先按默认主题画一帧再跳变，壁纸也会闪一下黑。

## 网络

页面自身只有两件事会发请求：一言和壁纸。两者都有超时和本地兜底。

```text
壁纸：缓存 6 小时 → JSON 端点 3 秒 → 直链候选预解码 5 秒 → 本地渐变
一言：接口 → 三条本地句子
```

此外 `index.html` 里引了自建的 Umami 统计脚本（`umi.yourtj.de`）。它用 `defer` 加载，
不参与首屏渲染，被拦截或服务挂掉时页面照常可用。

## 构建

Vite 加 TypeScript，产物是 `dist/` 里的静态文件。

`base` 由 `VITE_BASE` 决定，默认 `/`。部署到 GitHub Pages 的 project page 时，
工作流传入 `/YourTJ-Nav/` 这类前缀。

代码里引用 `public/` 资源时，`src/data/*` 用 `asset()`，组件里用 `import.meta.env.BASE_URL`，
不要写死根路径。
