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
| `tj-nav` / `wallpaper` | IndexedDB | 自定义壁纸的 Blob 列表 |

壁纸放 IndexedDB，是因为一张照片有几 MB，localStorage 配额放不下，主线程编码还会卡。
偏好放 localStorage，是因为它小、同步可读，首屏内联脚本能在 React 起来之前读到。

### 镜像

手机浏览器把标签页杀掉之后，localStorage 有可能整片回到默认（夸克就会）。所以
`lib/persist.ts` 在启动时把设置镜像一份进 `ytj-prefs` cookie：

- 读：localStorage 里缺的键，从 cookie 补回来
- 写：包一层 `Storage.prototype.setItem`，`yourtj-nav-*` 的写入同步进 cookie，120ms 防抖
- 走：`pagehide` / `visibilitychange:hidden` 时立刻落 cookie，并写一个每次都变的哨兵键
  （`yourtj-nav-touch`），把整块存储弄脏逼引擎落盘——同一个值重写是空操作，规范里写死的

自定义壁纸、自定义站点、最近访问、搜索历史这些可能很大的键不镜像，一条 4KB 的 cookie
装不下；单条超过 512 字节的也会跳过。cookie 总长压在 3KB 以内。

拦 `removeItem` 是为了让删除也同步（清一条最近访问，镜像里也要没）；**不拦 `clear()`**——
浏览器清站点数据走的是外部流程，根本不会调到 JS，能调到 `clear()` 的只有我们自己，
而这个项目没有「全部清空」的入口，拦下来只会把 cookie 里那份一起抹掉。

如果哪天确认夸克连 cookie 一起清（无痕模式），那就只剩把配置编码进 URL 一条路了。

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
