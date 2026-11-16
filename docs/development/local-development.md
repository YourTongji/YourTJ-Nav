# 本地开发

## 依赖

| 工具 | 版本 | 用途 |
|---|---|---|
| Node.js | 22 或更高 | 构建与开发服务器 |
| npm | 随 Node 安装 | 装依赖，仓库提交了 `package-lock.json` |

没有其他系统依赖。字体、图标和动画素材都在仓库里，不需要联网下载。

## 启动

```bash
npm ci            # 按 lockfile 安装，不要用 npm install 改锁文件
npm run dev       # http://127.0.0.1:5173
```

开发服务器固定监听 `127.0.0.1`。要在局域网预览，改 `vite.config.ts` 里的 `server.host`。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器，带热更新 |
| `npm run build` | `tsc -b` 加 `vite build`，产物在 `dist/` |
| `npm run preview` | 本地起静态服务，预览 `dist/` |
| `npx tsc -b` | 只做类型检查 |

## 构建到子路径

```bash
VITE_BASE=/YourTJ-Nav/ npm run build
```

`base` 会同时影响 HTML 里的资源地址、CSS 里的 `url()` 和 `import.meta.env.BASE_URL`。

新增引用 `public/` 资源时，`src/data/*` 里用 `asset("/brand/x.png")`，
组件里用 `` `${import.meta.env.BASE_URL}cat.webp` ``，不要写 `"/brand/x.png"`。

## 改哪里

| 想改 | 去 |
|---|---|
| 加或改站点、分类 | `src/data/sites.ts` |
| 搜索引擎 | `src/data/engines.ts` |
| 壁纸来源 | `src/data/wallpapers.ts` |
| 材质名称与说明 | `src/data/materials.ts` |
| 颜色、材质、字体、动效 | `src/index.css` |
| 存储键与校验 | `src/lib/*-store.ts` |

## 常见问题

**样式改了没生效。** Vite 的模块缓存偶尔会滞后，用脚本批量改 CSS 之后更容易遇到。
重启 `npm run dev`。

**面板或菜单一打开，页面横向抖一下。** 说明某个 Radix 组件用了 `modal` 默认值。
modal 会锁 body 滚动，滚动条消失后页面变宽，固定定位的壁纸跟着重新 `cover`。
所有菜单都要写 `modal={false}`，`html` 上的 `scrollbar-gutter: stable` 是兜底。

**从菜单里打开的面板闪一下就关。** 菜单关闭时会把焦点还给页面，面板在下一帧读到
“焦点跑到外面”就自己关了。守卫要写在知道 `open` 的组件里，按 `open` 变化重置。
写在 `SheetContent` 里没用，那个组件的函数体在 App 首次渲染时就跑过一次。
